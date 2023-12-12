import VueI18n, { createI18n } from 'vue-i18n'

let lang = document.getElementsByTagName('html')[0].getAttribute('lang')
if (lang !== null) {
    lang = lang.split('-', 2)[0]
}

function loadLocaleMessages() {
    //const locales = require.context('@/locales', true, /[A-Za-z0-9-_,\s]+\.json$/i, 'sync')
    const messages = {
        en: {
            message: {
                hello: 'hello world',
            },
        },
    }
    // locales.keys().forEach((key) => {
    //     const matched = key.match(/([A-Za-z0-9-_]+)\./i)
    //     if (matched && matched.length > 1) {
    //         const locale = matched[1]
    //         messages[locale] = locales(key)
    //     }
    // })
    console.log('Loaded locales: ', messages)
    return messages
}

export const i18n = createI18n({
    legacy: false,
    locale: lang || import.meta.env.VUE_APP_I18N_LOCALE || 'en',
    fallbackLocale: import.meta.env.VUE_APP_I18N_FALLBACK_LOCALE || 'en',
    messages: loadLocaleMessages(),
})

export default i18n
export const l = (key: string, values?: any[]): string => {
    const res = values === undefined ? i18n.global.t(key) : i18n.global.t(key, values)
    return res.toString()
}
