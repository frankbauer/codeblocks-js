import {
    IPlaygroundObject,
    ILegacyPlaygroundObject,
    IScriptOutputObject,
    Runner,
    AnyCodeBlockScope,
} from '@/lib/IScriptBlock'
import { BaseScriptBlock } from './BaseScriptBlock'
import { ICodeTemplate } from './utils'

const legacyCodeTemplate: ICodeTemplate = {
    prefix: 'let editors=[]; $(".CodeMirror").toArray().forEach(cm =>  {if (!cm.CodeMirror.getTextArea().hasAttribute("is-editmode")) editors[cm.CodeMirror.getTextArea().id] = cm.CodeMirror}); return function(){ return {o:',
    postfix: '}.o}.call({})',
}

export class LegacyScriptBlock extends BaseScriptBlock {
    protected getFallbackObject(): ILegacyPlaygroundObject {
        return {
            init: () => {
                console.error('FAILED INIT ATTEMPT')
            },
            update: () => {
                console.error('FAILED UPDATE ATTEMPT')
                return undefined
            },
        }
    }

    public requestsOriginalVersion(): boolean {
        return true
    }

    public rebuild(code?: string) {
        if (code !== undefined) {
            try {
                this.err = []
                console.i('!!! REBUILDING (Legacy) !!!')
                this.src = code
                this.fkt = new Function(
                    legacyCodeTemplate.prefix + code + legacyCodeTemplate.postfix
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

    public setupDOM(canvasElement: JQuery<HTMLElement>, scope: AnyCodeBlockScope): void {
        // Legacy didn't have setupDOM
    }

    public init(canvasElement: JQuery<HTMLElement>, scope: AnyCodeBlockScope, runner: Runner): void {
        this.lazyInit()
        if (this.obj === undefined) {
            return
        }
        try {
            console.i('!!! INIT CANVAS (original) !!!')
            const o = this.obj as ILegacyPlaygroundObject
            o.init(canvasElement)
        } catch (e) {
            this.pushError(e)
        }
    }

    public update(
        outputObject: IScriptOutputObject,
        canvasElement: JQuery<HTMLElement>
    ): string | undefined {
        this.lazyInit()
        if (this.obj === undefined) {
            return outputObject.output
        }
        try {
            const o = this.obj as ILegacyPlaygroundObject
            if (o.update) {
                if (outputObject.processedOutput.type == 'json') {
                    console.i('!!! UPDATE (org, json) !!!')
                    return o.update(outputObject.processedOutput.json, canvasElement)
                } else {
                    console.i('!!! UPDATE (org, text) !!!')
                    return o.update(outputObject.output, canvasElement)
                }
            }
        } catch (e) {
            this.pushError(e)
        }
        return outputObject.initialOutput
    }
}
