import { AnyCodeBlockScope } from '../IScriptBlock'
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


    public override resetBlockData(blocks: IBlockData[] | undefined): void {
            // Clear only previous library instances from sandbox to preserve system utilities (console, etc.)
            this.activeLibraryKeys.forEach((key) => {
                delete this.sandbox[key]
            })
            this.activeLibraryKeys.clear()  

            super.resetBlockData(blocks)
            
            if (!blocks) return
    
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
    
            this.librariesBefore = libraryBlocks
                .filter((b) => b.id < playgroundId)
                .map((b) => b.obj)
            this.librariesAfter = libraryBlocks
                .filter((b) => b.id > playgroundId)
                .map((b) => b.obj)
    
            // Create library instances in execution order; each sees previously created instances
            const context: Record<string, any> = {}
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
                this.pushError(e)
            }
        } else if (this.fkt !== undefined) {
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
}
