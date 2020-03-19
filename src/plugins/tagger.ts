import 'reflect-metadata'
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import i18n from './i18n'
//!!! make sure to also change the expression in ilias-builder.js !!!
const randomAndTemplateTag = /\{(:|!)([\w]+)}/g

import '../styles/tagger.styl'
import { DirectiveBinding } from 'vue/types/options'
import { IRandomizerSet } from '@/lib/codeBlocksManager'

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
@Component
export default class Tagger extends Vue {
    private className = {
        rnd: 'random-tag-placeholder',
        templ: 'template-tag-placeholder'
    }

    getMarkers(s: string): ITagMarkers[] {
        if (s === undefined || s === null) {
            return []
        }
        let lines = s.split('\n')
        let markers: ITagMarkers[] = []
        let m: RegExpExecArray | null
        for (let i = 0; i < lines.length; i++) {
            let regex = new RegExp(randomAndTemplateTag)

            while ((m = regex.exec(lines[i])) !== null) {
                if (m.index === regex.lastIndex) {
                    regex.lastIndex++
                }

                const marker: ITagMarkers = {
                    start: { line: i, ch: m.index },
                    end: { line: i, ch: regex.lastIndex },
                    type: m[1] == ':' ? 'rnd' : 'templ',
                    name: m[2]
                }
                markers.push(marker)
            }
        }
        return markers
    }
    processElements(scope: Document | HTMLElement | undefined): void {
        let uuid: string = ''
        if (scope === undefined) {
            scope = document
        } else {
            const h = scope as HTMLElement
            if (!h.hasAttribute('uuid')) {
                uuid = this.$uuid.v4()
                h.setAttribute('uuid', uuid)
            } else {
                uuid = h.getAttribute('uuid')!
            }
        }

        const elements = scope.querySelectorAll('[tagged]')
        const calle = () => {
            elements.forEach(el => {
                this.processElement(el as HTMLElement, uuid)
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
            return `<span class="q-mb-xs  tag-mark-start tag-mark-end ${className}" >` + m0 + '</span>'
        })
    }
    hookClick(el: HTMLElement, scopeUUID: string): void {
        let tags = el.querySelectorAll('.' + this.className.templ)
        tags.forEach(inTag => {
            const tag = inTag as HTMLElement
            let name = tag.innerText.replace(randomAndTemplateTag, (m0, m1, m2) => {
                return m2
            })
            tag.onclick = () => {
                this.clickFunction(name, tag, scopeUUID)
            }
        })
    }
    replaceTemplateTag(scope: HTMLElement | Document | undefined, name: string, newValue: string): void {
        if (scope === undefined) {
            scope = document
        }
        let tags = scope.querySelectorAll('.' + this.className.templ)
        tags.forEach(tag => {
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
                const tag = tagSet.values.find(t => t.tag == m2)
                if (tag !== undefined) {
                    return tag.value
                }
                return m0
            }
            return m0
        })
    }
    clickFunction(name: string, tagEl: HTMLElement, scopeUUID: string): void {
        console.log(i18n)
        Vue.prototype.$q
            .dialog({
                title: i18n.t('Tagger.ConfirmRepl'),
                message: i18n.t('Tagger.ConfirmReplMsg', { name: '<span class="template-tag-placeholder-noclick">' + name + '</span>' }),
                html: true,
                persistent: true,
                prompt: {
                    model: '{!' + name + '}',
                    type: 'text' // optional
                },
                ok: {
                    push: true,
                    color: 'negative',
                    icon: 'warning'
                },
                cancel: {
                    push: true,
                    color: 'positive'
                }
            })
            .onOk((data: string) => {
                //this.replaceTemplateTag($(tagEl).parents(".codeblocks").get(0), name, data)
                this.replaceTemplateTag($(`[uuid=${scopeUUID}]`).get(0), name, data)
                console.log(scopeUUID)
                this.$emit('replace-template-tag', {
                    name: name,
                    newValue: data,
                    scopeUUID: scopeUUID
                })
            })
            .onCancel(() => {})
            .onDismiss(() => {
                const me = self as any
                me.highlighted = false
            })
    }
}

Vue.directive('tagged', {
    //deep: true,
    bind: function(el: HTMLElement, binding: DirectiveBinding) {
        Vue.$tagger.processElement(el, binding.value)
    },
    componentUpdated: function(el: HTMLElement, binding: DirectiveBinding) {
        //console.log("DIRECTIVE - update", el, binding)
        Vue.$tagger.processElement(el, binding.value)
    }
})

Vue.$tagger = new Tagger()
