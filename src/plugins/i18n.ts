import { CodeBlocksGlobal } from '@/lib/global'
import Vue from 'vue'
import VueI18n, { createI18n } from 'vue-i18n'
import { Quasar } from 'quasar'

let lang = document.getElementsByTagName('html')[0].getAttribute('lang')
if (lang !== null) {
    lang = lang.split('-', 2)[0]
}

function loadLocaleMessages() {
    const locales = require.context('../locales', true, /[A-Za-z0-9-_,\s]+\.json$/i)
    const messages = {}
    locales.keys().forEach((key) => {
        const matched = key.match(/([A-Za-z0-9-_]+)\./i)
        if (matched && matched.length > 1) {
            const locale = matched[1]
            messages[locale] = locales(key)
        }
    })
    return messages
}

export const i18n = createI18n({
    preserveDirectiveContent: true,
    locale: lang || process.env.VUE_APP_I18N_LOCALE || 'en',
    fallbackLocale: process.env.VUE_APP_I18N_FALLBACK_LOCALE || 'en',
    messages: loadLocaleMessages(),
})

export default i18n
