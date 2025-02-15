<script setup lang="ts">
import type { AccordionTriggerProps } from 'radix-vue'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { ChevronDownIcon } from '@radix-icons/vue'
import {
  AccordionHeader,
  AccordionTrigger,

} from 'radix-vue'
import { computed } from 'vue'

const props = defineProps<AccordionTriggerProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props

  return delegated
})
</script>

<template>
  <AccordionHeader class="tw-flex">
    <AccordionTrigger
      v-bind="delegatedProps"
      :class="
        cn(
          'tw-flex tw-flex-1 tw-items-center tw-justify-between tw-py-4 tw-text-sm tw-font-medium tw-transition-all hover:tw-underline [&[data-state=open]>svg]:tw-rotate-180',
          props.class,
        )
      "
    >
      <slot />
      <slot name="icon">
        <ChevronDownIcon
          class="tw-h-4 tw-w-4 tw-shrink-0 tw-text-muted-foreground tw-transition-transform tw-duration-200"
        />
      </slot>
    </AccordionTrigger>
  </AccordionHeader>
</template>
