import './assets/css/fonts.css'
import './assets/css/main.css'
import './assets/css/loader.css'
import '@/styles/app.scss'
import '@/styles/shadcn.css'
import '@/styles/overlay.scss'
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
import './plugins/codemirror'
import './plugins/codeBlocks'
import './plugins/compilerState'
import './plugins/codemirror'
import './plugins/highlight'
import './plugins/tagger'
import './plugins/icon'
import { CodeBlocksManager } from './lib/codeBlocksManager'
import { highlight } from '@/plugins/highlight'
import { findApp } from '@/storage/blockStorage'
import { type CodeBlocksOverlay, validateOverlay } from '@/lib/overlay'

type OverlayTarget = HTMLElement | string | number

function overlayApp(target: OverlayTarget) {
    const app = findApp(target)
    if (!app) {
        console.warn('[codeblocks overlay] no mounted codeblocks app found for', target)
    }
    return app
}

window.codeblocks = {
    scale: 1.0,
    mountInElement: function (element: Document | HTMLElement): void {
        console.log('mounting in element', element)
        highlight.$vue.processElements(element)
        tagger.processElements(element)
        CodeBlocksManager.find(element).mount()
    },
    mountInScope: function (scope: HTMLElement | Document | undefined) {
        return CodeBlocksManager.find(scope).mount()
    },
    loadAndMount: async function () {
        return CodeBlocksManager.loadAndMount()
    },
    loadAndMountInElement: async function (element: Document | HTMLElement) {
        return CodeBlocksManager.loadAndMountInElement(element)
    },
    loadAndMountInScope: async function (scope: HTMLElement | Document | undefined) {
        return CodeBlocksManager.loadAndMountInScope(scope)
    },
    /** replaces the overlay of one app (host element, element inside it, uuid or question id) */
    setOverlay: function (target: OverlayTarget, overlay: CodeBlocksOverlay): boolean {
        const app = overlayApp(target)
        if (!app || !validateOverlay(overlay)) {
            return false
        }
        // a copy, so later changes on the caller's object have no effect
        app.overlay = JSON.parse(JSON.stringify(overlay))
        app.overlayRevision++
        return true
    },
    clearOverlay: function (target: OverlayTarget): void {
        const app = overlayApp(target)
        if (app) {
            app.overlay = {}
            app.overlayRevision++
        }
    },
    getOverlay: function (target: OverlayTarget): CodeBlocksOverlay | undefined {
        const app = overlayApp(target)
        return app ? JSON.parse(JSON.stringify(app.overlay)) : undefined
    },
    /** re-applies the element overlays, e.g. after a script rendered asynchronously */
    refreshOverlay: function (target: OverlayTarget): void {
        const app = overlayApp(target)
        if (app) {
            app.overlayRevision++
        }
    },
}

window.dispatchEvent(new CustomEvent('codeblocks:ready', { detail: window.codeblocks }))

window.mountInElement = function (element: any): void {
    console.error('mountInElement is deprecated, please use codeblocks.mountInElement instead')
    window.codeblocks.mountInElement(element)
}

window.mountCodeBlocks = function (scope: HTMLElement | Document | undefined) {
    console.error('mountCodeBlocks is deprecated, please use codeblocks.mountInScope instead')
    window.codeblocks.mountInScope(scope)
}

CodeBlocksManager.loadAndMount().then(() => {
    window.dispatchEvent(new CustomEvent('codeblocks:mounted', { detail: window.codeblocks }))
})
