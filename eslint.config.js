import js from '@eslint/js'
import globals from 'globals'
import tsParser from '@typescript-eslint/parser'
import vueParser from 'vue-eslint-parser'
import vuePlugin from 'eslint-plugin-vue'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import prettierPlugin from 'eslint-plugin-prettier'
import prettierConfigRecommended from 'eslint-config-prettier'

const customGlobals = {
    ...globals.browser,
    ...globals.node,
    ...globals.es6,
    $: 'readonly',
    jQuery: 'readonly',
    JQuery: 'readonly',
    Phaser: 'readonly',
    MathJax: 'readonly',
    JavaExec: 'readonly',
    CodeMirror: 'readonly',
    define: 'readonly',
    FrameRequestCallback: 'readonly',
}

export default [
    js.configs.recommended,
    ...vuePlugin.configs['flat/essential'],
    {
        ignores: [
            '**/node_modules/**',
            '**/dist/**',
            'public/js/brain.js/**',
            'public/js/chart.js/**',
            'public/js/d3/**',
            'public/js/doppio/**',
            'public/js/leaflet.js/**',
            'public/js/lil-gui/**',
            'public/js/modelviewer.js/**',
            'public/js/phaser/**',
            'public/js/tensorflow.js/**',
            'public/js/three.js/**',
            'public/js/jquery.min.js',
            'public/js/python/**',
            'docs/**',
            'dev/phaser/types/**',
            '**/*.d.ts',
        ],
    },
    {
        files: ['**/*.ts', '**/*.vue'],
        plugins: {
            '@typescript-eslint': tsPlugin,
        },
        languageOptions: {
            parser: tsParser,
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: customGlobals,
        },
    },
    {
        files: ['**/*.vue'],
        languageOptions: {
            parser: vueParser,
            parserOptions: {
                parser: tsParser,
                ecmaVersion: 'latest',
                sourceType: 'module',
            },
        },
    },
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: customGlobals,
        },
    },
    {
        files: ['**/*.ts', '**/*.vue', '**/*.js'],
        plugins: {
            prettier: prettierPlugin,
        },
        rules: {
            ...prettierConfigRecommended.rules,
            'prettier/prettier': 'error',
            'linebreak-style': ['error', 'unix'],
            curly: ['error', 'all'],
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'off',
                {
                    vars: 'all',
                    args: 'after-used',
                    ignoreRestSiblings: false,
                },
            ],
            'vue/multi-word-component-names': 'off',
            'vue/no-v-text-v-html-on-component': 'off',
            'no-useless-assignment': 'off',
            'vue/no-mutating-props': 'off',
            'no-prototype-builtins': 'off',
            'no-useless-escape': 'off',
            'preserve-caught-error': 'off', // Custom rule likely from a plugin
        },
    },
]
