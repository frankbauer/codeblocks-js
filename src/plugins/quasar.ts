import Vue from 'vue'

import 'quasar/src/css/index.sass'
import '../styles/quasar.styl'
import '@quasar/extras/material-icons/material-icons.css'

import '@quasar/extras/animate/fadeInUp.css'
import '@quasar/extras/animate/fadeInDown.css'
import '@quasar/extras/animate/fadeOutUp.css'
import '@quasar/extras/animate/fadeOutDown.css'

import '@quasar/extras/animate/fadeIn.css'
import '@quasar/extras/animate/fadeOut.css'

import '@quasar/extras/animate/zoomInDown.css'
import '@quasar/extras/animate/zoomInUp.css'

import { Dialog, Quasar } from 'quasar'

const lang = document.getElementsByTagName('html')[0].getAttribute('lang')
import langDe from 'quasar/lang/de.js'
import langEn from 'quasar/lang/en-GB.js'

Quasar.lang.set(lang == 'de' ? langDe : langEn)

export function appUseQuasar(app: Vue.App<Element>) {
    app.use(Quasar, {
        config: {},
        components: {},
        plugins: { Dialog },
        lang: lang == 'de' ? langDe : langEn,
    })
}
