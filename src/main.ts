String.prototype.replaceAll = function(search: string, replacement: string): string {
    var target = this
    return target.replace(new RegExp(search, 'g'), replacement)
}
String.prototype.replaceRec = function(pattern: string | RegExp, replacement: string): string {
    var newstr = this.replace(pattern, replacement)
    if (newstr == this) {
        return newstr
    }
    return newstr.replaceRec(pattern, replacement)
}

console.d = function(...lines) {
    if (process.env.NODE_ENV == 'development') {
        console.debug('[DEBUG]', ...lines)
    }
}

console.i = function(...lines) {
    if (process.env.NODE_ENV == 'development') {
        console.log('[INFO]', ...lines)
    }
}

import Vue from 'vue'
import 'reflect-metadata'
import './plugins/uuid'
import './plugins/quasar'
import './plugins/codemirror'
import './plugins/codeBlocks'
import './plugins/compilerState'
import './plugins/codemirror'
import './plugins/highlight'
import './plugins/tagger'
import './plugins/blocklyEnv'
//remove "noImplicitAny": false from tsconfig when this file goes ts
import { CodeBlocksManager, MountableArray } from './lib/codeBlocksManager'

Vue.config.productionTip = false
CodeBlocksManager.find(document).mount()

window.mountInElement = function(element: any): void {
    Vue.$hljs.$vue.processElements(element)
    Vue.$tagger.processElements(element)
    CodeBlocksManager.find(element).mount()
}

window.mountCodeBlocks = function(scope: HTMLElement | Document | undefined) {
    return CodeBlocksManager.find(scope).mount()
}
