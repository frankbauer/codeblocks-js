import { l } from './i18n'

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
import { randomAndTemplateTag, TAG_CLASS_NAMES } from './tagHighlighter'

type TaggerEvents = {
    'replace-template-tag': ITagReplaceAction
}
export default class Tagger {
    private readonly emitter = mitt<TaggerEvents>()
    public readonly className = TAG_CLASS_NAMES

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
    }

    processString(str: string, scopeUUID: string): string {
        return str.replace(randomAndTemplateTag, (m0, m1, m2) => {
            const className = m1 === ':' ? this.className.rnd : this.className.templ
            return (
                `<span class='q-mb-xs  tag-mark-start tag-mark-end ${className}' >` + m0 + '</span>'
            )
        })
    }

    replaceTemplateTag(
        scope: HTMLElement | Document | undefined,
        name: string,
        newValue: string
    ): void {
        // if (scope === undefined) {
        //     scope = document
        // }
        // const tags = scope.querySelectorAll('.' + this.className.templ)
        // tags.forEach((tag) => {
        //     tag.innerHTML = this.replaceTemplateTagInString(tag.innerHTML, name, newValue)
        // })
    }

    replaceTemplateTagInString(str: string, name: string, newValue: string): string {
        return str;
        // return str.replace(randomAndTemplateTag, (m0, m1, m2) => {
        //     if (m1 == '!' && m2 == name) {
        //         return newValue
        //     }
        //     return m0
        // })
    }

    replaceRandomTagsInString(str: string, tagSet: IRandomizerSet): string {
        console.log('replaceRandomTagsInString', str, tagSet)
        return str.replace(randomAndTemplateTag, (m0, m1, m2) => {
            console.log('replaceRandomTagsInString', m0, m1, m2 )
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

    onReplaceTemplateTag(handler: (ITagReplaceAction) => void) {
        //this.emitter.on('replace-template-tag', handler)
    }

    offReplaceTemplateTag(handler: (ITagReplaceAction) => void) {
        //this.emitter.off('replace-template-tag', handler)
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
