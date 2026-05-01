export default {
    canvas: null,
    ctx: null,
    active: false,
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
                            if (data.width && data.height) {
                                this.ctx.drawImage(obj.img, data.x, data.y, data.width, data.height)
                            }
                            if (data.scale) {
                                this.ctx.drawImage(
                                    obj.img,
                                    data.x,
                                    data.y,
                                    obj.img.width * data.scale,
                                    obj.img.height * data.scale
                                )
                            } else {
                                this.ctx.drawImage(obj.img, data.x, data.y)
                            }
                        }
                    }
                    console.log('PLAyRUN: onMessage for object:', obj.id, cmd, data, this.canvas)
                }
                obj.foo = 42
                img.src = obj.src
            }
            return obj
        })
    },
    beforeStart() {
        console.log('PLAyRUN: canvasManager beforeStart')
        this.active = true
        this.bindEvents()
    },
    afterStop() {
        console.log('PLAyRUN: canvasManager afterStop')
        this.active = false
        this.unbindEvents()
        // Reset volatile state
        this.state.buttons = 0
        this.state.ctrl = false
        this.state.alt = false
        this.state.shift = false
        this.state.meta = false
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

        const mouseEvents = ['mousedown', 'mouseup', 'click', 'mouseenter', 'mouseleave']
        mouseEvents.forEach((type) => {
            this.canvas.on(type + '.canvasManager', (e) => {
                this.updateState(e)
                this.sendInputEvent(type)
            })
        })

        this.canvas.on('mousemove.canvasManager', (e) => {
            this.updateState(e)
        })

        const keyEvents = ['keydown', 'keyup']
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
    },
}
