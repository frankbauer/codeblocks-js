import Vue from 'vue'

import { InstallCodeMirror } from 'codemirror-editor-vue3'

export function appUseCodeMirror(app: Vue.App<Element>) {
    app.use(InstallCodeMirror as any, {})
}
