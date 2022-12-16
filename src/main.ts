import { CodeBlocksGlobal } from '@/lib/global';
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
    if (process.env.NODE_ENV == 'development') {
        console.debug('[DEBUG]', ...lines)
    }
}

console.i = function (...lines) {
    if (process.env.NODE_ENV == 'development') {
        console.log('[INFO]', ...lines)
    }
}

import Vue from 'vue'
import 'reflect-metadata'
import './plugins/quasar'
import './plugins/codeBlocks'
import './plugins/compilerState'
import './plugins/codemirror'

//import './plugins/blocklyEnv'
//remove "noImplicitAny": false from tsconfig when this file goes ts
import { CodeBlocksManager } from './lib/codeBlocksManager'

CodeBlocksManager.find(document).mount()

window.codeblocks = {
    scale: 1.0,
}

window.mountInElement = function (element: any): void {
    CodeBlocksGlobal.$hljs.$vue.processElements(element)
    CodeBlocksGlobal.$tagger.processElements(element)
    CodeBlocksManager.find(element).mount()
}

window.mountCodeBlocks = function (scope: HTMLElement | Document | undefined) {
    return CodeBlocksManager.find(scope).mount()
}
