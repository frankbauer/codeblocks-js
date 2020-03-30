<template>
    <q-icon :class="`mdi ${severityClass} mainTipIcon`" :name="severityIcon">
        <q-tooltip>
            <div>
                <ul class="tiplist">
                    <li v-for="error in errors" v-bind:key="error.message">
                        <div class="row">
                            <div class="col-1">
                                <q-icon class="" :name="iconForSeverity(error.severity)"></q-icon>
                            </div>
                            <div class="col-11 q-pr-md">
                                <div class="q-my-none tipper">{{ error.message }}</div>
                            </div>
                        </div>
                    </li>
                </ul>
            </div>
        </q-tooltip>
    </q-icon>
</template>

<script lang="ts">
import 'reflect-metadata'
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import { ErrorSeverity, ICompilerErrorDescription } from '@/lib/ICompilerRegistry'

@Component
export default class ErrorTip extends Vue {
    @Prop() errors!: ICompilerErrorDescription
    @Prop() severity!: ErrorSeverity

    get severityClass(): string {
        return this.classForSeverity(this.severity)
    }
    get severityIcon(): string {
        return this.iconForSeverity(this.severity)
    }

    classForSeverity(s: ErrorSeverity): string {
        if (s == ErrorSeverity.Error) {
            return 'gutter-error'
        }
        return 'gutter-warning'
    }
    iconForSeverity(s: ErrorSeverity): string {
        if (s == ErrorSeverity.Error) {
            return 'report'
        }
        return 'warning'
    }
}
</script>

<style lang="sass">
.mainTipIcon
    margin-top: -1px
.tiplist
    font-size: 0.9rem
    list-style-type: none
    padding-left: 0px !important
    max-width: 480px
    min-width: 300px
    li:first-of-type
        padding: 0px 0px 0px 0px
    li
        padding: 10px 0px 0px 0px
        margin: 0px 0px 0px 0px
        .tipicon
            display: inline
            color: white !important
            vertical-align: top
        .tipper
            vertical-align: top
            font-family: monospace
</style>
