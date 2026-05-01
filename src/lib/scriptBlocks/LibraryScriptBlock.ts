import { AnyCodeBlockScope, ILibraryObject, IScriptOutputObject } from '../IScriptBlock'
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

    public createInstance(context: Record<string, any>): any {
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
