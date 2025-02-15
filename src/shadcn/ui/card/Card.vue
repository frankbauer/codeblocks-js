<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div
    :class="
      cn(
        'tw-rounded-xl tw-border tw-bg-card tw-text-card-foreground tw-shadow',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
