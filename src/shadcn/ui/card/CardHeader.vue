<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div :class="cn('tw-flex tw-flex-col tw-gap-y-1.5 tw-p-6', props.class)">
    <slot />
  </div>
</template>
