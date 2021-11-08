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
import compilerRegistry from './CompilerRegistry'
interface ICodeTemplate {
    prefix: string
    postfix: string
}

const legacyCodeTemplate: ICodeTemplate = {
    prefix: 'let editors=[]; $(".CodeMirror").toArray().forEach(cm =>  {if (!cm.CodeMirror.getTextArea().hasAttribute("is-editmode")) editors[cm.CodeMirror.getTextArea().id] = cm.CodeMirror}); return function(){ return {o:',
    postfix: '}.o}.call({})',
}
const v101CodeTemplate: ICodeTemplate = {
    prefix: '"use strict"; return function(){ return {o:',
    postfix: '}.o}.call({})',
}
const v102CodeTemplate: ICodeTemplate = {
    prefix: 'with(sandbox) { return function(){ return {o:',
    postfix: '}.o}.call({})}',
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

const sandboxProxies = new WeakMap()

function compileCode(src: string) {
    const code = new Function('sandbox', src)

    return function (sandbox: any) {
        compilerRegistry.addLoadedToSandbox(sandbox)

        sandbox.$ = (input: any) => {
            if (typeof input === 'string') {
                console.error('You can not use JQuerry globally from this context')
            } else {
                if (input.getAttribute === undefined) {
                    console.error('You may only wrap DOMElements using $')
                    return
                }
                return $(input)
            }
        }
        sandbox.console = console
        sandbox.document = {
            create$: (what: any) => $(document.createElement(what)),
            createElement: (what: any) => document.createElement(what),
            getElementById: (id: String) =>
                console.error(
                    `document.getElementById is not supported. Please use scope.find('#${id}') instead`
                ),
            getElementsByTagName: (tag: String) =>
                console.error(
                    `document.getElementsByTagName is not supported. Please use scope.find('${tag}') instead`
                ),
            getElementsByClassName: (cl: String) =>
                console.error(
                    `document.getElementsByClassName is not supported. Please use scope.find('.${cl}') instead`
                ),
        }

        if (!sandboxProxies.has(sandbox)) {
            const sandboxProxy = new Proxy(sandbox, { has, get })
            sandboxProxies.set(sandbox, sandboxProxy)
        }
        return code(sandboxProxies.get(sandbox))
    }
}

function has(target: any, key: any) {
    return true
}

function get(target: any, key: any) {
    if (key === Symbol.unscopables) {
        return undefined
    }
    return target[key]
}

export class ScriptBlock implements IScriptBlock {
    public err: IParsedError[] = []

    private src: string | undefined = undefined
    private fkt: Function | undefined = undefined
    private obj: IPlaygroundObject | ILegacyPlaygroundObject | undefined = undefined
    private didInit: boolean = false
    constructor(script: string, public version: string) {
        //this.rebuild(script)
        this.didInit = false
        this.src = script
        this.obj = {
            init: () => {
                console.error('FAILED INIT ATTEMPT')
            },
            update: () => {
                console.error('FAILED UPDATE ATTEMPT')
                return undefined
            },
        }
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
                } else if (this.version === '101' || this.version === '102') {
                    this.fkt = new Function(
                        v101CodeTemplate.prefix + code + v101CodeTemplate.postfix
                    )
                } else {
                    this.fkt = compileCode(
                        v102CodeTemplate.prefix + code + v102CodeTemplate.postfix
                    )
                }

                this.obj = this.fkt({})
                this.dequeueIncoming()
            } catch (e) {
                this.pushError(e)
            }
        } else if (this.fkt !== undefined) {
            this.obj = this.fkt({})
            this.dequeueIncoming()
        }
    }

    pushError(e: any) {
        this.err.push(jsErrorParser(e))
    }

    private lazyInit() {
        if (!this.didInit) {
            this.obj = undefined
            this.rebuild(this.src)
            this.didInit = true
        }
    }

    addArgumentsTo(args: object | string[]) {
        this.lazyInit()
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
        this.lazyInit()
        if (this.obj && !this.requestsOriginalVersion()) {
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
    dequeueIncoming() {
        console.i('MESSAGE - Dequeue Incoming')
        const msg = [...this.queuedIncomingMessages]
        this.queuedIncomingMessages = []
        msg.forEach((args) => this.didReceiveMessage(args.c, args.d))
    }

    beforeStart() {
        this.lazyInit()
        if (this.obj && !this.requestsOriginalVersion()) {
            const o = this.obj as IPlaygroundObject
            if (o.beforeStart) {
                console.i('MESSAGE - beforeStart')
                o.beforeStart()
            }
        }
    }

    whenFinished(args: string[] | object, resultData?: object | any[]) {
        this.lazyInit()
        if (this.obj && !this.requestsOriginalVersion()) {
            const o = this.obj as IPlaygroundObject
            if (o.whenFinished) {
                console.i('MESSAGE - whenFinished')
                o.whenFinished(args, resultData)
            }
        }
    }

    init(canvasElement: JQuery<HTMLElement>, scope: JQuery<HTMLElement>, runner: () => void): void {
        this.queuedMessages = []
        this.queuedIncomingMessages = []
        this.lazyInit()
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
                const arunner: any = runner
                arunner.run = runner
                arunner.postMessage = this.doPostMessageToWorker.bind(this)

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
        this.lazyInit()
        console.i('MESSAGE - Reset Queue from Reset')
        if (this.obj && this.obj.reset && !this.requestsOriginalVersion()) {
            this.obj.reset(canvasElement)
        }
    }

    update(
        outputObject: IScriptOutputObject,
        canvasElement: JQuery<HTMLElement>
    ): string | undefined {
        this.lazyInit()
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
