import Vue from 'vue'
import { l } from './i18n'
//!!! make sure to also change the expression in ilias-builder.js !!!
const randomAndTemplateTag = /\{(:|!)([\w]*)}/g
import { uuid } from 'vue-uuid'
import '../styles/tagger.styl'
import { IRandomizerSet } from '@/lib/ICodeBlocks'

export interface ITagReplaceAction {
    name: string
    newValue: string
    scopeUUID: string
}

export interface ITagMarkers {
    start: { line: number; ch: number }
    end: { line: number; ch: number }
    type: 'rnd' | 'templ'
    name: string
}

import mitt from 'mitt'

type TaggerEvents = {
    'replace-template-tag': ITagReplaceAction
}
export default class Tagger {
    private readonly emitter = mitt<TaggerEvents>()
    public readonly className = {
        rnd: 'random-tag-placeholder',
        templ: 'template-tag-placeholder',
    }

    getMarkers(s: string | null): ITagMarkers[] {
        if (s === undefined || s === null) {
            return []
        }
        const lines = s.split('\n')
        const markers: ITagMarkers[] = []
        let m: RegExpExecArray | null
        for (let i = 0; i < lines.length; i++) {
            const regex = new RegExp(randomAndTemplateTag)

            while ((m = regex.exec(lines[i])) !== null) {
                if (m.index === regex.lastIndex) {
                    regex.lastIndex++
                }

                const marker: ITagMarkers = {
                    start: { line: i, ch: m.index },
                    end: { line: i, ch: regex.lastIndex },
                    type: m[1] == ':' ? 'rnd' : 'templ',
                    name: m[2],
                }
                markers.push(marker)
            }
        }
        return markers
    }

    processElements(scope: Document | HTMLElement | undefined): void {
        let my_uuid: string = ''
        if (scope === undefined) {
            scope = document
        } else {
            const h = scope as HTMLElement
            if (!h.hasAttribute('uuid')) {
                my_uuid = uuid.v4()
                h.setAttribute('uuid', my_uuid)
            } else {
                my_uuid = h.getAttribute('uuid')!
            }
        }

        const elements = scope.querySelectorAll('[tagged]')
        const calle = () => {
            elements.forEach((el) => {
                this.processElement(el as HTMLElement, my_uuid)
            })
        }
        if (window.MathJax === undefined) {
            calle()
        } else {
            MathJax.Hub.Register.StartupHook('End', calle)
        }
    }

    processElement(el: HTMLElement, scopeUUID: string): void {
        el.innerHTML = this.processString(el.innerHTML, scopeUUID)
        this.hookClick(el, scopeUUID)
    }

    processString(str: string, scopeUUID: string): string {
        return str.replace(randomAndTemplateTag, (m0, m1, m2) => {
            const className = m1 === ':' ? this.className.rnd : this.className.templ
            return (
                `<span class='q-mb-xs  tag-mark-start tag-mark-end ${className}' >` + m0 + '</span>'
            )
        })
    }

    hookClick(el: HTMLElement, scopeUUID: string | undefined): void {
        const tags = el.querySelectorAll('.' + this.className.templ)
        tags.forEach((inTag) => {
            const tag = inTag as HTMLElement
            const name = tag.innerText.replace(randomAndTemplateTag, (m0, m1, m2) => {
                return m2
            })
            tag.onclick = () => {
                this.clickFunction(name, tag, scopeUUID)
            }
        })
    }

    replaceTemplateTag(
        scope: HTMLElement | Document | undefined,
        name: string,
        newValue: string
    ): void {
        if (scope === undefined) {
            scope = document
        }
        const tags = scope.querySelectorAll('.' + this.className.templ)
        tags.forEach((tag) => {
            tag.innerHTML = this.replaceTemplateTagInString(tag.innerHTML, name, newValue)
        })
    }

    replaceTemplateTagInString(str: string, name: string, newValue: string): string {
        return str.replace(randomAndTemplateTag, (m0, m1, m2) => {
            if (m1 == '!' && m2 == name) {
                return newValue
            }
            return m0
        })
    }

    replaceRandomTagsInString(str: string, tagSet: IRandomizerSet): string {
        return str.replace(randomAndTemplateTag, (m0, m1, m2) => {
            if (m1 == ':') {
                const tag = tagSet.values.find((t) => t.tag == m2)
                if (tag !== undefined) {
                    return tag.value
                }
                return m0
            }
            return m0
        })
    }

    clickFunction(name: string, tagEl: HTMLElement, scopeUUID: string | undefined): void {
        //console.log(i18n)
        // Vue.$q
        //     .dialog({
        //         title: l('Tagger.ConfirmRepl'),
        //         message: l('Tagger.ConfirmReplMsg', [
        //             '<span class="template-tag-placeholder-noclick">' + name + '</span>',
        //         ]),
        //         html: true,
        //         persistent: true,
        //         prompt: {
        //             model: '{!' + name + '}',
        //             type: 'text', // optional
        //         },
        //         ok: {
        //             push: true,
        //             color: 'negative',
        //             icon: 'warning',
        //         },
        //         cancel: {
        //             push: true,
        //             color: 'positive',
        //         },
        //     })
        //     .onOk((data: string) => {
        //         if (scopeUUID !== undefined) {
        //             //this.replaceTemplateTag($(tagEl).parents(".codeblocks").get(0), name, data)
        //             this.replaceTemplateTag($(`[uuid=${scopeUUID}]`).get(0), name, data)
        //             const eventData: ITagReplaceAction = {
        //                 name: name,
        //                 newValue: data,
        //                 scopeUUID: scopeUUID,
        //             }
        //             this.emitter.emit('replace-template-tag', eventData)
        //         }
        //     })
        //     .onCancel(() => {})
        //     .onDismiss(() => {
        //         const me = self as any
        //         me.highlighted = false
        //     })
    }

    onReplaceTemplateTag(handler: (ITagReplaceAction) => void) {
        this.emitter.on('replace-template-tag', handler)
    }

    offReplaceTemplateTag(handler: (ITagReplaceAction) => void) {
        this.emitter.off('replace-template-tag', handler)
    }
}

export const tagger = new Tagger()

export const taggedDirective = {
    //deep: true,
    beforeMount: function (el: HTMLElement, binding: any, vnode: any) {
        tagger.processElement(el, binding.value)
    },
    updated: function (el: HTMLElement, binding: any, vnode: any) {
        //console.log("DIRECTIVE - update", el, binding)
        tagger.processElement(el, binding.value)
    },
}
