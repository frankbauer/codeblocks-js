module.exports = {
    plugins: [
        [
            'transform-imports',
            {
                quasar: {
                    //transform: require('quasar/dist/babel-transforms/imports.js'),
                    preventFullImport: true,
                },
            },
        ],
    ],
    presets: ['@vue/cli-plugin-babel/preset'],
}
