export default {
    canvas: null,
    ctx: null,
    objectManager: null,
    active: false,
    allowedInputEvents: ['click', 'keyup'],
    allowTick: false,
    tickMode: false,
    commandBuffer: [],
    // commands of complete frames (closed by 'frameDone'), applied at the next animation frame
    frameBuffer: [],
    sawFrameDone: false,
    startTime: null,
    lastTickTime: null,
    animationFrameId: null,
    overlay: null,
    overlayCtx: null,
    sprites: new Map(),
    spriteOrder: 0,
    spriteFrameId: null,
    state: {
        x: 0,
        y: 0,
        buttons: 0,
        ctrl: false,
        alt: false,
        shift: false,
        meta: false,
    },
    create(context) {
        const objectManager = context['objectManager']
        if (!objectManager) {
            console.error(
                'canvasManager requires objectManager in context. Make sure that you have an objectmanager Library and that it was added before canvasManager in the blocks list.'
            )
            return null
        }
        this.objectManager = objectManager
        console.log('PLAyRUN: Canvas manager created')

        objectManager.registerType('IMAGE', (attrs, ready, error) => {
            const safeSrc = this._normalizeAllowedImageSource(attrs ? attrs.src : null)
            if (!safeSrc) {
                const blockedSrc = attrs && attrs.src ? String(attrs.src) : ''
                const message =
                    'Blocked image source. Only relative URLs or same-origin HTTP(S) image URLs are allowed: ' +
                    blockedSrc
                console.error('PLAyRUN:', message)
                error({ message })
                return {
                    src: null,
                    onMessage: () => {},
                }
            }

            const img = new Image()

            img.onload = () => ready({ width: img.width, height: img.height })
            img.onerror = (err) => {
                console.error('PLAyRUN: Failed to load image:', safeSrc, err)
                error({ message: 'Failed to load image: ' + safeSrc })
            }
            img.src = safeSrc

            const imageRef = { type: 'IMAGE', id: attrs.id }

            return {
                src: safeSrc,
                img,
                onMessage: (cmd, data) => {
                    if (cmd === 'draw') {
                        const managedImage = this.objectManager
                            ? this.objectManager.get(imageRef, 'IMAGE')
                            : null
                        if (!managedImage) {
                            return
                        }
                        if (this.tickMode) {
                            this.commandBuffer.push({ type: 'IMAGE', img, data })
                        } else {
                            this._drawImage(img, data)
                        }
                    }
                },
            }
        })

        objectManager.registerType('SPRITE', (attrs, ready, error) =>
            this._createSprite(attrs, ready, error)
        )

        return {
            getContext: () => this.ctx,
            forbidAllInputEvents: () => {
                this.allowedInputEvents = []
                this.unbindEvents()
            },
            allowAllMouseEvents: () =>
                this.addAllowedEvents([
                    'mousedown',
                    'mouseup',
                    'click',
                    'mousemove',
                    'mouseenter',
                    'mouseleave',
                ]),
            allowAllKeyboardEvents: () => this.addAllowedEvents(['keydown', 'keyup']),
            allowMouseClickEvents: () => this.addAllowedEvents(['mousedown', 'mouseup', 'click']),
            allowMouseMoveEvents: () =>
                this.addAllowedEvents(['mousemove', 'mouseenter', 'mouseleave']),
            allowAllInputEvents: () =>
                this.addAllowedEvents([
                    'mousedown',
                    'mouseup',
                    'click',
                    'mousemove',
                    'mouseenter',
                    'mouseleave',
                    'keydown',
                    'keyup',
                ]),
            enableTicks: () => this.enableTicks(),
            disableTicks: () => this.disableTicks(),
        }
    },
    _createSprite(attrs, ready, error) {
        const image = this.objectManager ? this.objectManager.get(attrs.image, 'IMAGE') : null
        if (!image || !image.img) {
            const message = 'Sprite needs a loaded Image (image #' + attrs.image + ' not found)'
            console.error('PLAyRUN:', message)
            error({ message })
            return { onMessage: () => {} }
        }

        const sprite = {
            id: attrs.id,
            img: image.img,
            frameWidth: Math.max(1, attrs.frameWidth | 0),
            frameHeight: Math.max(1, attrs.frameHeight | 0),
            firstFrame: Math.max(0, attrs.firstFrame | 0),
            frameCount: attrs.frameCount | 0,
            fps: +attrs.fps > 0 ? +attrs.fps : 12,
            loop: attrs.loop !== false,
            frame: 0,
            playing: false,
            reverse: false,
            startTime: 0,
            startFrame: 0,
            visible: false,
            position: { x: 0, y: 0 },
            scale: 1,
            anchor: { x: 0, y: 0 },
            depth: 0,
            order: this.spriteOrder++,
        }

        const init = () => {
            const columns = Math.max(1, Math.floor(sprite.img.width / sprite.frameWidth))
            const rows = Math.max(1, Math.floor(sprite.img.height / sprite.frameHeight))
            const available = Math.max(1, columns * rows - sprite.firstFrame)
            sprite.columns = columns
            if (sprite.frameCount <= 0 || sprite.frameCount > available) {
                sprite.frameCount = available
            }
            this.sprites.set(sprite.id, sprite)
            ready({ frameCount: sprite.frameCount, columns, rows })
        }
        if (sprite.img.complete && sprite.img.naturalWidth > 0) {
            init()
        } else {
            sprite.img.addEventListener('load', init, { once: true })
        }

        return {
            sprite,
            onMessage: (cmd, data) => this._spriteMessage(sprite, cmd, data || {}),
        }
    },
    _spriteMessage(sprite, cmd, data) {
        const now = performance.now()
        switch (cmd) {
            case 'play': {
                this._updateSpriteFrame(sprite, now)
                if (+data.fps > 0) sprite.fps = +data.fps
                if (Number.isInteger(data.fromFrame) && data.fromFrame >= 0) {
                    sprite.frame = Math.min(data.fromFrame, sprite.frameCount - 1)
                }
                sprite.reverse = data.reverse === true
                sprite.playing = true
                sprite.startTime = now
                sprite.startFrame = sprite.frame
                break
            }
            case 'pause':
                this._updateSpriteFrame(sprite, now)
                sprite.playing = false
                break
            case 'stop':
                sprite.playing = false
                sprite.frame = 0
                break
            case 'setFrame':
                sprite.frame = Math.max(0, Math.min(sprite.frameCount - 1, data.frame | 0))
                sprite.startTime = now
                sprite.startFrame = sprite.frame
                break
            case 'setLoop':
                this._updateSpriteFrame(sprite, now)
                sprite.startTime = now
                sprite.startFrame = sprite.frame
                sprite.loop = data.loop !== false
                break
            case 'show':
                if (data.position) sprite.position = data.position
                if (data.scale !== undefined) sprite.scale = +data.scale
                if (data.anchor) sprite.anchor = data.anchor
                sprite.visible = true
                break
            case 'hide':
                sprite.visible = false
                break
            case 'setPosition':
                if (data.position) sprite.position = data.position
                break
            case 'setScale':
                sprite.scale = +data.scale
                break
            case 'setAnchor':
                if (data.anchor) sprite.anchor = data.anchor
                break
            case 'setDepth':
                sprite.depth = +data.depth || 0
                break
            case 'draw':
                if (this.tickMode) {
                    this.commandBuffer.push({ type: 'SPRITE', sprite, data })
                } else {
                    this._drawSpriteFrame(this.ctx, sprite, data, performance.now())
                }
                return
            default:
                console.warn('PLAyRUN: Unknown sprite command:', cmd)
                return
        }
        this._requestSpriteFrame()
    },
    // advances sprite.frame to the frame that belongs to `now`, sends 'ended' for finished animations
    _updateSpriteFrame(sprite, now) {
        if (!sprite.playing) {
            return
        }
        const steps = Math.floor(((now - sprite.startTime) / 1000) * sprite.fps)
        const count = sprite.frameCount
        let frame = sprite.startFrame + (sprite.reverse ? -steps : steps)
        if (sprite.loop) {
            frame = ((frame % count) + count) % count
        } else if (frame >= count || frame < 0) {
            frame = frame < 0 ? 0 : count - 1
            sprite.playing = false
            this._sendSpriteEvent(sprite, 'ended')
        }
        sprite.frame = frame
    },
    _sendSpriteEvent(sprite, cmd) {
        if (this.active && this.runner) {
            this.runner.postMessage('o', {
                json: JSON.stringify({ frame: sprite.frame }),
                objid: sprite.id,
                type: 'SPRITE',
                cmd,
            })
        }
    },
    _drawSpriteFrame(ctx, sprite, data, now) {
        if (!ctx) {
            return
        }
        this._updateSpriteFrame(sprite, now)
        const index = sprite.firstFrame + sprite.frame
        const sx = (index % sprite.columns) * sprite.frameWidth
        const sy = Math.floor(index / sprite.columns) * sprite.frameHeight
        const pos = data.position ?? { x: data.x ?? 0, y: data.y ?? 0 }
        const anchor = data.anchor ?? { x: 0, y: 0 }
        const scale = data.scale ?? 1
        const w = sprite.frameWidth * scale
        const h = sprite.frameHeight * scale
        ctx.drawImage(
            sprite.img,
            sx,
            sy,
            sprite.frameWidth,
            sprite.frameHeight,
            pos.x - anchor.x * w,
            pos.y - anchor.y * h,
            w,
            h
        )
    },
    // draws all visible sprites onto the sprite layer, sorted by depth (then creation order)
    _renderSprites(now) {
        if (!this.overlayCtx || !this.overlay) {
            return false
        }
        const dpr = window.devicePixelRatio || 1
        const ctx = this.overlayCtx
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, this.overlay[0].width / dpr, this.overlay[0].height / dpr)

        let animating = false
        const visible = []
        this.sprites.forEach((sprite) => {
            if (sprite.visible) visible.push(sprite)
            else this._updateSpriteFrame(sprite, now)
            if (sprite.playing) animating = true
        })
        visible.sort((a, b) => a.depth - b.depth || a.order - b.order)
        visible.forEach((sprite) => this._drawSpriteFrame(ctx, sprite, sprite, now))
        return animating
    },
    _requestSpriteFrame() {
        if (this.spriteFrameId) {
            return
        }
        this.spriteFrameId = requestAnimationFrame(() => {
            this.spriteFrameId = null
            const animating = this._renderSprites(performance.now())
            if (animating && this.active) {
                this._requestSpriteFrame()
            }
        })
    },
    _resetSprites() {
        if (this.spriteFrameId) {
            cancelAnimationFrame(this.spriteFrameId)
            this.spriteFrameId = null
        }
        this.sprites = new Map()
        this.spriteOrder = 0
        this._renderSprites(performance.now())
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
    _drawImage(img, data) {
        if (!this.ctx) {
            return
        }
        const pos = data.position ?? { x: data.x ?? 0, y: data.y ?? 0 }
        const anchor = data.anchor ?? { x: 0, y: 0 }
        const scale = data.scale ?? 1
        const w = (data.size?.x ?? data.width ?? img.width) * scale
        const h = (data.size?.y ?? data.height ?? img.height) * scale
        this.ctx.drawImage(img, pos.x - anchor.x * w, pos.y - anchor.y * h, w, h)
    },
    enableTicks() {
        this.allowTick = true
        if (this.active && !this.animationFrameId) {
            this.lastTickTime = null
            this.animationFrameId = requestAnimationFrame((t) => this.tickLoop(t))
        }
    },
    disableTicks() {
        this.allowTick = false
    },
    addAllowedEvents(events) {
        events.forEach((evt) => {
            if (!this.allowedInputEvents.includes(evt)) {
                this.allowedInputEvents.push(evt)
            }
        })
        this.unbindEvents()
        this.bindEvents()
    },
    removeAllowedEvents(events) {
        this.allowedInputEvents = this.allowedInputEvents.filter((evt) => !events.includes(evt))
        this.unbindEvents()
        this.bindEvents()
    },
    beforeStart() {
        console.log('PLAyRUN: canvasManager beforeStart')
        this.active = true
        this.startTime = null
        this.lastTickTime = null
        this._resetSprites()
        this.commandBuffer = []
        this.frameBuffer = []
        this.sawFrameDone = false
        this.bindEvents()

        if (window.ResizeObserver && this.canvasElement) {
            this.resizeObserver = new ResizeObserver(() => this.resize())
            this.resizeObserver.observe(this.canvasElement[0])
        }
        this.resize()

        if (this.allowTick) {
            this.enableTicks()
        }
    },
    afterStop() {
        console.log('PLAyRUN: canvasManager afterStop')
        this.active = false
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId)
            this.animationFrameId = null
        }
        // sprites keep their last frame visible, but stop animating
        const now = performance.now()
        this.sprites.forEach((sprite) => {
            this._updateSpriteFrame(sprite, now)
            sprite.playing = false
        })
        if (this.spriteFrameId) {
            cancelAnimationFrame(this.spriteFrameId)
            this.spriteFrameId = null
        }
        this._renderSprites(now)
        this.unbindEvents()
        if (this.resizeObserver) {
            this.resizeObserver.disconnect()
            this.resizeObserver = null
        }
        // Reset volatile state
        this.state.buttons = 0
        this.state.ctrl = false
        this.state.alt = false
        this.state.shift = false
        this.state.meta = false
        // show what was drawn last instead of dropping it
        this.applyCommandBuffer(true)
        this.sawFrameDone = false
    },
    // Worker messages carry their payload as JSON string in `value` (static @JSCommand) or `json`.
    // Commands with a single parameter (e.g. setFillStyle(value), setTickMode(enabled)) are unwrapped.
    _payload(data) {
        if (!data || typeof data !== 'object' || Array.isArray(data) || !('command' in data)) {
            return data
        }
        let value = data.value !== undefined ? data.value : data.json
        if (typeof value === 'string') {
            try {
                value = JSON.parse(value)
            } catch (_e) {
                // plain string payload, e.g. Canvas.clear(color)
            }
        }
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            const keys = Object.keys(value)
            if (keys.length === 1 && (keys[0] === 'value' || keys[0] === 'enabled')) {
                value = value[keys[0]]
            }
        }
        return value
    },
    onMessage(cmd, rawData) {
        const data = cmd === 'getScreenSize' ? rawData : this._payload(rawData)
        if (cmd === 'enableTicks') {
            this.enableTicks()
        } else if (cmd === 'disableTicks') {
            this.disableTicks()
        } else if (cmd === 'setTickMode') {
            this.tickMode = !!data
            if (!this.tickMode) {
                this.applyCommandBuffer(true)
            }
        } else if (cmd === 'frameDone') {
            // everything buffered so far belongs to a complete frame
            this.sawFrameDone = true
            this.frameBuffer = this.frameBuffer.concat(this.commandBuffer)
            this.commandBuffer = []
        } else if (cmd === 'getScreenSize') {
            if (this.runner) {
                this.runner.postMessage('getScreenSizeReply', {
                    queryId: data.queryId,
                    json: JSON.stringify({
                        width: this.canvas ? this.canvas[0].width : 0,
                        height: this.canvas ? this.canvas[0].height : 0,
                        // drawing coordinates are CSS pixels (the context is scaled by the pixel ratio)
                        cssWidth: this.canvas ? this.canvas[0].width / (window.devicePixelRatio || 1) : 0,
                        cssHeight: this.canvas ? this.canvas[0].height / (window.devicePixelRatio || 1) : 0,
                        pixelRatio: window.devicePixelRatio || 1,
                    }),
                })
            }
        } else if (cmd === 'enableInputEvent') {
            this.addAllowedEvents([data])
        } else if (cmd === 'disableInputEvent') {
            this.removeAllowedEvents([data])
        } else if (this.ctx) {
            if (this.tickMode) {
                this.commandBuffer.push({ type: 'CMD', cmd, data })
            } else {
                this.executeCommand(cmd, data)
            }
        }
    },
    executeCommand(cmd, data) {
        switch (cmd) {
            case 'setStrokeStyle':
                this.ctx.strokeStyle = data
                break
            case 'setFillStyle':
                this.ctx.fillStyle = data
                break
            case 'setLineWidth':
                this.ctx.lineWidth = data
                break
            case 'setFont':
                this.ctx.font = data
                break
            case 'setTextAlign':
                this.ctx.textAlign = data
                break
            case 'beginPath':
                this.ctx.beginPath()
                break
            case 'closePath':
                this.ctx.closePath()
                break
            case 'stroke':
                this.ctx.stroke()
                break
            case 'fill':
                this.ctx.fill()
                break
            case 'moveTo':
                this.ctx.moveTo(data.x, data.y)
                break
            case 'lineTo':
                this.ctx.lineTo(data.x, data.y)
                break
            case 'fillRect':
                this.ctx.fillRect(data.x, data.y, data.w, data.h)
                break
            case 'strokeRect':
                this.ctx.strokeRect(data.x, data.y, data.w, data.h)
                break
            case 'clearRect':
                this.ctx.clearRect(data.x, data.y, data.w, data.h)
                break
            case 'arc':
                this.ctx.arc(
                    data.x,
                    data.y,
                    data.radius,
                    data.startAngle,
                    data.endAngle,
                    data.anticlockwise
                )
                break
            case 'fillText':
                this.ctx.fillText(data.text, data.x, data.y)
                break
            case 'strokeText':
                this.ctx.strokeText(data.text, data.x, data.y)
                break
            case 'save':
                this.ctx.save()
                break
            case 'restore':
                this.ctx.restore()
                break
            case 'translate':
                this.ctx.translate(data.x, data.y)
                break
            case 'rotate':
                this.ctx.rotate(data.angle)
                break
            case 'scale':
                this.ctx.scale(data.x, data.y)
                break
            case 'clear':
                const dpr = window.devicePixelRatio || 1
                this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
                if (data && typeof data === 'string') {
                    this.ctx.fillStyle = data
                    this.ctx.fillRect(0, 0, this.canvas[0].width / dpr, this.canvas[0].height / dpr)
                } else {
                    this.ctx.clearRect(
                        0,
                        0,
                        this.canvas[0].width / dpr,
                        this.canvas[0].height / dpr
                    )
                }
                break
        }
    },
    // applies the commands of complete frames. Without 'frameDone' messages (older worker
    // libraries) or with `all`, everything that is buffered is applied.
    applyCommandBuffer(all = false) {
        let entries
        if (all || !this.sawFrameDone) {
            entries = this.frameBuffer.concat(this.commandBuffer)
            this.frameBuffer = []
            this.commandBuffer = []
        } else {
            entries = this.frameBuffer
            this.frameBuffer = []
        }
        if (entries.length === 0) {
            return
        }
        entries.forEach((entry) => {
            if (entry.type === 'IMAGE') {
                this._drawImage(entry.img, entry.data)
            } else if (entry.type === 'SPRITE') {
                this._drawSpriteFrame(this.ctx, entry.sprite, entry.data, performance.now())
            } else if (entry.type === 'CMD') {
                this.executeCommand(entry.cmd, entry.data)
            }
        })
    },
    tickLoop(timestamp) {
        if (!this.active || !this.allowTick) {
            this.animationFrameId = null
            return
        }

        const now = timestamp / 1000
        if (this.startTime === null) {
            this.startTime = now
        }

        if (this.lastTickTime === null) {
            this.lastTickTime = now
        }

        if (this.tickMode && this.ctx) {
            // Apply buffered commands from the previous frame
            this.applyCommandBuffer()
        }

        // Send tick notification to Java
        if (this.runner) {
            const time = now - this.startTime
            const delta = now - this.lastTickTime
            this.runner.postMessage('tick', {
                time,
                delta,
                json: JSON.stringify({ time, delta }),
            })
        }
        this.lastTickTime = now
        this.animationFrameId = requestAnimationFrame((t) => this.tickLoop(t))
    },
    resize() {
        if (!this.canvas || !this.canvasElement) {
            return
        }
        const dpr = window.devicePixelRatio || 1
        const rect = this.canvasElement[0].getBoundingClientRect()
        const width = rect.width
        const height = rect.height

        this.canvas[0].width = width * dpr
        this.canvas[0].height = height * dpr
        this.ctx = this.canvas[0].getContext('2d')
        this.ctx.setTransform(1, 0, 0, 1, 0, 0)
        this.ctx.scale(dpr, dpr)
        if (this.overlay) {
            this.overlay[0].width = width * dpr
            this.overlay[0].height = height * dpr
            this.overlayCtx = this.overlay[0].getContext('2d')
            this._renderSprites(performance.now())
        }
        console.log('PLAyRUN: Canvas resized:', width, height, 'DPR:', dpr)
    },
    updateState(e) {
        this.state.ctrl = e.ctrlKey || false
        this.state.alt = e.altKey || false
        this.state.shift = e.shiftKey || false
        this.state.meta = e.metaKey || false

        if (typeof e.clientX !== 'undefined' && this.canvas) {
            const rect = this.canvas[0].getBoundingClientRect()
            this.state.x = e.clientX - rect.left
            this.state.y = e.clientY - rect.top
        }
        if (typeof e.buttons !== 'undefined') {
            this.state.buttons = e.buttons
        }
    },
    sendInputEvent(type, data = {}) {
        if (this.active && this.runner) {
            //const payload = { type, ...this.state, cmd: this.state.meta, ...data }
            const payload = {
                t: type,
                m: {
                    p: { x: this.state.x, y: this.state.y },
                    b: this.state.buttons,
                },
                d: {
                    ctrl: this.state.ctrl,
                    alt: this.state.alt,
                    shift: this.state.shift,
                    meta: this.state.meta,
                },
                k: data.key
                    ? {
                          key: data.key,
                          code: data.code,
                          keyCode: data.keyCode,
                      }
                    : {},
            }
            this.runner.postMessage('input', {
                json: JSON.stringify(payload),
            })
        }
    },
    bindEvents() {
        if (!this.canvas) {
            return
        }

        const mouseEvents = [
            'mousemove',
            'mousedown',
            'mouseup',
            'click',
            'mouseenter',
            'mouseleave',
        ].filter((evt) => this.allowedInputEvents.includes(evt))
        mouseEvents.forEach((type) => {
            this.canvas.on(type + '.canvasManager', (e) => {
                this.updateState(e)
                this.sendInputEvent(type)
            })
        })

        const keyEvents = ['keydown', 'keyup'].filter((evt) =>
            this.allowedInputEvents.includes(evt)
        )
        keyEvents.forEach((type) => {
            this.canvas.on(type + '.canvasManager', (e) => {
                this.updateState(e)
                this.sendInputEvent(type, {
                    key: e.key,
                    code: e.code,
                    keyCode: e.keyCode,
                })
            })
        })
    },
    unbindEvents() {
        if (this.canvas) {
            this.canvas.off('.canvasManager')
        }
    },
    setupDOM() {
        let canvas = this.canvasElement.find('canvas')
        console.log('PLAyRUN: Setting up canvas DOM', this.canvasElement[0], canvas)
        if (!canvas || canvas.length === 0) {
            console.log('PLAyRUN: Creating canvas element')
            canvas = $(document.createElement('canvas')).css({
                width: '100%',
                height: '100%',
            })
            this.canvasElement.append(canvas)
        }
        this.canvas = canvas
        this.ctx = this.canvas[0].getContext('2d')

        // sprite layer: a second canvas on top of the drawing canvas that lets input events pass through
        if (this.canvasElement.css('position') === 'static') {
            this.canvasElement.css('position', 'relative')
        }
        this.overlay = $(document.createElement('canvas'))
            .addClass('canvasManager-sprites')
            .css({
                position: 'absolute',
                left: this.canvas[0].offsetLeft + 'px',
                top: this.canvas[0].offsetTop + 'px',
                width: this.canvas[0].offsetWidth ? this.canvas[0].offsetWidth + 'px' : '100%',
                height: this.canvas[0].offsetHeight ? this.canvas[0].offsetHeight + 'px' : '100%',
                'pointer-events': 'none',
            })
        this.canvas.after(this.overlay)
        this.overlayCtx = this.overlay[0].getContext('2d')

        // Make canvas focusable
        this.canvas.attr('tabindex', '0').css('outline', 'none')

        this.resize()
    },
}
