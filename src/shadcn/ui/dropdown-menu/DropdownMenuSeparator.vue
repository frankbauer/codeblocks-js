<script setup lang="ts">
import type { DropdownMenuSeparatorProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { DropdownMenuSeparator } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<
    DropdownMenuSeparatorProps & {
        class?: HTMLAttributes['class']
    }
>()

const delegatedProps = reactiveOmit(props, 'class')
</script>

<template>
    <DropdownMenuSeparator
        v-bind="delegatedProps"
        :class="cn('tw--mx-1 tw-my-1 tw-h-px tw-bg-muted', props.class)"
    />
</template>
