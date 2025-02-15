<script setup lang="ts">
import type { SelectTriggerProps } from 'radix-vue'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { CaretSortIcon } from '@radix-icons/vue'
import { SelectIcon, SelectTrigger, useForwardProps } from 'radix-vue'
import { computed } from 'vue'

const props = defineProps<SelectTriggerProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props

  return delegated
})

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <SelectTrigger
    v-bind="forwardedProps"
    :class="cn(
      'tw-flex tw-h-9 tw-w-full tw-items-center tw-justify-between tw-whitespace-nowrap tw-rounded-md tw-border tw-border-input tw-bg-transparent tw-px-3 tw-py-2 tw-text-sm tw-shadow-sm tw-ring-offset-background data-[placeholder]:tw-text-muted-foreground focus:tw-outline-none focus:tw-ring-1 focus:tw-ring-ring disabled:tw-cursor-not-allowed disabled:tw-opacity-50 [&>span]:tw-truncate tw-text-start',
      props.class,
    )"
  >
    <slot />
    <SelectIcon as-child>
      <CaretSortIcon class="tw-w-4 tw-h-4 tw-opacity-50 tw-shrink-0" />
    </SelectIcon>
  </SelectTrigger>
</template>
