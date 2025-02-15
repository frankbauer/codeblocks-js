<script setup lang="ts">
import type { ProgressRootProps } from 'radix-vue'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import {
  ProgressIndicator,
  ProgressRoot,

} from 'radix-vue'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<ProgressRootProps & { class?: HTMLAttributes['class'] }>(),
  {
    modelValue: 0,
  },
)

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props

  return delegated
})
</script>

<template>
  <ProgressRoot
    v-bind="delegatedProps"
    :class="
      cn(
        'tw-relative tw-h-2 tw-w-full tw-overflow-hidden tw-rounded-full tw-bg-primary/20',
        props.class,
      )
    "
  >
    <ProgressIndicator
      class="tw-h-full tw-w-full tw-flex-1 tw-bg-primary tw-transition-all"
      :style="`transform: translateX(-${100 - (props.modelValue ?? 0)}%);`"
    />
  </ProgressRoot>
</template>
