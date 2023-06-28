import Vue from 'vue'
import { ErrorSeverity } from '@/lib/ICompilerRegistry'
import { globalState } from '@/lib/globalState'

Vue.prototype.SEVERITY_ERROR = ErrorSeverity.Error
Vue.prototype.SEVERITY_WARNING = ErrorSeverity.Warning
Vue.$SEVERITY_ERROR = ErrorSeverity.Error
Vue.$SEVERITY_WARNING = ErrorSeverity.Warning

Vue.prototype.$compilerState = globalState.compilerState
