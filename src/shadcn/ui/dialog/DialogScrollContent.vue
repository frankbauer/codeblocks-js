<script setup lang="ts">
import type { DialogContentEmits, DialogContentProps } from 'radix-vue'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { Cross2Icon } from '@radix-icons/vue'
import {
  DialogClose,
  DialogContent,

  DialogOverlay,
  DialogPortal,
  useForwardPropsEmits,
} from 'radix-vue'
import { computed } from 'vue'

const props = defineProps<DialogContentProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<DialogContentEmits>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props

  return delegated
})

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <DialogPortal>
    <DialogOverlay
      class="tw-fixed tw-inset-0 tw-z-50 tw-grid tw-place-items-center tw-overflow-y-auto tw-bg-black/80 tw- data-[state=open]:tw-animate-in data-[state=closed]:tw-animate-out data-[state=closed]:tw-fade-out-0 data-[state=open]:tw-fade-in-0"
    >
      <DialogContent
        :class="
          cn(
            'tw-relative tw-z-50 tw-grid tw-w-full tw-max-w-lg tw-my-8 tw-gap-4 tw-border tw-border-border tw-bg-background tw-p-6 tw-shadow-lg tw-duration-200 sm:tw-rounded-lg md:tw-w-full',
            props.class,
          )
        "
        v-bind="forwarded"
        @pointer-down-outside="(event) => {
          const originalEvent = event.detail.originalEvent;
          const target = originalEvent.target as HTMLElement;
          if (originalEvent.offsetX > target.clientWidth || originalEvent.offsetY > target.clientHeight) {
            event.preventDefault();
          }
        }"
      >
        <slot />

        <DialogClose
          class="tw-absolute tw-top-4 tw-right-4 tw-p-0.5 tw-transition-colors tw-rounded-md hover:tw-bg-secondary"
        >
          <Cross2Icon class="tw-w-4 tw-h-4" />
          <span class="tw-sr-only">Close</span>
        </DialogClose>
      </DialogContent>
    </DialogOverlay>
  </DialogPortal>
</template>
