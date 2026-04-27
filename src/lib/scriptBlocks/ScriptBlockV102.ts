import { AnyCodeBlockScope } from '../IScriptBlock'
import { PlaygroundScriptBlock } from './PlaygroundScriptBlock'
import { ICodeTemplate } from './utils'
import { compileCode, stripModuleSyntax } from './sandbox'
import { SmartScope } from './SmartScope'

const v102CodeTemplate: ICodeTemplate = {
    prefix: 'with(sandbox) { return function(){ return {o:',
    postfix: '}.o}.call({})}',
}

export class ScriptBlockV102 extends PlaygroundScriptBlock {
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
