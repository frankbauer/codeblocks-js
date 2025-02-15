<script setup lang="ts">
import type { AccordionContentProps } from 'radix-vue'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { AccordionContent } from 'radix-vue'
import { computed } from 'vue'

const props = defineProps<AccordionContentProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props

  return delegated
})
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
