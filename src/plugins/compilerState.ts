import Vue from 'vue'
import { ErrorSeverity } from '@/lib/ICompilerRegistry'

Vue.prototype.SEVERITY_ERROR = ErrorSeverity.Error
Vue.prototype.SEVERITY_WARNING = ErrorSeverity.Warning
Vue.$SEVERITY_ERROR = ErrorSeverity.Error
Vue.$SEVERITY_WARNING = ErrorSeverity.Warning

Vue.prototype.$compilerState = new Vue({
    data: function() {
        return {
            globalStateHidden: true,
            globalStateMessage: '',
            runButtonForceHide: false
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
        }
    }
})
