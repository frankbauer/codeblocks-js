import Vue from 'vue'
import VueI18n from 'vue-i18n'
import Quasar from 'quasar'

let lang = document.getElementsByTagName('html')[0].getAttribute('lang');
lang = lang.split('-', 2)[0]

console.log(lang, document.getElementsByTagName('html')[0].getAttribute('lang'));
Vue.use(VueI18n)

function loadLocaleMessages () {
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

export default new VueI18n({
  locale: lang || process.env.VUE_APP_I18N_LOCALE || 'en',
  fallbackLocale: process.env.VUE_APP_I18N_FALLBACK_LOCALE || 'en',
  messages: loadLocaleMessages()
})