<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <h3
    :class="
      cn('tw-font-semibold tw-leading-none tw-tracking-tight', props.class)
    "
  >
    <slot />
  </h3>
</template>
