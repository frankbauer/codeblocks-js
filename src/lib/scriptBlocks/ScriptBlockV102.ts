import {
    AnyCodeBlockScope,
    ICodeBlockScope,
    ILibraryObject,
    IPlaygroundObject,
    IPlaygroundObjectV102,
    IScriptOutputObject,
    Runner,
} from '../IScriptBlock'
import { PlaygroundScriptBlock } from './PlaygroundScriptBlock'
import { ICodeTemplate } from './utils'
import { compileCode, stripModuleSyntax } from './sandbox'
import { SmartScope } from './SmartScope'
import { IBlockData, KnownBlockTypes } from '../ICodeBlocks'
import { LibraryScriptBlock } from './LibraryScriptBlock'

const v102CodeTemplate: ICodeTemplate = {
    prefix: 'with(sandbox) { return function(){ return {o:',
    postfix: '}.o}.call({})}',
}

export class ScriptBlockV102 extends PlaygroundScriptBlock {
    protected activeLibraryKeys: Set<string> = new Set()

    private _domCtx:
        | {
              canvasElement: JQuery<HTMLElement>
              outputElement: JQuery<HTMLElement> | undefined
              scope: ICodeBlockScope
              runner: Runner | undefined
          }
        | undefined

    public override setupDOM(canvasElement: JQuery<HTMLElement>, scope: AnyCodeBlockScope): void {
        const { outputElement, smartScope } = this.getScopeAndOutput(canvasElement, scope)
        this._domCtx = {
            canvasElement,
            outputElement,
            scope: smartScope as ICodeBlockScope,
            runner: undefined,
        }
        super.setupDOM(canvasElement, scope)
    }

    protected override _runInit(
        canvasElement: JQuery<HTMLElement>,
        scope: AnyCodeBlockScope,
        runner: Runner
    ): void {
        const { outputElement, smartScope } = this.getScopeAndOutput(canvasElement, scope)
        this._domCtx = {
            canvasElement,
            outputElement,
            scope: smartScope as ICodeBlockScope,
            runner,
        }
        super._runInit(canvasElement, scope, runner)
    }

    public override update(
        outputObject: IScriptOutputObject,
        canvasElement: JQuery<HTMLElement>
    ): string | undefined {
        if (this._domCtx) {
            this._domCtx.canvasElement = canvasElement
            this._domCtx.outputElement = outputObject.outputElement
        }
        return super.update(outputObject, canvasElement)
    }

    public override reset(canvasElement: JQuery<HTMLElement>): void {
        if (this._domCtx) {
            this._domCtx.canvasElement = canvasElement
        }
        super.reset(canvasElement)
    }

    protected override prepareLibraryObject(lib: LibraryScriptBlock): void {
        if (!this._domCtx || !lib.libraryObject) {
            return
        }
        const l = lib.libraryObject as unknown as ILibraryObject
        l.canvasElement = this._domCtx.canvasElement
        l.outputElement = this._domCtx.outputElement
        l.scope = this._domCtx.scope
        l.runner = this._domCtx.runner
    }

    public override resetBlockData(blocks: IBlockData[] | undefined): void {
        // console.i('Resetting block data for v102, new blocks:', blocks)
        // Clear only previous library instances from sandbox to preserve system utilities (console, etc.)
        this.activeLibraryKeys.forEach((key) => {
            delete this.sandbox[key]
        })
        this.activeLibraryKeys.clear()

        super.resetBlockData(blocks)

        if (!blocks) {
            return
        }

        const playgroundId = blocks.find((b) => b.obj === this)?.id ?? Infinity

        const libraryBlocks = blocks
            .filter(
                (b): b is IBlockData & { obj: LibraryScriptBlock } =>
                    b.type === KnownBlockTypes.LIBRARY && b.obj instanceof LibraryScriptBlock
            )
            .sort((a, b) => a.id - b.id)

        // Drop old instances from library blocks
        for (const lib of libraryBlocks) {
            lib.obj.instance = undefined
        }

        console.i(
            'Processing block data for v102, new blocks:',
            blocks,
            libraryBlocks,
            'playgroundId:',
            playgroundId
        )

        this.librariesBefore = libraryBlocks.filter((b) => b.id < playgroundId).map((b) => b.obj)
        this.librariesAfter = libraryBlocks.filter((b) => b.id > playgroundId).map((b) => b.obj)

        // Create library instances in execution order; each sees previously created instances
        const context: Record<string, any> = {}

        // Inject Data into context so libraries can use it too
        for (const key in this.DATA) {
            if (Object.prototype.hasOwnProperty.call(this.DATA, key)) {
                context[key] = this.DATA[key]
                this.activeLibraryKeys.add(key)
            }
        }

        for (const lib of libraryBlocks) {
            console.log('Creating library instance for', lib.name, lib)
            const instance = lib.obj.createInstance(context)
            if (lib.name && instance !== undefined) {
                context[lib.name] = instance
                this.activeLibraryKeys.add(lib.name)
            }
        }

        // Inject instances into sandbox — the with(sandbox) proxy reads at call time,
        // so playground code like `chart.render()` will resolve correctly
        Object.assign(this.sandbox, context)
    }
    protected override callObjSetupDOM(
        o: IPlaygroundObject,
        canvasElement: JQuery<HTMLElement>,
        outputElement: JQuery<HTMLElement> | undefined,
        scope: AnyCodeBlockScope
    ): void {
        //console.i('Calling setupDOM for v102 object', o)
        const v = o as unknown as IPlaygroundObjectV102
        v.canvasElement = canvasElement
        v.outputElement = outputElement
        v.scope = scope as ICodeBlockScope
        v.setupDOM?.()
    }

