<script setup lang="ts">
import type { SelectItemProps } from 'radix-vue'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { CheckIcon } from '@radix-icons/vue'
import {
  SelectItem,
  SelectItemIndicator,

  SelectItemText,
  useForwardProps,
} from 'radix-vue'
import { computed } from 'vue'

const props = defineProps<SelectItemProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props

  return delegated
})

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <SelectItem
    v-bind="forwardedProps"
    :class="
      cn(
        'tw-relative tw-flex tw-w-full tw-cursor-default tw-select-none tw-items-center tw-rounded-sm tw-py-1.5 tw-pl-2 tw-pr-8 tw-text-sm tw-outline-none focus:tw-bg-accent focus:tw-text-accent-foreground data-[disabled]:tw-pointer-events-none data-[disabled]:tw-opacity-50',
        props.class,
      )
    "
  >
    <span class="tw-absolute tw-right-2 tw-flex tw-h-3.5 tw-w-3.5 tw-items-center tw-justify-center">
      <SelectItemIndicator>
        <CheckIcon class="tw-h-4 tw-w-4" />
      </SelectItemIndicator>
    </span>

    <SelectItemText>
      <slot />
    </SelectItemText>
  </SelectItem>
</template>
