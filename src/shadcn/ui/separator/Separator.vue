<script setup lang="ts">
import type { SeparatorProps } from 'radix-vue'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { Separator } from 'radix-vue'
import { computed } from 'vue'

const props = defineProps<
  SeparatorProps & { class?: HTMLAttributes['class'], label?: string }
>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props

  return delegated
})
</script>

<template>
  <Separator
    v-bind="delegatedProps"
    :class="
      cn(
        'tw-shrink-0 tw-bg-border tw-relative',
        props.orientation === 'vertical' ? 'tw-w-px tw-h-full' : 'tw-h-px tw-w-full',
        props.class,
      )
    "
  >
    <span
      v-if="props.label"
      :class="
        cn(
          'tw-text-xs tw-text-muted-foreground tw-bg-background tw-absolute tw-top-1/2 tw-left-1/2 tw--translate-x-1/2 tw--translate-y-1/2 tw-flex tw-justify-center tw-items-center',
          props.orientation === 'vertical' ? 'tw-w-[1px] tw-px-1 tw-py-2' : 'tw-h-[1px] tw-py-1 tw-px-2',
        )
      "
    >{{ props.label }}</span>
  </Separator>
</template>
