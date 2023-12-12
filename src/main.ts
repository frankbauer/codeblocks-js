import Vue from 'vue'
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
//import './plugins/blocklyEnv'
//remove "noImplicitAny": false from tsconfig when this file goes ts
import { CodeBlocksManager } from './lib/codeBlocksManager'
import { highlight } from '@/plugins/highlight'

console.log('main.ts', Vue)
CodeBlocksManager.find(document).mount()

window.codeblocks = {
    scale: 1.0,
}

window.mountInElement = function (element: any): void {
    highlight.$vue.processElements(element)
    tagger.processElements(element)
    CodeBlocksManager.find(element).mount()
}

window.mountCodeBlocks = function (scope: HTMLElement | Document | undefined) {
    return CodeBlocksManager.find(scope).mount()
}
