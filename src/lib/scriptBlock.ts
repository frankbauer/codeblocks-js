import 'reflect-metadata'
import { Vue, Component, Prop } from 'vue-property-decorator'
import {
    IParsedError,
    ILegacyPlaygroundObject,
    IPlaygroundObject,
    IProcessedScriptOutput,
    IScriptOutputObject,
    IScriptBlock,
} from '@/lib/IScriptBlock'
import { ICompileAndRunArguments } from './ICompilerRegistry'
interface ICodeTemplate {
    prefix: string
    postfix: string
}

const legacyCodeTemplate: ICodeTemplate = {
    prefix:
        'let editors=[]; $(".CodeMirror").toArray().forEach(cm =>  {if (!cm.CodeMirror.getTextArea().hasAttribute("is-editmode")) editors[cm.CodeMirror.getTextArea().id] = cm.CodeMirror}); return function(){ return {o:',
    postfix: '}.o}.call({})',
}
const v101CodeTemplate: ICodeTemplate = {
    prefix: '"use strict"; return function(){ return {o:',
    postfix: '}.o}.call({})',
}

const jsErrorParser = function (e: any, templ?: ICodeTemplate): IParsedError {
    console.error(e)
    let line: number | undefined = undefined
    let column: number | undefined = undefined
    if (e.line) {
        line = e.line
    } else if (e.lineNumber) {
        line = e.lineNumber
    }

    if (e.column) {
        column = e.column
    } else if (e.columnNumber) {
        column = e.columnNumber
    }

    if (line === undefined) {
        const lines = e.stack.split('\n')
        if (lines.length > 1) {
            const regex = /<anonymous>:(\d+):(\d+)/gm
            let m: RegExpExecArray | null = null
            if ((m = regex.exec(lines[1])) !== null) {
                line = Number(m[1]) - 1
                column = Number(m[2]) - 1
            }
        }
    }

    if (line !== undefined) {
        line--
        if (line == 1) {
            if (column === undefined) {
                column = 0
            }
            if (templ !== undefined) {
                column -= templ.prefix.length
            }
        }
    }
    return { line: line!, column: column!, msg: e.message }
}
Vue.prototype.$jsErrorParser = jsErrorParser

export class ScriptBlock implements IScriptBlock {
    public err: IParsedError[] = []

    private src: string | undefined = undefined
    private fkt: Function | undefined = undefined
    private obj: IPlaygroundObject | ILegacyPlaygroundObject | undefined = undefined

    constructor(script: string, public version: string) {
        this.rebuild(script)
    }

    requestsOriginalVersion() {
        return this.version == '100' || this.version == '' || this.version === undefined
    }

    invalidate() {
        this.obj = undefined
    }

    rebuild(code?: string) {
        if (code !== undefined) {
            try {
                this.err = []
                console.i('!!! REBUILDING !!!')
                this.src = code

                //wrap the users code in a helper object, otherwise
                //evaluating would fail if the code does not start in the first line

                //we also return a function to make and call (.call({})) it with a clean object
                //to ensure that 'this' is will allways be in a defined state inside the users code
                if (this.requestsOriginalVersion()) {
                    this.fkt = new Function(
                        legacyCodeTemplate.prefix + code + legacyCodeTemplate.postfix
                    )
                } else {
                    this.fkt = new Function(
                        v101CodeTemplate.prefix + code + v101CodeTemplate.postfix
                    )
                }
                this.obj = this.fkt()
                this.dequeueIncoming()
            } catch (e) {
                this.pushError(e)
            }
        } else if (this.fkt !== undefined) {
            this.obj = this.fkt()
            this.dequeueIncoming()
        }
    }

