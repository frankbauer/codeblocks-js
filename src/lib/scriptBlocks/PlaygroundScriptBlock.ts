import {
    IPlaygroundObject,
    IScriptOutputObject,
    Runner,
    AnyCodeBlockScope,
} from '@/lib/IScriptBlock'
import { BaseScriptBlock } from './BaseScriptBlock'
import { LibraryScriptBlock } from './LibraryScriptBlock'
import { IBlockData } from '@/lib/ICodeBlocks'

export abstract class PlaygroundScriptBlock extends BaseScriptBlock {
    // Persistent sandbox shared with the compiled playground closure via with(sandbox)
    protected sandbox: Record<string, any> = {}

    protected librariesBefore: LibraryScriptBlock[] = []
    protected librariesAfter: LibraryScriptBlock[] = []

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
        this.chainLibraries(this.librariesBefore, (lib) => lib.libraryObject?.addArgumentsTo?.(args))
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
        this.chainLibraries(this.librariesAfter, (lib) => lib.libraryObject?.addArgumentsTo?.(args))
    }

    public didReceiveMessage(cmd: string, data: any) {
        this.chainLibraries(this.librariesBefore, (lib) => lib.libraryObject?.onMessage?.(cmd, data))
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
        this.chainLibraries(this.librariesAfter, (lib) => lib.libraryObject?.onMessage?.(cmd, data))
    }

    public beforeStart() {
        this.chainLibraries(this.librariesBefore, (lib) => lib.libraryObject?.beforeStart?.())
        this.lazyInit()
        if (this.obj) {
            const o = this.obj as IPlaygroundObject
            if (o.beforeStart) {
                console.i('MESSAGE - beforeStart')
                o.beforeStart()
            }
        }
        this.chainLibraries(this.librariesAfter, (lib) => lib.libraryObject?.beforeStart?.())
    }

    public whenFinished(args: string[] | object, resultData?: object | any[]) {
        this.chainLibraries(this.librariesBefore, (lib) =>
            lib.libraryObject?.whenFinished?.(args, resultData)
        )
        this.lazyInit()
        if (this.obj) {
            const o = this.obj as IPlaygroundObject
            if (o.whenFinished) {
                console.i('MESSAGE - whenFinished')
                o.whenFinished(args, resultData)
            }
        }
        this.chainLibraries(this.librariesAfter, (lib) =>
            lib.libraryObject?.whenFinished?.(args, resultData)
        )
    }

    public reset(canvasElement: JQuery<HTMLElement>): void {
        this.chainLibraries(this.librariesBefore, (lib) => lib.libraryObject?.reset?.())
        this.queuedMessages = []
        this.queuedIncomingMessages = []
        this.lazyInit()
        console.i('MESSAGE - Reset Queue from Reset')
        if (this.obj && this.obj.reset) {
            this.callObjReset(this.obj as IPlaygroundObject, canvasElement)
        }
        this.chainLibraries(this.librariesAfter, (lib) => lib.libraryObject?.reset?.())
    }

    public onParseError(initialOutput: string, parseError: string): boolean {
        this.chainLibraries(this.librariesBefore, (lib) =>
            lib.libraryObject?.onParseError?.(initialOutput, parseError)
        )
        this.lazyInit()
        let handled = false
        if (this.obj !== undefined) {
            try {
                if (this.obj.onParseError) {
                    this.obj.onParseError(initialOutput, parseError)
                    handled = true
                } else {
                    console.error(parseError)
                }
            } catch (e) {
                this.pushError(e)
            }
        }
        this.chainLibraries(this.librariesAfter, (lib) =>
            lib.libraryObject?.onParseError?.(initialOutput, parseError)
        )
        return handled
    }

    protected callObjSetupDOM(
        o: IPlaygroundObject,
        canvasElement: JQuery<HTMLElement>,
        outputElement: JQuery<HTMLElement> | undefined,
        scope: AnyCodeBlockScope
    ): void {
        o.setupDOM?.(canvasElement, outputElement, scope)
    }

    protected callObjInit(
        o: IPlaygroundObject,
        canvasElement: JQuery<HTMLElement>,
        outputElement: JQuery<HTMLElement>,
        scope: AnyCodeBlockScope,
        runner: Runner
    ): void {
        o.init(canvasElement, outputElement, scope, runner)
    }

    protected callObjUpdate(
        o: IPlaygroundObject,
        txt: string,
        json: object | undefined,
        canvasElement: JQuery<HTMLElement>,
        outputElement: JQuery<HTMLElement>
    ): string | undefined {
        return o.update(txt, json, canvasElement, outputElement)
    }

    protected callObjReset(o: IPlaygroundObject, canvasElement: JQuery<HTMLElement>): void {
        o.reset?.(canvasElement)
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected prepareLibraryObject(_lib: LibraryScriptBlock): void {}

    protected chainLibraries(
        libs: LibraryScriptBlock[],
        fn: (lib: LibraryScriptBlock) => void
    ): void {
        for (const lib of libs) {
            try {
                this.prepareLibraryObject(lib)
                fn(lib)
            } catch (e) {
                this.pushError(e)
            }
        }
    }

    protected abstract getScopeAndOutput(
        canvasElement: JQuery<HTMLElement>,
        scope: AnyCodeBlockScope
    ): { outputElement: JQuery<HTMLElement> | undefined; smartScope: AnyCodeBlockScope }

    public setupDOM(canvasElement: JQuery<HTMLElement>, scope: AnyCodeBlockScope): void {
        this.chainLibraries(this.librariesBefore, (lib) => lib.libraryObject?.setupDOM?.())

        this.lazyInit()
        if (this.obj === undefined) {
            return
        }

        try {
            const o = this.obj as IPlaygroundObject
            o.DATA = this.DATA

            console.i('!!! SETUP CANVAS !!!')
            const { outputElement, smartScope } = this.getScopeAndOutput(canvasElement, scope)
            this.callObjSetupDOM(o, canvasElement, outputElement, smartScope)
        } catch (e) {
            this.pushError(e)
        }

        this.chainLibraries(this.librariesAfter, (lib) => lib.libraryObject?.setupDOM?.())
    }

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
            return
        }

        this.chainLibraries(this.librariesBefore, (lib) => lib.libraryObject?.init?.())

        const o = this.obj as IPlaygroundObject
        this.callObjInit(o, canvasElement, outputElement, smartScope, runner)

        this.chainLibraries(this.librariesAfter, (lib) => lib.libraryObject?.init?.())
    }

    public update(
        outputObject: IScriptOutputObject,
        canvasElement: JQuery<HTMLElement>
    ): string | undefined {
        this.lazyInit()
        if (this.obj === undefined) {
            return outputObject.output
        }

        const out = outputObject.outputElement

        this.chainLibraries(this.librariesBefore, (lib) =>
            lib.libraryObject?.update?.(outputObject.processedOutput.text, outputObject.processedOutput.json)
        )

        let result: string | undefined
        try {
            const o = this.obj as IPlaygroundObject
            console.i('!!! UPDATE (v' + this.version + ')!!!')
            result = this.callObjUpdate(
                o,
                outputObject.processedOutput.text,
                outputObject.processedOutput.json,
                canvasElement,
                out
            )
        } catch (e) {
            this.pushError(e)
        }

        this.chainLibraries(this.librariesAfter, (lib) =>
            lib.libraryObject?.update?.(outputObject.processedOutput.text, outputObject.processedOutput.json)
        )

        return result ?? outputObject.initialOutput
    }
}
