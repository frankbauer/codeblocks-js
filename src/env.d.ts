/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VUE_APP_I18N_LOCALE: string
    readonly VUE_APP_I18N_FALLBACK_LOCALE: string
    readonly VUE_APP_CODE_BLOCK_TIMEOUT: string
    readonly VUE_APP_CODE_BLOCK_MAX_TIMEOUT: string
    readonly VUE_APP_BLOCKLY_TIMEOUT: string
    readonly VUE_APP_CONTINOUS_COMPILE_TIMEOUT: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
