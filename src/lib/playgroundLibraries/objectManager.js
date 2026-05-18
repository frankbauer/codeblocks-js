export default {
    objects: new Map(),
    typeFactories: new Map(),

    _extractObjectId(refOrId) {
        if (Number.isInteger(refOrId)) {
            return refOrId
        }
        if (refOrId && typeof refOrId === 'object' && Number.isInteger(refOrId.id)) {
            return refOrId.id
        }
        return null
    },

    _matchesExpectedType(entry, refOrId, expectedType) {
        if (!entry) {
            return false
        }

        if (typeof expectedType === 'string' && entry.type !== expectedType) {
            return false
        }

        if (refOrId && typeof refOrId === 'object' && typeof refOrId.type === 'string') {
            return entry.type === refOrId.type
        }

        return true
    },

    _resolveEntry(refOrId, expectedType) {
        const id = this._extractObjectId(refOrId)
        if (id == null) {
            return null
        }

        const entry = this.objects.get(id)
        if (!this._matchesExpectedType(entry, refOrId, expectedType)) {
            return null
        }

        return entry
    },

    create() {
        this.objects = new Map()
        this.typeFactories = new Map()
        console.log('PLAyRUN: Object manager created', this.canvasElement)
        return {
            registerType: (type, factory) => this.typeFactories.set(type, factory),
            get: (refOrId, expectedType) => this._resolveEntry(refOrId, expectedType)?.instance ?? null,
            has: (refOrId, expectedType) => this._resolveEntry(refOrId, expectedType) != null,
            delete: (refOrId, expectedType) => {
                const entry = this._resolveEntry(refOrId, expectedType)
                if (!entry) {
                    return false
                }
                const id = this._extractObjectId(refOrId)
                return this.objects.delete(id)
            },
            getAll: () => Array.from(this.objects.values()).map((o) => o.instance),
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

    _dispatch(entry, data) {
        const objid = data.objid
        const type = data.type
        const subCommand = data.cmd
        const queryId = data.queryId
        const payload = data.json ? JSON.parse(data.json) : {}
        const instance = entry.instance

        if (queryId != null && instance.onQuery) {
            instance.onQuery(subCommand, payload, this._reply(objid, type, subCommand, queryId))
        } else if (instance.onMessage) {
            instance.onMessage(subCommand, payload)
        } else {
            console.warn(
                'PLAyRUN: Received message for object without handler:',
                objid,
                type,
                subCommand
            )
        }
    },

    onMessage(cmd, data) {
        if (cmd === 'n') {
            const parsedData = data.json ? JSON.parse(data.json) : {}
            const objid = data.objid
            const queryId = data.queryId
            const type = parsedData.type || data.type
            console.log('PLAyRUN: RemoteObject Creation:', type, '#' + objid)

            if (this.objects.has(objid)) {
                console.warn('Object with id already exists:', objid, type)
                return
            }

            const entry = {
                type,
                instance: null,
                ready: false,
                queue: [],
            }
            this.objects.set(objid, entry)

            const factory = this.typeFactories.get(type)
            if (!factory) {
                console.warn('PLAyRUN: No factory registered for type:', type)
                entry.instance = { ...parsedData, id: objid, type }
                entry.ready = true
                this._reply(objid, type, 'ready', queryId)()
                return
            }

            const attrs = { ...parsedData, id: objid, type }
            const onReady = (payload = {}) => {
                if (entry.ready) return
                entry.ready = true
                this._reply(objid, type, 'ready', queryId)(payload)
                console.log('PLAyRUN: Object ready:', type, '#' + objid)

                const q = entry.queue
                entry.queue = []
                q.forEach((msg) => this._dispatch(entry, msg))
            }
            const onError = (errorPayload) => {
                this._reply(objid, type, 'load-error', queryId)(errorPayload)
                console.error('PLAyRUN: Object creation failed:', type, '#' + objid, errorPayload)
                this.objects.delete(objid)
            }

            const instance = factory(attrs, onReady, onError)
            if (instance) {
                entry.instance = instance
            } else {
                console.warn('PLAyRUN: Factory did not return an instance for type:', type)
            }
        } else if (cmd === 'o') {
            const objid = data.objid
            const type = data.type
            const entry = this.objects.get(objid)

            if (!entry) {
                console.error(
                    'Received message "' + data.cmd + '" for non-existing object:',
                    objid,
                    type
                )
                return
            }
            if (entry.type !== type) {
                console.error(
                    'Received message "' + data.cmd + '" for object with mismatching type:',
                    objid,
                    'expected:',
                    entry.type,
                    'got:',
                    type
                )
                return
            }

            if (!entry.ready) {
                entry.queue.push(data)
            } else {
                this._dispatch(entry, data)
            }
        }
    },
   beforeStart() {
        // called just before the java application is executed, time to reset the state of the object manager
        this.objects.clear()
    },
}
