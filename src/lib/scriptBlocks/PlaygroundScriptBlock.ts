import {
    IPlaygroundObject,
    IScriptOutputObject,
    Runner,
    AnyCodeBlockScope,
} from '@/lib/IScriptBlock'
import { BaseScriptBlock } from './BaseScriptBlock'

export abstract class PlaygroundScriptBlock extends BaseScriptBlock {
    protected getFallbackObject(): IPlaygroundObject {
        return {
            init: () => {
                console.error('FAILED INIT ATTEMPT')
            },
            update: () => {
                console.error('FAILED UPDATE ATTEMPT')
                return undefined
            },
            RESOURCES: [],
            DATA: [],
        }
    }

    public requestsOriginalVersion(): boolean {
        return false
    }

    public addArgumentsTo(args: object | string[]) {
        this.lazyInit()
        if (this.obj) {
            const o = this.obj as IPlaygroundObject
            if (o.addArgumentsTo) {
                try {
                    o.addArgumentsTo(args)
                } catch (e) {
                    this.pushError(e)
                }
            }
        }
    }

    public didReceiveMessage(cmd: string, data: any) {
        this.lazyInit()
        if (this.obj) {
            const o = this.obj as IPlaygroundObject
            if (o.onMessage === undefined) {
                console.i('MESSAGE - Received to Queue', cmd)
                this.queuedIncomingMessages.push({ c: cmd, d: data })
            } else {
                console.i('MESSAGE - Received from Worker', cmd, data)
                o.onMessage(cmd, data)
            }
        } else {
            console.i('MESSAGE - Received to Queue', cmd)
            this.queuedIncomingMessages.push({ c: cmd, d: data })
        }
    }

    public beforeStart() {
        this.lazyInit()
        if (this.obj) {
            const o = this.obj as IPlaygroundObject
            if (o.beforeStart) {
                console.i('MESSAGE - beforeStart')
                o.beforeStart()
            }
        }
    }

    public whenFinished(args: string[] | object, resultData?: object | any[]) {
        this.lazyInit()
        if (this.obj) {
            const o = this.obj as IPlaygroundObject
            if (o.whenFinished) {
                console.i('MESSAGE - whenFinished')
                o.whenFinished(args, resultData)
            }
        }
    }

    public setupDOM(canvasElement: JQuery<HTMLElement>, scope: AnyCodeBlockScope): void {
        this.lazyInit()
        if (this.obj === undefined) {
            return
        }

        try {
            const o = this.obj as IPlaygroundObject
            o.DATA = this.DATA

            console.i('!!! SETUP CANVAS !!!')
            if (o.setupDOM) {
                const { outputElement, smartScope } = this.getScopeAndOutput(canvasElement, scope)
                o.setupDOM(canvasElement, outputElement, smartScope)
            }
        } catch (e) {
            this.pushError(e)
        }
    }

    protected abstract getScopeAndOutput(
        canvasElement: JQuery<HTMLElement>,
        scope: AnyCodeBlockScope
    ): { outputElement: JQuery<HTMLElement> | undefined; smartScope: AnyCodeBlockScope }

    public init(canvasElement: JQuery<HTMLElement>, scope: AnyCodeBlockScope, runner: Runner): void {
        const self = this
        this.queuedMessages = []
        this.queuedIncomingMessages = []
        this.lazyInit()
        console.i('MESSAGE - Reset Queue from Init')
        if (this.obj === undefined) {
            return
        }
        try {
            const o = this.obj as IPlaygroundObject
            o.DATA = this.DATA
            if (o.getResources) {
                if (self.RESOURCES === undefined) {
                    console.i('!!! FETCHING RESOURCES !!!')
                    self.RESOURCES = []
                    const requests = o.getResources().map((res, idx, array) => {
                        return fetch(res.uri)
                            .then((response) => {
                                if (!response.ok) {
                                    throw new Error('Unable to retrive ' + res.uri)
                                }
                                if (res.type === 'json') {
                                    return response.json()
                                } else if (res.type === 'text') {
                                    return response.text()
                                } else if (res.type === 'image') {
                                    return response.blob()
                                } else if (res.type === 'buffer') {
                                    return response.arrayBuffer()
                                }
                                return response.blob()
                            })
                            .then((data) => {
                                if (res.type === 'image') {
                                    data = URL.createObjectURL(data)
                                }
                                if (self.RESOURCES === undefined) {
                                    self.RESOURCES = []
                                }
                                self.RESOURCES[idx] = data

                                if (res.name) {
                                    self.RESOURCES[res.name] = data
                                    const a = o as any
                                    a[res.name] = data
                                }
                                return data
                            })
                    })

                    Promise.all(requests)
                        .then((values) => {
                            if (self.RESOURCES === undefined) {
                                self.RESOURCES = []
                            }
                            o.RESOURCES = self.RESOURCES
                            self._runInit(canvasElement, scope, runner)
                        })
                        .catch((e) => console.error(e))
                } else {
                    console.i('!!! READING CACHED RESOURCES !!!')
                    o.RESOURCES = self.RESOURCES
                    o.getResources().forEach((res) => {
                        if (res.name) {
                            const a = o as any
                            if (self.RESOURCES !== undefined) {
                                a[res.name] = self.RESOURCES[res.name]
                            }
                        }
                    })
                    self._runInit(canvasElement, scope, runner)
                }
            } else {
                o.RESOURCES = []
                this._runInit(canvasElement, scope, runner)
            }
        } catch (e) {
            this.pushError(e)
        }
    }

    protected _runInit(
        canvasElement: JQuery<HTMLElement>,
        scope: AnyCodeBlockScope,
        runner: Runner
    ): void {
        console.i('!!! INIT CANVAS !!!')

        const arunner: any = runner
        arunner.run = runner
        arunner.postMessage = this.doPostMessageToWorker.bind(this)

        const { outputElement, smartScope } = this.getScopeAndOutput(canvasElement, scope)

        if (outputElement === undefined) {
            console.error('[Internal Error] No Output Element found!')
            this.pushError('[Internal Error] No Output Element found!')
        } else {
            const o = this.obj as IPlaygroundObject
            o.init(canvasElement, outputElement, smartScope, runner)
        }
    }

    public update(
        outputObject: IScriptOutputObject,
        canvasElement: JQuery<HTMLElement>
    ): string | undefined {
        this.lazyInit()
        if (this.obj === undefined) {
            return outputObject.output
        }
        try {
            const o = this.obj as IPlaygroundObject
            if (o.update) {
                console.i('!!! UPDATE (v' + this.version + ')!!!')
                return o.update(
                    outputObject.processedOutput.text,
                    outputObject.processedOutput.json,
                    canvasElement,
                    outputObject.outputElement
                )
            }
        } catch (e) {
            this.pushError(e)
        }
        return outputObject.initialOutput
    }
}
