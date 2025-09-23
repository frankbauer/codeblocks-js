<template>
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger as-child>
                <component
                    :is="severityIcon"
                    :class="`tw-mt-[3px] tw-mr-1 tw-w-3 tw-h-3 ${severityClass}`"
                />
            </TooltipTrigger>
            <TooltipContent>
                <div>
                    <ul class="tw-text-sm tw-list-none tw-pl-0 tw-max-w-120 tw-min-w-75">
                        <li
                            v-for="error in errors"
                            :key="error.message"
                            class="tw-pt-2.5 first:tw-pt-0 tw-pb-0 tw-pl-0 tw-pr-0 tw-m-0"
                        >
                            <div class="tw-flex">
                                <div class="">
                                    <component
                                        :is="iconForSeverity(error.severity)"
                                        class="tw-text-white tw-align-top tw-w-4 tw-h-4 tw-mr-2 tw-mt-0.5"
                                    />
                                </div>
                                <div class="tw-flex-1 tw-pr-4">
                                    <div
                                        class="tw-align-top tw-font-mono"
                                        v-html="errorMessage"
                                    ></div>
                                </div>
                            </div>
                        </li>
                    </ul>
                </div>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
</template>

<script lang="ts" setup>
import { AlertCircle, AlertTriangle, OctagonX, TriangleAlert } from 'lucide-vue-next'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shadcn/ui/tooltip'
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
        return 'tw-text-red-500'
    }
    return 'tw-text-yellow-500'
}

function iconForSeverity(s: ErrorSeverity) {
    if (s == ErrorSeverity.Error) {
        return OctagonX
    }
    return TriangleAlert
}

const severityClass: ComputedRef<string> = computed(() => {
    return classForSeverity(severity.value)
})

const severityIcon: ComputedRef<any> = computed(() => {
    return iconForSeverity(severity.value)
})

const errorMessage: ComputedRef<string> = computed(() => {
    if (errors.value.length == 1) {
        return errors.value[0].message.replace(/\r?\n/g, '<br>')
    }
    return `${errors.value.length} issues`
})
</script>
