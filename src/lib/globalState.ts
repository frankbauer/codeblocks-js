import Vue, { reactive } from 'vue'
import { GlobalState } from '@/plugins/codeBlocks'

const compilerState = new Vue({
    data: function () {
        return {
            globalStateHidden: true,
            globalStateMessage: '',
            runButtonForceHide: false,
        }
    },
    methods: {
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
    },
})

const appState = new GlobalState()
Vue.prototype.$CodeBlock = appState
Vue.$CodeBlock = appState

export const globalState = reactive({
    compilerState: compilerState,
    codeBlocks: appState,
})
