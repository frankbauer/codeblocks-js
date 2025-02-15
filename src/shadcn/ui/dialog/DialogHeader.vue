<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div
    :class="cn('tw-flex tw-flex-col tw-gap-y-1.5 tw-text-center sm:tw-text-left', props.class)"
  >
    <slot />
  </div>
</template>
