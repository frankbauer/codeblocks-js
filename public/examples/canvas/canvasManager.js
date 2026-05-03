export default {
    canvas: null,
    ctx: null,
    active: false,
    allowedInputEvents: ['click', 'keyup'],
    allowTick: false,
    startTime: null,
    lastTickTime: null,
    animationFrameId: null,
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
        console.log('PLAyRUN: Canvas manager created')

        objectManager.registerType('IMAGE', (attrs, ready, error) => {
            const img = new Image()

            img.onload = () => ready({ width: img.width, height: img.height })
            img.onerror = (err) => {
                console.error('PLAyRUN: Failed to load image:', attrs.src, err)
                error({ message: 'Failed to load image: ' + attrs.src })
            }
            img.src = attrs.src

            return {
                onMessage: (cmd, data) => {
                    if (cmd === 'draw') {
                        this._drawImage(img, data)
                    }
                },
            }
        })

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
    _drawImage(img, data) {
        if (!this.ctx) return
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
    },
    onMessage(cmd, data) {
        if (cmd === 'enableTicks') {
            this.enableTicks()
        } else if (cmd === 'disableTicks') {
            this.disableTicks()
        } else if (cmd === 'getScreenSize') {
            if (this.runner) {
                this.runner.postMessage('getScreenSizeReply', {
                    queryId: data.queryId,
                    json: JSON.stringify({
                        width: this.canvas ? this.canvas[0].width : 0,
                        height: this.canvas ? this.canvas[0].height : 0,
                    }),
                })
            }
        } else if (cmd === 'enableInputEvent') {
            this.addAllowedEvents([data])
        } else if (cmd === 'disableInputEvent') {
            this.removeAllowedEvents([data])
        }
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

        // Make canvas focusable
        this.canvas.attr('tabindex', '0').css('outline', 'none')

        this.resize()
    },
}
