<script setup lang="ts">
import type { ComboboxGroupProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { ComboboxGroup, ComboboxLabel } from "reka-ui"
import { cn } from "@/lib/utils"

const props = defineProps<ComboboxGroupProps & {
  class?: HTMLAttributes["class"]
  heading?: string
}>()

const delegatedProps = reactiveOmit(props, "class")
</script>

<template>
  <ComboboxGroup
    v-bind="delegatedProps"
    :class="cn('tw-overflow-hidden tw-p-1 tw-text-foreground [&_[cmdk-group-heading]]:tw-px-2 [&_[cmdk-group-heading]]:tw-py-1.5 [&_[cmdk-group-heading]]:tw-text-xs [&_[cmdk-group-heading]]:tw-font-medium [&_[cmdk-group-heading]]:tw-text-muted-foreground', props.class)"
  >
    <ComboboxLabel v-if="heading" class="tw-px-2 tw-py-1.5 tw-text-xs tw-font-medium tw-text-muted-foreground">
      {{ heading }}
    </ComboboxLabel>
    <slot />
  </ComboboxGroup>
</template>
