import Vue from 'vue'
import hljs from 'highlight.js/lib/core'
//import 'highlight.js/styles/ocean.css'
import 'highlight.js/styles/tomorrow.css'
import '../styles/highlight.styl'

hljs.configure({ useBR: false })

import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import css from 'highlight.js/lib/languages/css'
import fortran from 'highlight.js/lib/languages/fortran'
import glsl from 'highlight.js/lib/languages/glsl'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import perl from 'highlight.js/lib/languages/perl'
import php from 'highlight.js/lib/languages/php'
import python from 'highlight.js/lib/languages/python'
import r from 'highlight.js/lib/languages/r'

hljs.registerLanguage('c', cpp)
hljs.registerLanguage('c++', cpp)
hljs.registerLanguage('c#', csharp)
hljs.registerLanguage('css', css)
hljs.registerLanguage('fortran', fortran)
hljs.registerLanguage('glsl', glsl)
hljs.registerLanguage('java', java)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('perl', perl)
hljs.registerLanguage('php', php)
hljs.registerLanguage('python', python)
hljs.registerLanguage('r', r)

const reg_hl = /(\[hl\]|\[hl\s+language="?(.*?)"?\])(.*?)(\[\/hl\])/gm
const reg_code = /(\[code\]|\[code\s+language="?(.*?)"?\])([\s\S]*?)(\[\/code\])/gm

hljs.$vue = {
    processElements: function (
        scope: Document | HTMLElement | undefined,
        inLang: string | undefined
    ) {
        if (scope === undefined) {
            scope = document
        }
        const elements = scope.querySelectorAll('[highlight]')
        elements.forEach((el) => {
            if (inLang === undefined && el.hasAttribute('highlight')) {
                const lang = el.getAttribute('highlight')
                inLang = lang === null ? undefined : lang
            }
            this.processElement(el, inLang)
        })
    },
    /////The Folowing Code will not replace tags on a string level as this will
    /////destroy attached objects in the DOM but aims to replace the strings in
    /////TextNodes only. Changes ar recorded in the q and applied once all nodes
    /////Were visited. This is probably a lot slower than the pure string version
    // processTextElement: function(el, inLang, q){
    //     let txt = el.textContent.replace(reg_hl, function(m1, m2, m3, m4, m5){
    //         const lang = m3===undefined?inLang:m3;
    //         //console.log("m1", m1, "m2", m2, "m3", m3, "m4", m4, "m5", m5, "in", inLang, "res", lang)
    //         if (lang) return '<span is-code>'+hljs.highlight(lang, m4).value + '</span>';
    //         else return '<span is-code>'+hljs.highlightAuto(m4).value + '</span>';
    //     });

    //     txt = txt.replace(reg_code, function(m1, m2, m3, m4, m5){
    //         const lang = m3===undefined?inLang:m3;
    //         m4 = m4.replace(/<br( +\/)?>/g, "\n").replace(/&nbsp;/g, " ");
    //         if (lang) return '<pre is-code>'+hljs.highlight(lang, m4).value + '</pre>';
    //         else return '<pre is-code>'+hljs.highlightAuto(m4).value + '</pre>';
    //     });
    //     if (txt != el.textContent) {
    //       q.push(()=>{
    //          let nel = document.createElement('span');
    //          nel.innerHTML = txt;
    //          el.parentNode.replaceChild(nel, el);
    //       })
    //     }
    // },
    // processElementRec: function(el, inLang, updateList){
    //     let q = updateList;
    //     if (q === undefined) q = [];

    //     if (inLang === undefined && el.hasAttribute('highlight')){
    //         inLang = el.getAttribute('highlight');
    //     }
    //     el.innerHTML = el.innerHTML;

    //     el.childNodes.forEach(c => {
    //        if (c.nodeType==Node.TEXT_NODE) {
    //            this.processTextElement(c, inLang, q);
    //        } else {
    //            this.processElement(c, inLang, q);
    //        }
    //     })

    //     if (updateList === undefined){
    //         q.forEach(f => f());
    //     }
    // },
    processElementSimple(el: HTMLElement, inLang: string | undefined) {
        if (inLang === undefined && el.hasAttribute('highlight')) {
            const lang = el.getAttribute('highlight')
            inLang = lang === null ? 'javascript' : lang
        }

        let txt = el.innerHTML.replace(reg_hl, function (m1, m2, m3, m4, m5) {
            const lang = m3 === undefined ? inLang : m3
            //console.log("m1", m1, "m2", m2, "m3", m3, "m4", m4, "m5", m5, "in", inLang, "res", lang)
            if (lang) {
                return '<span is-code>' + hljs.highlight(lang, m4).value + '</span>'
            } else {
                return '<span is-code>' + hljs.highlightAuto(m4).value + '</span>'
            }
        })

        txt = txt.replace(reg_code, function (m1, m2, m3, m4, m5) {
            const lang = m3 === undefined ? inLang : m3
            m4 = m4
                .replace(/<br( +\/)?>/g, '\n')
                .replace(/&nbsp;/g, ' ')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/&#38;/g, '&')

            if (lang) {
                return '<pre is-code>' + hljs.highlight(lang, m4).value + '</pre>'
            } else {
                return '<pre is-code>' + hljs.highlightAuto(m4).value + '</pre>'
            }
        })

        el.innerHTML = txt
    },
    processElement(el: HTMLElement, inLang: string | undefined) {
        if (window.MathJax === undefined) {
            this.processElementSimple(el, inLang)
        } else {
            MathJax.Hub.Register.StartupHook('End', () => {
                this.processElementSimple(el, inLang)
            })
        }
    },
}

window.highlightAll = function () {
    hljs.$vue.processElements()
}
window.highlightElement = function (el: HTMLElement) {
    hljs.$vue.processElement(el, el.getAttribute('highlight'))
}
window.hljs = hljs

export const highlight = hljs

export const highlightDirective = {
    //deep: true,
    beforeMount: function (el: HTMLElement, binding: any, vnode: any) {
        console.log('DIRECTIVE - bind', el, binding)
        hljs.$vue.processElement(el, binding.value)
    },
    updated: function (el: HTMLElement, binding: any, vnode: any) {
        console.log('DIRECTIVE - update', el, binding)
        hljs.$vue.processElement(el, binding.value)
    },
}
