<script setup lang="ts">
import type { DropdownMenuSubTriggerProps } from 'radix-vue'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { ChevronRightIcon } from '@radix-icons/vue'
import {
  DropdownMenuSubTrigger,

  useForwardProps,
} from 'radix-vue'
import { computed } from 'vue'

const props = defineProps<DropdownMenuSubTriggerProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props

  return delegated
})

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <DropdownMenuSubTrigger
    v-bind="forwardedProps"
    :class="cn(
      'tw-flex tw-cursor-default tw-select-none tw-items-center tw-rounded-sm tw-px-2 tw-py-1.5 tw-text-sm tw-outline-none focus:tw-bg-accent data-[state=open]:tw-bg-accent',
      props.class,
    )"
  >
    <slot />
    <ChevronRightIcon class="tw-ml-auto tw-h-4 tw-w-4" />
  </DropdownMenuSubTrigger>
</template>
