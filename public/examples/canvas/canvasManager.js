export default {
    canvas: null,
    ctx: null,
    active: false,
    allowedInputEvents: ['click', 'keyup'],
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
        objectManager.setObjectMaker((obj) => {
            if (obj.type === 'IMAGE') {
                let img = new Image()
                img.onload = () => {
                    obj.img = img
                    obj.ready = true
                    if (obj.queue) {
                        console.log(
                            'PLAyRUN: Processing queued messages for object:',
                            obj.id,
                            obj.queue.length
                        )
                        obj.queue.forEach(({ cmd, data }) => obj.onMessage(cmd, data))
                        obj.queue = []
                    }
                    obj.reply('ready', { width: img.width, height: img.height })
                    console.log('PLAyRUN: Image loaded and object updated:', obj)
                }
                img.onerror = (err) => {
                    console.error('PLAyRUN: Failed to load image:', obj.src, err)
                    obj.ready = false
                    obj.reply('load-error', {})
                }
                obj.ready = false
                obj.queue = []
                obj.onMessage = (cmd, data) => {
                    if (!obj.ready) {
                        console.log(
                            'PLAyRUN: Object not ready, queuing message:',
                            obj.id,
                            cmd,
                            data
                        )
                        obj.queue.push({ cmd, data })
                        return
                    }
                    if (cmd === 'draw') {
                        if (this.ctx) {
                            const anchor = {
                                x: data.ax || 0,
                                y: data.ay || 0,
                            }
                            const size = {
                                w: (data.width || obj.img.width) * (data.scale || 1),
                                h: (data.height || obj.img.height) * (data.scale || 1),
                            }
                            const drawX = data.x - anchor.x * size.w
                            const drawY = data.y - anchor.y * size.h

                            this.ctx.drawImage(obj.img, drawX, drawY, size.w, size.h)
                        }
                    }
                    console.log('PLAyRUN: onMessage for object:', obj.id, cmd, data, this.canvas)
                }
                obj.foo = 42
                img.src = obj.src
            }
            return obj
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
        }
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
        this.bindEvents()

        if (window.ResizeObserver && this.canvasElement) {
            this.resizeObserver = new ResizeObserver(() => this.resize())
            this.resizeObserver.observe(this.canvasElement[0])
        }
        this.resize()
    },
    afterStop() {
        console.log('PLAyRUN: canvasManager afterStop')
        this.active = false
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
            this.runner.postMessage('input', {
                type,
                ...this.state,
                cmd: this.state.meta,
                ...data,
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
