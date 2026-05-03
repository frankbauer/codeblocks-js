export default {
    objects: new Map(),
    typeFactories: new Map(),

    create() {
        this.objects = new Map()
        this.typeFactories = new Map()
        console.log('PLAyRUN: Object manager created')
        return {
            get: (id) => this.objects.get(id),
            getAll: () => Array.from(this.objects.values()),
            delete: (id) => this.objects.delete(id),
            has: (id) => this.objects.has(id),
            registerType: (type, factory) => this.typeFactories.set(type, factory),
        }
    },

    _reply(objid, type, cmd, queryId) {
        return (payload = {}) => {
            this.runner.postMessage('o', {
                json: JSON.stringify(payload),
                objid,
                queryId,
                type,
                cmd,
            })
        }
    },

    onMessage(cmd, data) {
        if (cmd === 'n') {
            const parsedData = data.json ? JSON.parse(data.json) : {}
            const objid = data.objid
            const queryId = data.queryId
            const type = parsedData.type
            console.log('PLAyRUN: RemoteObject Creation:', type, '#' + objid)

            if (this.objects.has(objid)) {
                console.warn('Object with id already exists:', objid, type)
                return
            }

            const attrs = { ...parsedData, id: objid, type }
            const factory = this.typeFactories.get(type)

            if (!factory) {
                console.warn('PLAyRUN: No factory registered for type:', type)
                this.objects.set(objid, { ...attrs, onMessage: undefined, onQuery: undefined })
                this._reply(objid, type, 'ready', queryId)()
                return
            }

            const onReady = (obj, payload = {}) => {
                obj.id = objid
                obj.type = type
                this.objects.set(objid, obj)
                this._reply(objid, type, 'ready', queryId)(payload)
                console.log('PLAyRUN: Object ready:', type, '#' + objid)
            }
            const onError = (message) => {
                this._reply(objid, type, 'error', queryId)({ message })
                console.error('PLAyRUN: Object creation failed:', type, '#' + objid, message)
            }

            factory(attrs, onReady, onError)

        } else if (cmd === 'o') {
            const objid = data.objid
            const type = data.type
            const subCommand = data.cmd
            const queryId = data.queryId
            const obj = this.objects.get(objid)

            if (!obj) {
                console.error('Received message "' + subCommand + '" for non-existing object:', objid, type)
                return
            }
            if (obj.type !== type) {
                console.error(
                    'Received message "' + subCommand + '" for object with mismatching type:',
                    objid, 'expected:', obj.type, 'got:', type
                )
                return
            }

            const parsedData = data.json ? JSON.parse(data.json) : {}

            if (queryId != null && obj.onQuery) {
                const reply = this._reply(objid, type, subCommand, queryId)
                obj.onQuery(subCommand, parsedData, reply)
            } else if (obj.onMessage) {
                obj.onMessage(subCommand, parsedData)
            } else {
                console.warn('PLAyRUN: Received message for object without handler:', obj.id, obj.type, subCommand)
            }
        }
    },
}
