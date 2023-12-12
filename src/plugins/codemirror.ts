import Vue from 'vue'
import VueCodemirror from 'vue-codemirror'

//Vue.use(VueCodeMirror, {})

export function appUseCodeMirror(app: Vue.App<Element>) {
    app.use(VueCodemirror)
}