    pushError(e: any) {
        this.err.push(jsErrorParser(e))
    }
    addArgumentsTo(args: object | string[]) {
        if (this.obj && !this.requestsOriginalVersion()) {
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

    _runConfig: null | ICompileAndRunArguments = null
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
    queuedMessages: any[] = []
    doPostMessageToWorker(cmd: string, data: any) {
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
    queuedIncomingMessages: any[] = []
    didReceiveMessage(cmd: string, data: any) {
        if (this.obj && !this.requestsOriginalVersion()) {
            const o = this.obj as IPlaygroundObject
            if (o.onMessage === undefined) {
                console.i('MESSAGE - Received to Queue', cmd)
                this.queuedIncomingMessages.push({ c: cmd, d: data })
            } else {
                console.i('MESSAGE - Received', cmd, data)
                o.onMessage(cmd, data)
            }
        } else {
            console.i('MESSAGE - Received to Queue', cmd)
            this.queuedIncomingMessages.push({ c: cmd, d: data })
        }
    }
    dequeueIncoming() {
        console.i('MESSAGE - Dequeue Incoming')
        const msg = [...this.queuedIncomingMessages]
        this.queuedIncomingMessages = []
        msg.forEach((args) => this.didReceiveMessage(args.c, args.d))
    }

    onStart() {
        if (this.obj && !this.requestsOriginalVersion()) {
            const o = this.obj as IPlaygroundObject
            if (o.onStart) {
                console.i('MESSAGE - Sent On Start')
                o.onStart()
            }
        }
    }

    init(canvasElement: JQuery<HTMLElement>, scope: JQuery<HTMLElement>, runner: () => void): void {
        this.queuedMessages = []
        this.queuedIncomingMessages = []
        console.i('MESSAGE - Reset Queue from Init')
        if (this.obj === undefined) {
            return
        }
        try {
            console.i('!!! INIT CANVAS !!!')
            if (this.requestsOriginalVersion()) {
                const o = this.obj as ILegacyPlaygroundObject
                o.init(canvasElement)
            } else {
                runner.run = runner
                runner.postMessage = this.doPostMessageToWorker.bind(this)
                let outputElement: JQuery<HTMLElement> | undefined = undefined
                if (scope === undefined || scope.length === 0) {
                    scope = canvasElement.parents('.codeblocks')
                }
                if (scope !== undefined) {
                    outputElement = scope.find('div.runner pre.output')
                }
                if (outputElement === undefined) {
                    console.error('[Internal Error] No Output Element found!')
                    this.pushError('[Internal Error] No Output Element found!')
                } else {
                    const o = this.obj as IPlaygroundObject
                    o.init(canvasElement, outputElement, scope, runner)
                }
            }
        } catch (e) {
            this.pushError(e)
        }
    }

    reset(canvasElement: JQuery<HTMLElement>): void {
        this.queuedMessages = []
        this.queuedIncomingMessages = []
        console.i('MESSAGE - Reset Queue from Reset')
        if (this.obj && this.obj.reset && !this.requestsOriginalVersion()) {
            this.obj.reset(canvasElement)
        }
    }

    update(
        outputObject: IScriptOutputObject,
        canvasElement: JQuery<HTMLElement>
    ): string | undefined {
        if (this.obj === undefined) {
            return outputObject.output
        }
        try {
            if (this.obj.update) {
                //console.log(this.obj.update.length, outputObject, this.obj);
                //this is the old behaviour
                if (this.obj.update.length == 2 || this.requestsOriginalVersion()) {
                    const o = this.obj as ILegacyPlaygroundObject
                    if (outputObject.processedOutput.type == 'json') {
                        console.i('!!! UPDATE (org, json) !!!')
                        return o.update(outputObject.processedOutput.json, canvasElement)
                    } else {
                        console.i('!!! UPDATE (org, text) !!!')
                        return o.update(outputObject.output, canvasElement)
                    }
                } else {
                    const o = this.obj as IPlaygroundObject
                    console.i('!!! UPDATE (v' + this.version + ')!!!')
                    return o.update(
                        outputObject.processedOutput.text,
                        outputObject.processedOutput.json,
                        canvasElement,
                        outputObject.outputElement
                    )
                }
            }
        } catch (e) {
            this.pushError(e)
        }
        return outputObject.initialOutput
    }

    onParseError(initialOutput: string, parseError: string): boolean {
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
