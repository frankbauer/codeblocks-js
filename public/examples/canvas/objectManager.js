export default {
    objects: new Map(),
    makeObject: undefined,
    create() {
        this.objects = new Map()
        this.makeObject = undefined
        console.log('PLAyRUN: Object manager created')
        return {
            get: (id) => this.objects.get(id),
            getAll: () => Array.from(this.objects.values()),
            delete: (id) => this.objects.delete(id),
            has: (id) => this.objects.has(id),
            setObjectMaker: (fn) => {
                this.makeObject = fn
            },
        }
    },
    onMessage(cmd, data) {
        if (cmd === 'n') {
            const parsedData = data.json ? JSON.parse(data.json) : {}
            const objid = data.id ?? parsedData.id
            const type = data.type ?? parsedData.type
            console.log('PLAyRUN: RemoteObject Creation:', cmd, data)
            if (this.objects.has(objid)) {
                console.warn('Object with id already exists:', objid, type)
                return
            }

            let obj = {
                ...parsedData,
                id: objid,
                type: type,
                reply: (cmd, payload) => {
                    const value = {
                        json: JSON.stringify(payload),
                        objid: obj.id,
                        type: obj.type,
                        cmd,
                    }
                    console.log('PLAyRUN: Object reply:', value, data, obj.id, obj.type)
                    this.runner.postMessage('o', value)
                },
                onMessage: undefined,
            }
            if (this.makeObject) {
                obj = this.makeObject(obj)
            }
            console.log('PLAyRUN: Created object:', obj)
            this.objects.set(objid, obj)
        } else if (cmd === 'o') {
            const objid = data.objid
            const type = data.type
            const subCommand = data.cmd
            const obj = this.objects.get(data.objid)
            if (!obj) {
                console.error(
                    'Received message "' + subCommand + '"for non-existing object:',
                    objid,
                    type
                )
                return
            }
            if (obj.type !== type) {
                console.error(
                    'Received message "' + subCommand + '" for object with mismatching type:',
                    objid,
                    'expected:',
                    obj.type,
                    'got:',
                    type
                )
                return
            }
            if (obj.onMessage) {
                console.log(
                    'PLAyRUN: Dispatching message for object:',
                    obj.id,
                    obj.type,
                    subCommand,
                    data
                )
                const parsedData = data.json ? JSON.parse(data.json) : {}
                obj.onMessage(subCommand, parsedData)
            } else {
                console.warn(
                    'PLAyRUN: Received message for object without onMessage handler:',
                    obj.id,
                    obj.type,
                    subCommand,
                    data
                )
            }
        }
    },
}