    protected override callObjInit(
        o: IPlaygroundObject,
        canvasElement: JQuery<HTMLElement>,
        outputElement: JQuery<HTMLElement>,
        scope: AnyCodeBlockScope,
        runner: Runner
    ): void {
        //console.i('Calling init for v102 object', o)
        const v = o as unknown as IPlaygroundObjectV102
        v.canvasElement = canvasElement
        v.outputElement = outputElement
        v.scope = scope as ICodeBlockScope
        v.runner = runner
        v.init()
    }

    protected override callObjUpdate(
        o: IPlaygroundObject,
        txt: string,
        json: object | undefined,
        canvasElement: JQuery<HTMLElement>,
        outputElement: JQuery<HTMLElement>
    ): string | undefined {
        const v = o as unknown as IPlaygroundObjectV102
        v.canvasElement = canvasElement
        v.outputElement = outputElement
        return v.update(txt, json)
    }

    protected override callObjReset(
        o: IPlaygroundObject,
        canvasElement: JQuery<HTMLElement>
    ): void {
        const v = o as unknown as IPlaygroundObjectV102
        v.canvasElement = canvasElement
        v.reset?.()
    }

    public rebuild(code?: string) {
        if (code !== undefined) {
            try {
                this.err = []
                console.i('!!! REBUILDING (v102) !!!')
                this.src = code
                this.fkt = compileCode(
                    v102CodeTemplate.prefix + stripModuleSyntax(code) + v102CodeTemplate.postfix
                )
                this.obj = this.fkt(this.sandbox)
                this.dequeueIncoming()
            } catch (e) {
                this.pushError(e, v102CodeTemplate)
            }
        } else if (this.fkt !== undefined) {
            console.i('!!! REBUILDING (v102, fkt) !!!')
            this.obj = this.fkt(this.sandbox)
            this.dequeueIncoming()
        }
    }

    protected getScopeAndOutput(
        canvasElement: JQuery<HTMLElement>,
        scope: AnyCodeBlockScope
    ): { outputElement: JQuery<HTMLElement> | undefined; smartScope: AnyCodeBlockScope } {
        let localScope = canvasElement.parents('.codeblocks')

        const smartScope = new SmartScope(localScope, scope as JQuery<HTMLElement>)

        let outputElement: JQuery<HTMLElement> | undefined = undefined
        if (smartScope !== undefined) {
            outputElement = smartScope.find('div.runner pre.output')
        }

        return { outputElement, smartScope }
    }

    public override onASTAvailable(ast: any) {
        this.librariesBefore.forEach((lib) => lib.libraryObject?.onASTAvailable?.(ast))
        this.lazyInit()
        if (this.obj) {
            const o = this.obj as unknown as IPlaygroundObjectV102
            if (o.onASTAvailable) {
                try {
                    o.onASTAvailable(ast)
                } catch (e) {
                    this.pushError(e)
                }
            }
        }
        this.librariesAfter.forEach((lib) => lib.libraryObject?.onASTAvailable?.(ast))
    }

    public afterStop() {
        super.afterStop()
        this.chainLibraries(this.librariesBefore, (lib) => lib.libraryObject?.afterStop?.())
        this.lazyInit()
        if (this.obj) {
            const o = this.obj as IPlaygroundObjectV102
            if (o.afterStop) {
                console.i('MESSAGE - afterStop')
                o.afterStop()
            }
        }
        this.chainLibraries(this.librariesAfter, (lib) => lib.libraryObject?.afterStop?.())
    }
}
