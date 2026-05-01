export default {
    create(context) {
        const objectManager = context['objectManager']
        if (!objectManager) {
            console.error(
                'canvasManager requires objectManager in context. Make sure that you have an objectmanager Library and that it was added before canvasManager in the blocks list.'
            )
            return null
        }
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
                    console.log('PLAyRUN: onMessage for object:', obj.id, cmd, data)
                }
                obj.foo = 42
                img.src = obj.src
            }
            return obj
        })
    },
}
