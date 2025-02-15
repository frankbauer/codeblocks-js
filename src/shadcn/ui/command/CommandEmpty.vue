<script setup lang="ts">
import type { ComboboxEmptyProps } from 'radix-vue'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { ComboboxEmpty } from 'radix-vue'
import { computed } from 'vue'

const props = defineProps<ComboboxEmptyProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props

  return delegated
})
</script>

<template>
  <ComboboxEmpty v-bind="delegatedProps" :class="cn('tw-py-6 tw-text-center tw-text-sm', props.class)">
    <slot />
  </ComboboxEmpty>
</template>
