<script setup lang="ts">
import type { AccordionTriggerProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { ChevronDown } from "lucide-vue-next"
import {
  AccordionHeader,
  AccordionTrigger,

} from "reka-ui"
import { cn } from "@/lib/utils"

const props = defineProps<AccordionTriggerProps & { class?: HTMLAttributes["class"] }>()

const delegatedProps = reactiveOmit(props, "class")
</script>

<template>
  <AccordionHeader class="tw-flex">
    <AccordionTrigger
      v-bind="delegatedProps"
      :class="
        cn(
          'tw-flex tw-flex-1 tw-items-center tw-justify-between tw-py-4 tw-text-sm tw-font-medium tw-transition-all hover:tw-underline [&[data-state=open]>svg]:tw-rotate-180',
          props.class,
        )
      "
    >
      <slot />
      <slot name="icon">
        <ChevronDown
          class="tw-h-4 tw-w-4 tw-shrink-0 tw-text-muted-foreground tw-transition-transform tw-duration-200"
        />
      </slot>
    </AccordionTrigger>
  </AccordionHeader>
</template>
