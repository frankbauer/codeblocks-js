<script setup lang="ts">
import type { ComboboxInputEmits, ComboboxInputProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { ComboboxInput, useForwardPropsEmits } from "reka-ui"
import { cn } from "@/lib/utils"

const props = defineProps<ComboboxInputProps & {
  class?: HTMLAttributes["class"]
}>()

const emits = defineEmits<ComboboxInputEmits>()

const delegatedProps = reactiveOmit(props, "class")

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <ComboboxInput
    v-bind="forwarded"
    :class="cn('tw-flex tw-h-9 tw-w-full tw-rounded-md tw-border tw-border-input tw-bg-transparent tw-px-3 tw-py-1 tw-text-sm tw-shadow-sm tw-transition-colors file:tw-border-0 file:tw-bg-transparent file:tw-text-sm file:tw-font-medium placeholder:tw-text-muted-foreground focus-visible:tw-outline-none focus-visible:tw-ring-1 focus-visible:tw-ring-ring disabled:tw-cursor-not-allowed disabled:tw-opacity-50', props.class)"
  >
    <slot />
  </ComboboxInput>
</template>
