<script setup lang="ts">
import type { TooltipContentEmits, TooltipContentProps } from 'radix-vue'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { TooltipContent, TooltipPortal, useForwardPropsEmits } from 'radix-vue'
import { computed } from 'vue'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<TooltipContentProps & { class?: HTMLAttributes['class'] }>(), {
  sideOffset: 4,
})

const emits = defineEmits<TooltipContentEmits>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props

  return delegated
})

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <TooltipPortal>
    <TooltipContent v-bind="{ ...forwarded, ...$attrs }" :class="cn('tw-z-50 tw-overflow-hidden tw-rounded-md tw-bg-primary tw-px-3 tw-py-1.5 tw-text-xs tw-text-primary-foreground tw-animate-in tw-fade-in-0 tw-zoom-in-95 data-[state=closed]:tw-animate-out data-[state=closed]:tw-fade-out-0 data-[state=closed]:tw-zoom-out-95 data-[side=bottom]:tw-slide-in-from-top-2 data-[side=left]:tw-slide-in-from-right-2 data-[side=right]:tw-slide-in-from-left-2 data-[side=top]:tw-slide-in-from-bottom-2', props.class)">
      <slot />
    </TooltipContent>
  </TooltipPortal>
</template>
