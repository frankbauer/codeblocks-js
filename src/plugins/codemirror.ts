import Vue from 'vue'

import { InstallCodemirro } from 'codemirror-editor-vue3'

export function appUseCodeMirror(app: Vue.App<Element>) {
    app.use(InstallCodemirro as any, {})
}
