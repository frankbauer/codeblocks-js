<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { useVModel } from '@vueuse/core'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const inputVariants = cva(
  'tw-flex tw-w-full tw-rounded-md tw-border tw-border-input tw-bg-transparent tw-text-sm tw-shadow-sm tw-transition-colors file:tw-border-0 file:tw-bg-transparent file:tw-text-sm file:tw-font-medium placeholder:tw-text-muted-foreground focus-visible:tw-outline-none focus-visible:tw-ring-1 focus-visible:tw-ring-ring disabled:tw-cursor-not-allowed disabled:tw-opacity-50',
  {
    variants: {
      size: {
        default: 'tw-h-9 tw-px-3 tw-py-1',
        sm: 'tw-h-8 tw-px-3 tw-py-1',
        xs: 'tw-h-7 tw-px-2 tw-py-0.5 tw-text-xs',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
)

type InputVariants = VariantProps<typeof inputVariants>

const props = defineProps<{
  defaultValue?: string | number
  modelValue?: string | number
  class?: HTMLAttributes['class']
  size?: InputVariants['size']
}>()

const emits = defineEmits<{
  (e: 'update:modelValue', payload: string | number): void
}>()

const modelValue = useVModel(props, 'modelValue', emits, {
  passive: true,
  defaultValue: props.defaultValue,
})
</script>

<template>
  <input v-model="modelValue" :class="cn(inputVariants({ size }), props.class)">
</template>
