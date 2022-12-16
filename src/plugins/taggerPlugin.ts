import { CodeBlocksGlobal } from '@/lib/global'
import { App } from 'vue'
import Tagger from './tagger'

CodeBlocksGlobal.$tagger = new Tagger()
export default function install(app: App): void {
    app.directive('tagged', {
        //deep: true,
        beforeMount: function (el: HTMLElement, binding) {
            CodeBlocksGlobal.$tagger.processElement(el, binding.value)
        },
        updated: function (el: HTMLElement, binding) {
            //console.log("DIRECTIVE - update", el, binding)
            CodeBlocksGlobal.$tagger.processElement(el, binding.value)
        },
    })
}
