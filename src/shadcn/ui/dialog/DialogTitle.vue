<script setup lang="ts">
import type { DialogTitleProps } from 'radix-vue'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { DialogTitle, useForwardProps } from 'radix-vue'
import { computed } from 'vue'

const props = defineProps<DialogTitleProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props

  return delegated
})

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <DialogTitle
    v-bind="forwardedProps"
    :class="
      cn(
        'tw-text-lg tw-font-semibold tw-leading-none tw-tracking-tight',
        props.class,
      )
    "
  >
    <slot />
  </DialogTitle>
</template>
