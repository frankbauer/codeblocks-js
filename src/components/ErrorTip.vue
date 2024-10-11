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

<script lang="ts" setup>
import { QIcon, QTooltip } from 'quasar'
import { ErrorSeverity, ICompilerErrorDescription } from '@/lib/ICompilerRegistry'
import { computed, ComputedRef, toRefs } from 'vue'

interface Props {
    errors: ICompilerErrorDescription[]
    severity: ErrorSeverity
}

const props = defineProps<Props>()
const { errors, severity } = toRefs(props)

function classForSeverity(s: ErrorSeverity): string {
    if (s == ErrorSeverity.Error) {
        return 'gutter-error'
    }
    return 'gutter-warning'
}

function iconForSeverity(s: ErrorSeverity): string {
    if (s == ErrorSeverity.Error) {
        return 'report'
    }
    return 'warning'
}

const severityClass: ComputedRef<string> = computed(() => {
    return classForSeverity(severity.value)
})

const severityIcon: ComputedRef<string> = computed(() => {
    return iconForSeverity(severity.value)
})
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
