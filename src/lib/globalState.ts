import { reactive } from 'vue'
import { GlobalState } from '@/plugins/codeBlocks'
import { ErrorSeverity } from '@/lib/ICompilerRegistry'

const compilerState = reactive({
    globalStateHidden: true,
    globalStateMessage: '',
    runButtonForceHide: false,

    hideGlobalState() {
        this.displayGlobalState(null)
    },
    setAllRunButtons(what: boolean) {
        this.runButtonForceHide = !what
    },
    displayGlobalState(message: string | null) {
        this.globalStateHidden = message === null || message === undefined || message === ''
        this.globalStateMessage = message ? message : ''
    },
})

const appState = reactive(new GlobalState())

function valOr(val: string | undefined, def: number): number {
    return val === undefined ? def : +val
}

export const globalState = {
    compilerState: compilerState,
    appState: appState,

    //Some constants
    SEVERITY_ERROR: ErrorSeverity.Error,
    SEVERITY_WARNING: ErrorSeverity.Warning,
    VUE_APP_CODE_BLOCK_MAX_TIMEOUT: valOr(import.meta.env.VUE_APP_CODE_BLOCK_MAX_TIMEOUT, 800),
    VUE_APP_CONTINOUS_COMPILE_TIMEOUT: valOr(
        import.meta.env.VUE_APP_CONTINOUS_COMPILE_TIMEOUT,
        800
    ),
    VUE_APP_CODE_BLOCK_TIMEOUT: valOr(import.meta.env.VUE_APP_CODE_BLOCK_TIMEOUT, 150),
}
