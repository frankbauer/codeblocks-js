<script setup lang="ts">
import type { ListboxFilterProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { Search } from 'lucide-vue-next'
import { ListboxFilter, useForwardProps } from 'reka-ui'
import { cn } from '@/lib/utils'
import { useCommand } from '.'

defineOptions({
    inheritAttrs: false,
})

const props = defineProps<
    ListboxFilterProps & {
        class?: HTMLAttributes['class']
    }
>()

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)

const { filterState } = useCommand()
</script>

<template>
    <div class="tw-flex tw-items-center tw-border-b tw-px-3" cmdk-input-wrapper>
        <Search class="tw-mr-2 tw-h-4 tw-w-4 tw-shrink-0 tw-opacity-50" />
        <ListboxFilter
            v-bind="{ ...forwardedProps, ...$attrs }"
            v-model="filterState.search"
            auto-focus
            :class="
                cn(
                    'tw-flex tw-h-10 tw-w-full tw-rounded-md tw-bg-transparent tw-py-3 tw-text-sm tw-outline-none placeholder:tw-text-muted-foreground disabled:tw-cursor-not-allowed disabled:tw-opacity-50',
                    props.class
                )
            "
        />
    </div>
</template>
