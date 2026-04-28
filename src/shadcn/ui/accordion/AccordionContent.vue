<script setup lang="ts">
import type { AccordionContentProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { AccordionContent } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<AccordionContentProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')
</script>

<template>
    <AccordionContent
        v-bind="delegatedProps"
        class="tw-overflow-hidden tw-text-sm data-[state=closed]:tw-animate-accordion-up data-[state=open]:tw-animate-accordion-down"
    >
        <div :class="cn('tw-pb-4 tw-pt-0', props.class)">
            <slot />
        </div>
    </AccordionContent>
</template>
