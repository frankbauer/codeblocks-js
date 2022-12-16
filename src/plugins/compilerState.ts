import { Vue, Options } from 'vue-class-component'

@Options({})
export default class CompilerState extends Vue {
    public globalStateHidden = true
    public globalStateMessage = ''
    public runButtonForceHide = false

    hideGlobalState() {
        this.displayGlobalState(null)
    }
    setAllRunButtons(what: boolean) {
        this.runButtonForceHide = !what
    }
    displayGlobalState(message: string | null) {
        this.globalStateHidden = message === null || message === undefined || message === ''
        this.globalStateMessage = message ? message : ''
    }
}

const anyVue: any = Vue
anyVue.prototype.$compilerState = new CompilerState()
