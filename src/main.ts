import { tagger } from '@/plugins/tagger'

String.prototype.replaceAllPoly = function (search: string, replacement: string): string {
    const target = this
    return target.replace(new RegExp(search, 'g'), replacement)
}
String.prototype.replaceRec = function (pattern: string | RegExp, replacement: string): string {
    const newstr = this.replace(pattern, replacement)
    if (newstr == this) {
        return newstr
    }
    return newstr.replaceRec(pattern, replacement)
}

console.d = function (...lines) {
    //if (process.env.NODE_ENV == 'development') {
    console.log('[DEBUG]', ...lines)
    //}
}

console.i = function (...lines) {
    //if (process.env.NODE_ENV == 'development') {
    console.log('[INFO]', ...lines)
    //}
}

import './plugins/uuid'
import './plugins/quasar'
import './plugins/codemirror'
import './plugins/codeBlocks'
import './plugins/compilerState'
import './plugins/codemirror'
import './plugins/highlight'
import './plugins/tagger'
import { CodeBlocksManager } from './lib/codeBlocksManager'
import { highlight } from '@/plugins/highlight'

window.codeblocks = {
    scale: 1.0,
    mountInElement: function (element: Document | HTMLElement): void {
        highlight.$vue.processElements(element)
        tagger.processElements(element)
        CodeBlocksManager.find(element).mount()
    },
    mountInScope: function (scope: HTMLElement | Document | undefined) {
        return CodeBlocksManager.find(scope).mount()
    },
}

window.mountInElement = function (element: any): void {
    console.error('mountInElement is deprecated, please use codeblocks.mountInElement instead')
    window.codeblocks.mountInElement(element)
}

window.mountCodeBlocks = function (scope: HTMLElement | Document | undefined) {
    console.error('mountCodeBlocks is deprecated, please use codeblocks.mountInScope instead')
    window.codeblocks.mountInScope(scope)
}

CodeBlocksManager.find(document).mount()
