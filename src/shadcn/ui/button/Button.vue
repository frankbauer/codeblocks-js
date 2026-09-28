<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import type { ButtonVariants } from '.'
import { Primitive } from 'reka-ui'
import { cn } from '@/lib/utils'
import { buttonVariants } from '.'

interface Props extends PrimitiveProps {
    variant?: ButtonVariants['variant']
    size?: ButtonVariants['size']
    class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
    as: 'button',
})
</script>

<template>
    <!-- without a type, a <button> inside a form (e.g. an ILIAS test) submits that form;
         an explicit type attribute still wins through the attribute fallthrough -->
    <Primitive
        :as="as"
        :as-child="asChild"
        :type="!asChild && as === 'button' ? 'button' : undefined"
        :class="cn(buttonVariants({ variant, size }), props.class)"
    >
        <slot />
    </Primitive>
</template>
