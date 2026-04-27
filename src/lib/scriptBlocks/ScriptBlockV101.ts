import { AnyCodeBlockScope } from '../IScriptBlock'
import { PlaygroundScriptBlock } from './PlaygroundScriptBlock'
import { ICodeTemplate } from './utils'

const v101CodeTemplate: ICodeTemplate = {
    prefix: '"use strict"; return function(){ const module={}; return {o:',
    postfix: '}.o}.call({})',
}

export class ScriptBlockV101 extends PlaygroundScriptBlock {
    public rebuild(code?: string) {
        if (code !== undefined) {
            try {
                this.err = []
                console.i('!!! REBUILDING (v101) !!!')
                this.src = code
                this.fkt = new Function(
                    v101CodeTemplate.prefix + code + v101CodeTemplate.postfix
                )
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

    protected getScopeAndOutput(
        canvasElement: JQuery<HTMLElement>,
        scope: AnyCodeBlockScope
    ): { outputElement: JQuery<HTMLElement> | undefined; smartScope: AnyCodeBlockScope } {
        let finalScope = scope as JQuery<HTMLElement>
        if (finalScope === undefined || finalScope.length === 0) {
            finalScope = canvasElement.parents('.codeblocks')
        }

        let outputElement: JQuery<HTMLElement> | undefined = undefined
        if (finalScope !== undefined && finalScope.length > 0) {
            outputElement = finalScope.find('div.runner pre.output')
        }

        return { outputElement, smartScope: finalScope }
    }
}
