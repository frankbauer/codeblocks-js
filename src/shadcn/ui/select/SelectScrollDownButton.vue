<script setup lang="ts">
import type { SelectScrollDownButtonProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { ChevronDown } from "lucide-vue-next"
import { SelectScrollDownButton, useForwardProps } from "reka-ui"
import { cn } from "@/lib/utils"

const props = defineProps<SelectScrollDownButtonProps & { class?: HTMLAttributes["class"] }>()

const delegatedProps = reactiveOmit(props, "class")

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <SelectScrollDownButton v-bind="forwardedProps" :class="cn('tw-flex tw-cursor-default tw-items-center tw-justify-center tw-py-1', props.class)">
    <slot>
      <ChevronDown />
    </slot>
  </SelectScrollDownButton>
</template>
