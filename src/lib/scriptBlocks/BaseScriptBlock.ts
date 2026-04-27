import {
    IParsedError,
    IScriptBlock,
    IScriptOutputObject,
    IPlaygroundObject,
    ILegacyPlaygroundObject,
    Runner,
    AnyCodeBlockScope,
} from '@/lib/IScriptBlock'
import { ICompileAndRunArguments } from '../ICompilerRegistry'
import { IBlockData } from '../ICodeBlocks'
import { jsErrorParser } from './utils'

export abstract class BaseScriptBlock implements IScriptBlock {
    public err: IParsedError[] = []
    protected src: string | undefined = undefined
    protected fkt: Function | undefined = undefined
    protected obj: IPlaygroundObject | ILegacyPlaygroundObject | undefined = undefined
    protected didInit: boolean = false

    constructor(script: string, public version: string) {
        this.didInit = false
        this.src = script
        this.obj = this.getFallbackObject()
    }

    protected abstract getFallbackObject(): IPlaygroundObject | ILegacyPlaygroundObject

    public abstract requestsOriginalVersion(): boolean

    public invalidate() {
        this.obj = undefined
    }

    public abstract rebuild(code?: string): void

    public pushError(e: any) {
        this.err.push(jsErrorParser(e))
    }

    protected lazyInit() {
        if (!this.didInit) {
            this.obj = undefined
            this.rebuild(this.src)
            this.didInit = true
        }
    }

    public addArgumentsTo(args: object | string[]) {
        // Default no-op
    }

    protected _runConfig: null | ICompileAndRunArguments = null
    get runConfig(): null | ICompileAndRunArguments {
        return this._runConfig
    }

    set runConfig(cfg: null | ICompileAndRunArguments) {
        if (this._runConfig) {
            this._runConfig.dequeuePostponedMessages = function () {}
        }
        this._runConfig = cfg
        if (this._runConfig) {
            const self = this
            this._runConfig.dequeuePostponedMessages = function () {
                const msg = [...self.queuedMessages]
                self.queuedMessages = []
                msg.forEach((args) => self.doPostMessageToWorker(args.c, args.d))
            }
            if (this._runConfig.postMessageFunction !== null) {
                this._runConfig.dequeuePostponedMessages()
            }
        }
    }

    protected queuedMessages: any[] = []

    public doPostMessageToWorker(cmd: string, data: any) {
        if (data === undefined) {
            data = {}
        }
        if (
            this._runConfig !== undefined &&
            this._runConfig !== null &&
            this._runConfig.postMessageFunction !== null
        ) {
            cmd = `d-${cmd}`
            data.command = cmd
            console.i('MESSAGE - Posted to Worker', cmd, data)
            this._runConfig.postMessageFunction(cmd, data)
        } else {
            console.i('MESSAGE - Posted to Queue', cmd)
            this.queuedMessages.push({ c: cmd, d: data })
        }
    }

    protected queuedIncomingMessages: any[] = []

    public didReceiveMessage(cmd: string, data: any) {
        // Default behavior: queue it
        console.i('MESSAGE - Received to Queue', cmd)
        this.queuedIncomingMessages.push({ c: cmd, d: data })
    }

    public dequeueIncoming() {
        console.i('MESSAGE - Dequeue Incoming')
        const msg = [...this.queuedIncomingMessages]
        this.queuedIncomingMessages = []
        msg.forEach((args) => this.didReceiveMessage(args.c, args.d))
    }

    public beforeStart() {
        // Default no-op
    }

    public whenFinished(args: string[] | object, resultData?: object | any[]) {
        // Default no-op
    }

    public DATA: any[] = []

    public resetBlockData(blocks: IBlockData[] | undefined) {
        this.DATA = []
        if (blocks !== undefined) {
            this.addBlockDataFromBlocks(blocks)
        }
    }

    public addBlockDataFromBlocks(blocks: IBlockData[]): void {
        blocks.filter((b) => b.type == 'DATA').forEach((b) => this.addBlockDataFromBlock(b))
    }

    public addBlockDataFromBlock(block: IBlockData): void {
        this.addBlockData(block.name, block.content)
    }

    public addBlockData(name: string, content: string): void {
        try {
            this.DATA[name] = JSON.parse(content)
        } catch (e) {
            this.DATA[name] = undefined
            console.error(`Unable to parse JSON from '${name}'`, e)
        }
    }

    public RESOURCES: any[] | undefined = undefined

    public resetResources() {
        this.RESOURCES = undefined
    }

    public abstract setupDOM(canvasElement: JQuery<HTMLElement>, scope: AnyCodeBlockScope): void

    public abstract init(
        canvasElement: JQuery<HTMLElement>,
        scope: AnyCodeBlockScope,
        runner: Runner
    ): void

    public reset(canvasElement: JQuery<HTMLElement>): void {
        this.queuedMessages = []
        this.queuedIncomingMessages = []
        this.lazyInit()
        console.i('MESSAGE - Reset Queue from Reset')
        if (this.obj && this.obj.reset) {
            this.obj.reset(canvasElement)
        }
    }

    public abstract update(
        outputObject: IScriptOutputObject,
        canvasElement: JQuery<HTMLElement>
    ): string | undefined

    public onParseError(initialOutput: string, parseError: string): boolean {
        this.lazyInit()
        if (this.obj === undefined) {
            return false
        }
        try {
            if (this.obj.onParseError) {
                this.obj.onParseError(initialOutput, parseError)
            } else {
                console.error(parseError)
                return false
            }
        } catch (e) {
            this.pushError(e)
            return false
        }
        return true
    }
}
