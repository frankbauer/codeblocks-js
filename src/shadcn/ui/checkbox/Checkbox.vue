<script setup lang="ts">
import type { CheckboxRootEmits, CheckboxRootProps } from 'radix-vue'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { CheckIcon } from '@radix-icons/vue'
import { CheckboxIndicator, CheckboxRoot, useForwardPropsEmits } from 'radix-vue'
import { computed } from 'vue'

const props = defineProps<CheckboxRootProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<CheckboxRootEmits>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props

  return delegated
})

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <CheckboxRoot
    v-bind="forwarded"
    :class="
      cn('tw-peer tw-h-4 tw-w-4 tw-shrink-0 tw-rounded-sm tw-border tw-border-primary tw-shadow focus-visible:tw-outline-none focus-visible:tw-ring-1 focus-visible:tw-ring-ring disabled:tw-cursor-not-allowed disabled:tw-opacity-50 data-[state=checked]:tw-bg-primary data-[state=checked]:tw-text-primary-foreground',
         props.class)"
  >
    <CheckboxIndicator class="tw-flex tw-h-full tw-w-full tw-items-center tw-justify-center tw-text-current">
      <slot>
        <CheckIcon class="tw-h-4 tw-w-4" />
      </slot>
    </CheckboxIndicator>
  </CheckboxRoot>
</template>
