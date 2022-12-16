import { GlobalState } from './../plugins/codeBlocks'
import { i18n } from './../plugins/i18n'
import { ErrorSeverity } from './ICompilerRegistry'
import { GlobalEvents, GlobalEvent } from './events'

export class CodeBlocksGlobal {
    static $l: (key: string, values?: any[]) => string = (key: string, values?: any[]): string => {
        const res = i18n.global.t(key, values)
        return res.toString()
    }
    static $hljs: any = undefined
    static $tagger: any = undefined
    static $CodeBlock: any = new GlobalState()
    static $SEVERITY_ERROR: number = ErrorSeverity.Error
    static $SEVERITY_WARNING: number = ErrorSeverity.Warning
    static $GlobalEventHub: GlobalEvent = new GlobalEvent()
}
