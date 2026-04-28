<script setup lang="ts">
import type { HoverCardContentProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { HoverCardContent, HoverCardPortal, useForwardProps } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = withDefaults(
    defineProps<HoverCardContentProps & { class?: HTMLAttributes['class'] }>(),
    {
        sideOffset: 4,
    }
)

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
    <HoverCardPortal>
        <HoverCardContent
            v-bind="forwardedProps"
            :class="
                cn(
                    'tw-z-50 tw-w-64 tw-rounded-md tw-border tw-bg-popover tw-p-4 tw-text-popover-foreground tw-shadow-md tw-outline-none data-[state=open]:tw-animate-in data-[state=closed]:tw-animate-out data-[state=closed]:tw-fade-out-0 data-[state=open]:tw-fade-in-0 data-[state=closed]:tw-zoom-out-95 data-[state=open]:tw-zoom-in-95 data-[side=bottom]:tw-slide-in-from-top-2 data-[side=left]:tw-slide-in-from-right-2 data-[side=right]:tw-slide-in-from-left-2 data-[side=top]:tw-slide-in-from-bottom-2',
                    props.class
                )
            "
        >
            <slot />
        </HoverCardContent>
    </HoverCardPortal>
</template>
