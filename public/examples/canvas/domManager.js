export default {
    container: null,
    objectManager: null,

    create(context) {
        const objectManager = context['objectManager']
        if (!objectManager) {
            console.error(
                'domManager requires objectManager in context. Make sure that objectManager is added before domManager in the blocks list.'
            )
            return null
        }
        this.objectManager = objectManager

        objectManager.registerType('LAYER', (attrs, ready, error) => {
            const node = $(document.createElement('div')).css({
                position: 'absolute',
                left: '0px',
                top: '0px',
                display: 'block',
                opacity: '1',
            })

            if (attrs && attrs.text != null) {
                node.text(String(attrs.text))
            }

            if (attrs && attrs.className) {
                const className = this._sanitizeClassNames(attrs.className)
                if (className) {
                    node.addClass(className)
                }
            }

            let parentNode = this._getContainer()
            const parentRef = attrs && attrs.parent && typeof attrs.parent === 'object' ? attrs.parent : null
            const parentId =
                parentRef && Number.isInteger(parentRef.id)
                    ? parentRef.id
                    : attrs && Number.isInteger(attrs.parentId)
                      ? attrs.parentId
                      : null
            if (Number.isInteger(parentId)) {
                const parent = this.objectManager
                    ? this.objectManager.get(parentRef || { type: 'LAYER', id: parentId }, 'LAYER')
                    : null
                if (!parent || !parent.node || !parent.node.jquery) {
                    const message = 'Invalid parent Layer id: ' + String(parentId)
                    console.error('PLAyRUN: ' + message)
                    if (error) {
                        error({ message })
                    }
                    return null
                }
                parentNode = parent.node
            }

            parentNode.append(node)
            ready()

            return {
                node,
                onMessage: (cmd, data) => this.executeCommand(node, cmd, data),
            }
        })

        return {}
    },

    afterStop() {
        if (this.container) {
            this.container.remove()
            this.container = null
        }
    },

    _getContainer() {
        if (this.container && this.container.length > 0) {
            return this.container
        }

        if (!this.canvasElement) {
            throw new Error('domManager requires canvasElement')
        }

        if (this.canvasElement.css('position') === 'static') {
            this.canvasElement.css('position', 'relative')
        }

        this.container = $(document.createElement('div')).css({
            position: 'absolute',
            left: '0px',
            top: '0px',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            overflow: 'hidden',
        })

        this.canvasElement.append(this.container)
        return this.container
    },

    executeCommand(node, cmd, data) {
        const payload = data && typeof data === 'object' ? data : {}
        switch (cmd) {
            case 'setPosition': {
                const position = payload.position && typeof payload.position === 'object' ? payload.position : payload
                const x = this._numberOr(position.x, 0)
                const y = this._numberOr(position.y, 0)
                node.css({ left: x + 'px', top: y + 'px' })
                break
            }
            case 'setSize': {
                const size = payload.size && typeof payload.size === 'object' ? payload.size : payload
                if (this._isFiniteNumber(size.x)) {
                    node.css('width', size.x + 'px')
                }
                if (this._isFiniteNumber(size.y)) {
                    node.css('height', size.y + 'px')
                }
                break
            }
            case 'setVisible': {
                const visible = typeof payload.visible === 'boolean' ? payload.visible : true
                node.css('display', visible ? 'block' : 'none')
                break
            }
            case 'setOpacity': {
                const opacity = this._clamp(this._numberOr(payload.opacity, 1), 0, 1)
                node.css('opacity', String(opacity))
                break
            }
            case 'setBackgroundColor': {
                node.css('background-image', 'none')
                node.css('background-color', this._toCssColor(payload.color))
                break
            }
            case 'setBackgroundImage': {
                const imageRef = payload.image
                const image =
                    imageRef && typeof imageRef.id === 'number' && this.objectManager
                        ? this.objectManager.get(imageRef.id)
                        : null
                const src = image && image.src ? image.src : null
                const safeSrc = this._normalizeAllowedImageSource(src)
                if (safeSrc) {
                    node.css('background-color', 'transparent')
                    node.css('background-image', 'url("' + safeSrc.replace(/"/g, '\\"') + '")')
                    node.css('background-repeat', 'no-repeat')
                    node.css('background-position', 'center center')
                    node.css('background-size', 'cover')
                } else {
                    node.css('background-image', 'none')
                }
                break
            }
            case 'setBorderWidth': {
                node.data('borderWidth', Math.max(0, this._intOr(payload.borderWidth, 0)))
                this._applyBorder(node)
                break
            }
            case 'setBorderColor': {
                node.data('borderColor', this._toCssColor(payload.borderColor))
                this._applyBorder(node)
                break
            }
            case 'setBorderType': {
                node.data('borderType', this._toBorderType(payload.borderType))
                this._applyBorder(node)
                break
            }
            case 'setShadow': {
                const offsetX = this._intOr(payload.offsetX, 0)
                const offsetY = this._intOr(payload.offsetY, 0)
                const blurRadius = Math.max(0, this._intOr(payload.blurRadius, 0))
                const spreadRadius = this._intOr(payload.spreadRadius, 0)
                const color = this._toCssColor(payload.color)
                node.css(
                    'box-shadow',
                    offsetX +
                        'px ' +
                        offsetY +
                        'px ' +
                        blurRadius +
                        'px ' +
                        spreadRadius +
                        'px ' +
                        color
                )
                break
            }
            case 'setRoundness': {
                const roundness = Math.max(0, this._numberOr(payload.roundness, 0))
                node.css('border-radius', roundness + 'px')
                break
            }
            case 'setZIndex': {
                const zIndex = this._intOr(payload.zIndex, 0)
                node.css('z-index', String(zIndex))
                break
            }
            case 'setText': {
                node.text(payload.text != null ? String(payload.text) : '')
                break
            }
            case 'setMarkdown': {
                this._renderStrictMarkdown(node, payload.markdown)
                break
            }
            case 'setTextAlign': {
                const alignMap = { LEFT: 'left', CENTER: 'center', RIGHT: 'right', JUSTIFY: 'justify' }
                const align = alignMap[String(payload.align).toUpperCase()] || 'left'
                node.css('text-align', align)
                break
            }
            case 'setTextVerticalAlign': {
                const valignMap = { TOP: 'flex-start', MIDDLE: 'center', BOTTOM: 'flex-end' }
                const valign = valignMap[String(payload.align).toUpperCase()] || 'flex-start'
                node.css({ display: 'flex', 'flex-direction': 'column', 'justify-content': valign })
                break
            }
            case 'setTextColor': {
                node.css('color', this._toCssColor(payload.color))
                break
            }
            case 'setFontSize': {
                const size = Math.max(1, Math.min(500, this._intOr(payload.size, 16)))
                node.css('font-size', size + 'px')
                break
            }
            case 'setFontFamily': {
                const familyMap = {
                    SANS_SERIF: 'sans-serif',
                    SERIF: 'serif',
                    MONOSPACE: 'monospace',
                    ARIAL: 'Arial, sans-serif',
                    GEORGIA: 'Georgia, serif',
                    TIMES_NEW_ROMAN: '"Times New Roman", Times, serif',
                    COURIER_NEW: '"Courier New", Courier, monospace',
                    VERDANA: 'Verdana, Geneva, sans-serif',
                    TREBUCHET_MS: '"Trebuchet MS", Helvetica, sans-serif',
                    IMPACT: 'Impact, Charcoal, sans-serif',
                    ROBOTO: 'Roboto, sans-serif',
                    HELVETICA: '"Helvetica Neue", Helvetica, Arial, sans-serif',
                }
                const family = familyMap[String(payload.family).toUpperCase()]
                if (family) {
                    node.css('font-family', family)
                }
                break
            }
            case 'setFontWeight': {
                const weightMap = {
                    THIN: '100',
                    LIGHT: '300',
                    NORMAL: 'normal',
                    MEDIUM: '500',
                    BOLD: 'bold',
                    EXTRA_BOLD: '800',
                }
                const weight = weightMap[String(payload.weight).toUpperCase()] || 'normal'
                node.css('font-weight', weight)
                break
            }
            case 'setTextShadow': {
                const offsetX = this._intOr(payload.offsetX, 0)
                const offsetY = this._intOr(payload.offsetY, 0)
                const blurRadius = Math.max(0, this._intOr(payload.blurRadius, 0))
                const color = this._toCssColor(payload.color)
                node.css('text-shadow', offsetX + 'px ' + offsetY + 'px ' + blurRadius + 'px ' + color)
                break
            }
        }
    },

    _renderStrictMarkdown(node, markdown) {
        const host = node && node[0]
        if (!host) {
            return
        }

        const source = typeof markdown === 'string' ? markdown.replace(/\r\n?/g, '\n') : ''
        host.textContent = ''

        if (!source) {
            return
        }

        const lines = source.split('\n')
        let listEl = null
        let listType = null

        const closeList = () => {
            listEl = null
            listType = null
        }

        const appendParagraph = (text) => {
            const p = document.createElement('p')
            p.appendChild(this._renderInlineMarkdown(text))
            host.appendChild(p)
        }

        for (let i = 0; i < lines.length; i++) {
            const rawLine = lines[i]
            const line = rawLine.trim()

            if (!line) {
                closeList()
                continue
            }

            const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line)
            if (headingMatch) {
                closeList()
                const level = headingMatch[1].length
                const el = document.createElement('h' + level)
                el.appendChild(this._renderInlineMarkdown(headingMatch[2]))
                host.appendChild(el)
                continue
            }

            const ulMatch = /^[-*+]\s+(.*)$/.exec(line)
            if (ulMatch) {
                if (listType !== 'ul') {
                    closeList()
                    listType = 'ul'
                    listEl = document.createElement('ul')
                    host.appendChild(listEl)
                }
                const li = document.createElement('li')
                li.appendChild(this._renderInlineMarkdown(ulMatch[1]))
                listEl.appendChild(li)
                continue
            }

            const olMatch = /^\d+\.\s+(.*)$/.exec(line)
            if (olMatch) {
                if (listType !== 'ol') {
                    closeList()
                    listType = 'ol'
                    listEl = document.createElement('ol')
                    host.appendChild(listEl)
                }
                const li = document.createElement('li')
                li.appendChild(this._renderInlineMarkdown(olMatch[1]))
                listEl.appendChild(li)
                continue
            }

            closeList()
            appendParagraph(rawLine)
        }
    },

    _renderInlineMarkdown(text) {
        const fragment = document.createDocumentFragment()
        const input = String(text || '')
        const tokenRegex = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g
        let last = 0
        let match

        while ((match = tokenRegex.exec(input)) !== null) {
            if (match.index > last) {
                fragment.appendChild(document.createTextNode(input.slice(last, match.index)))
            }

            const token = match[0]
            if (token.startsWith('**') && token.endsWith('**')) {
                const strong = document.createElement('strong')
                strong.textContent = token.slice(2, -2)
                fragment.appendChild(strong)
            } else if (token.startsWith('*') && token.endsWith('*')) {
                const em = document.createElement('em')
                em.textContent = token.slice(1, -1)
                fragment.appendChild(em)
            } else if (token.startsWith('`') && token.endsWith('`')) {
                const code = document.createElement('code')
                code.textContent = token.slice(1, -1)
                fragment.appendChild(code)
            } else {
                fragment.appendChild(document.createTextNode(token))
            }

            last = tokenRegex.lastIndex
        }

        if (last < input.length) {
            fragment.appendChild(document.createTextNode(input.slice(last)))
        }

        return fragment
    },

    _sanitizeClassNames(value) {
        const text = String(value || '').trim()
        if (!text) {
            return ''
        }
        const tokens = text
            .split(/\s+/)
            .map((token) => token.trim())
            .filter((token) => /^[A-Za-z_][A-Za-z0-9_-]{0,63}$/.test(token))
        return tokens.join(' ')
    },

    _isFiniteNumber(value) {
        return typeof value === 'number' && Number.isFinite(value)
    },

    _numberOr(value, fallback) {
        return this._isFiniteNumber(value) ? value : fallback
    },

    _intOr(value, fallback) {
        if (!this._isFiniteNumber(value)) {
            return fallback
        }
        return value < 0 ? Math.ceil(value) : Math.floor(value)
    },

    _clamp(value, min, max) {
        return Math.min(max, Math.max(min, value))
    },

    _applyBorder(node) {
        const width = node.data('borderWidth')
        const color = node.data('borderColor') || 'rgba(0,0,0,1)'
        const type = node.data('borderType') || 'solid'
        const w = typeof width === 'number' ? width : 0

        if (w <= 0 || type === 'none') {
            node.css('border', 'none')
            return
        }

        node.css('border', w + 'px ' + type + ' ' + color)
    },

    _toBorderType(value) {
        const raw = String(value || 'solid').toLowerCase()
        if (raw === 'none' || raw === 'solid' || raw === 'dotted' || raw === 'dashed' || raw === 'double') {
            return raw
        }
        return 'solid'
    },

    _toCssColor(value) {
        if (Array.isArray(value)) {
            const r = this._clamp(this._intOr(value[0], 0), 0, 255)
            const g = this._clamp(this._intOr(value[1], 0), 0, 255)
            const b = this._clamp(this._intOr(value[2], 0), 0, 255)
            const a = this._clamp(this._numberOr(value[3], 1), 0, 1)
            return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'
        }

        if (value && typeof value === 'object') {
            if (
                Number.isFinite(value.r) &&
                Number.isFinite(value.g) &&
                Number.isFinite(value.b)
            ) {
                const r = this._clamp(this._intOr(value.r, 0), 0, 255)
                const g = this._clamp(this._intOr(value.g, 0), 0, 255)
                const b = this._clamp(this._intOr(value.b, 0), 0, 255)
                const a = this._clamp(this._numberOr(value.a, 1), 0, 1)
                return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'
            }

            if (
                Number.isFinite(value.h) &&
                Number.isFinite(value.s) &&
                Number.isFinite(value.l)
            ) {
                const hue = ((value.h % 360) + 360) % 360
                const sat = this._clamp(this._numberOr(value.s, 0), 0, 1)
                const light = this._clamp(this._numberOr(value.l, 0), 0, 1)
                const a = this._clamp(this._numberOr(value.a, 1), 0, 1)
                return (
                    'hsla(' +
                    hue +
                    ',' +
                    sat * 100 +
                    '%,' +
                    light * 100 +
                    '%,' +
                    a +
                    ')'
                )
            }

            if (
                Number.isFinite(value.h) &&
                Number.isFinite(value.s) &&
                Number.isFinite(value.v)
            ) {
                const rgba = this._hsvToRgba(value.h, value.s, value.v, value.a)
                return 'rgba(' + rgba.r + ',' + rgba.g + ',' + rgba.b + ',' + rgba.a + ')'
            }
        }

        return 'rgba(0,0,0,1)'
    },

    _normalizeAllowedImageSource(src) {
        if (typeof src !== 'string') {
            return null
        }

        const trimmed = src.trim()
        if (!trimmed) {
            return null
        }

        if (trimmed.startsWith('//')) {
            return null
        }

        const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(trimmed)
        if (!schemeMatch) {
            return trimmed
        }

        const scheme = schemeMatch[1].toLowerCase()
        if (scheme !== 'http' && scheme !== 'https') {
            return null
        }

        try {
            const url = new URL(trimmed, window.location.href)
            const protocol = url.protocol.toLowerCase()
            if ((protocol === 'http:' || protocol === 'https:') && url.origin === window.location.origin) {
                return url.href
            }
        } catch (_e) {
            return null
        }

        return null
    },

    _hsvToRgba(h, s, v, a) {
        const hue = ((h % 360) + 360) % 360
        const sat = Math.max(0, Math.min(1, s))
        const val = Math.max(0, Math.min(1, v))
        const alpha = Number.isFinite(a) ? Math.max(0, Math.min(1, a)) : 1

        const c = val * sat
        const hh = hue / 60
        const x = c * (1 - Math.abs((hh % 2) - 1))
        const m = val - c

        let rp = 0
        let gp = 0
        let bp = 0

        if (hh < 1) {
            rp = c
            gp = x
        } else if (hh < 2) {
            rp = x
            gp = c
        } else if (hh < 3) {
            gp = c
            bp = x
        } else if (hh < 4) {
            gp = x
            bp = c
        } else if (hh < 5) {
            rp = x
            bp = c
        } else {
            rp = c
            bp = x
        }

        return {
            r: Math.round((rp + m) * 255),
            g: Math.round((gp + m) * 255),
            b: Math.round((bp + m) * 255),
            a: alpha,
        }
    },
}
