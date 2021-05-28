const path = require('path'),
    conf = require('./package.json'),    
    fs = require('fs')

let override = {
    publicPath: '/'
    //publicPath: path.join('/Customizing/global/plugins/Modules/TestQuestionPool/Questions/assCodeQuestion/codeblocks/', conf.version, '/')
}
if (process.env.ILIAS_VUE_PATH) {
    override.publicPath = process.env.ILIAS_VUE_PATH
}
module.exports = {
    publicPath: override.publicPath,
    filenameHashing: false,

    pluginOptions: {
        quasar: {
            importStrategy: 'kebab',
            rtlSupport: false
        },
        i18n: {
            locale: 'en',
            fallbackLocale: 'en',
            localeDir: 'locales',
            enableInSFC: true
        }
    },

    transpileDependencies: ['quasar'],
    configureWebpack: {}
}
