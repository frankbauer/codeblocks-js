<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <h5 :class="cn('tw-mb-1 tw-font-medium tw-leading-none tw-tracking-tight', props.class)">
    <slot />
  </h5>
</template>
