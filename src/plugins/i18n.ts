import Vue from 'vue'
import VueI18n from 'vue-i18n'
import { Quasar } from 'quasar'

let lang = document.getElementsByTagName('html')[0].getAttribute('lang')
if (lang !== null) {
    lang = lang.split('-', 2)[0]
}
Vue.use(VueI18n)

function loadLocaleMessages() {
    const locales = require.context('../locales', true, /[A-Za-z0-9-_,\s]+\.json$/i)
    const messages = {}
    locales.keys().forEach(key => {
        const matched = key.match(/([A-Za-z0-9-_]+)\./i)
        if (matched && matched.length > 1) {
            const locale = matched[1]
            messages[locale] = locales(key)
        }
    })
    return messages
}

export class I18n extends VueI18n {
    public readonly $v: typeof VueI18n

    constructor(options: VueI18n.I18nOptions) {
        super(options)
        this.$v = VueI18n
    }
}

export const i18n: I18n = new I18n({
    locale: lang || process.env.VUE_APP_I18N_LOCALE || 'en',
    fallbackLocale: process.env.VUE_APP_I18N_FALLBACK_LOCALE || 'en',
    messages: loadLocaleMessages()
})

export default i18n
Vue.prototype.$l = (key: string, values?: any[]): string => {
    const res = i18n.t(key, values)
    return res.toString()
}
Vue.$l = Vue.prototype.$l
