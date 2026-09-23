import { AnyCodeBlockScope, ICodeEntry, ILibraryObject, IScriptOutputObject } from '../IScriptBlock'
import { BaseScriptBlock } from './BaseScriptBlock'
import { compileCode, stripModuleSyntax } from './sandbox'

const libraryCodeTemplate = {
    prefix: 'with(sandbox) { return function(){ return {o:',
    postfix: '}.o}.call({})}',
}

export class LibraryScriptBlock extends BaseScriptBlock {
    public name: string
    public libraryObject: ILibraryObject | undefined = undefined
    public instance: any = undefined
    public CODE: ICodeEntry[] = []

    // Stable host provided by LibraryBlock.vue; Vue never touches its contents.
    public libraryElementHost: JQuery<HTMLElement> | undefined = undefined
    // The actual container exposed to library code as `this.libraryElement`. Recreated
    // (fresh node, no leftover children/classes/listeners) on every full reinit — see
    // resetLibraryElement() — so setupDOM()/init() never end up adding UI twice.
    public libraryElement: JQuery<HTMLElement> | undefined = undefined

    constructor(script: string, version: string, name: string) {
        super(script, version)
        this.name = name
        if (script && script.trim() !== '{}') {
            this.rebuild(script)
        }
        this.didInit = true
    }

    protected getFallbackObject(): any {
        return undefined
    }

    public requestsOriginalVersion(): boolean {
        return false
    }

    public rebuild(code?: string): void {
        if (code !== undefined) {
            try {
                this.err = []
                this.src = code
                const stripped = stripModuleSyntax(code)
                this.fkt = compileCode(
                    libraryCodeTemplate.prefix + stripped + libraryCodeTemplate.postfix
                )
                this.libraryObject = this.fkt({}) as ILibraryObject
                this.dequeueIncoming()
            } catch (e) {
                this.pushError(e, libraryCodeTemplate)
            }
        } else if (this.fkt !== undefined) {
            this.libraryObject = this.fkt({}) as ILibraryObject
            this.dequeueIncoming()
        }
    }

    // Gives the library a fresh, empty `this.libraryElement` inside its stable host.
    // Must run before createInstance()/create() so the instance never captures a stale node.
    public resetLibraryElement(): void {
        if (!this.libraryElementHost) {
            this.libraryElement = undefined
            return
        }
        this.libraryElementHost.empty()
        this.libraryElement = $('<div></div>')
        this.libraryElementHost.append(this.libraryElement)
    }

    public createInstance(context: Record<string, any>): any {
        if (this.libraryObject) {
            this.libraryObject.libraryElement = this.libraryElement
            this.libraryObject.DATA = this.DATA
            this.libraryObject.CODE = this.CODE
        }
        if (this.libraryObject?.create) {
            try {
                this.instance = this.libraryObject.create(context)
            } catch (e) {
                this.pushError(e)
                this.instance = undefined
            }
        }
        return this.instance
    }

    // These are no-ops — chaining is handled by PlaygroundScriptBlock
    public setupDOM(_canvasElement: JQuery<HTMLElement>, _scope: AnyCodeBlockScope): void {}

    public init(
        _canvasElement: JQuery<HTMLElement>,
        _scope: AnyCodeBlockScope,
        _runner: () => void
    ): void {}

    public update(
        _outputObject: IScriptOutputObject,
        _canvasElement: JQuery<HTMLElement>
    ): string | undefined {
        return undefined
    }
}
