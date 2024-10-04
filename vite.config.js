import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { quasar, transformAssetUrls } from '@quasar/vite-plugin'

const path = require('path')

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        vue({
            template: { transformAssetUrls },
        }),
        // @quasar/plugin-vite options list:
        // https://github.com/quasarframework/quasar/blob/dev/vite-plugin/index.d.ts
        quasar({
            //sassVariables: 'src/styles/quasar-variables.sass',
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            vue: 'vue/dist/vue.esm-bundler',
            $: 'jquery',
            jQuery: 'jquery',
        },
        //extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
    },
    optimizeDeps: {
        include: ['jquery', 'jquery.terminal'],
    },
})
