<script setup lang="ts">
import { Loader2, LucideProps } from 'lucide-vue-next'
import { Button, type ButtonVariants, buttonVariants } from '@/shadcn/ui/button'
import { computed, type HTMLAttributes, toRefs } from 'vue'
import { cn } from '@/lib/utils'
import * as vue from 'vue'

interface Props {
    loading?: boolean
    disabled?: boolean
    variant?: ButtonVariants['variant']
    size?: ButtonVariants['size']
    class?: HTMLAttributes['class']
    icon?: vue.FunctionalComponent<LucideProps, {}, any, {}> | undefined
    fill?: string
    noText?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    loading: false,
    disabled: false,
    class: '',
    icon: undefined,
    variant: 'default',
    size: 'default',
    fill: '',
    noText: false,
})
const { loading, disabled, variant, size, fill, icon, noText } = toRefs(props)

const isIconVariant = computed(() => {
    return noText.value
})

const buttonClasses = computed(() => {
    return {
        'tw-opacity-50 tw-cursor-not-allowed': disabled.value,
    }
})

const iconClasses = computed(() => {
    return {
        'tw-ml-2': !isIconVariant.value,
    }
})
</script>

<template>
    <Button :class="cn(buttonClasses, props.class)" :variant="variant" :size="size">
        <Loader2 class="tw-w-4 tw-h-4 tw-animate-spin" v-if="loading" />
        <div class="tw-flex tw-w-full tw-justify-center tw-items-center" v-else>
            <div v-if="!isIconVariant">
                <slot />
            </div>
            <div v-if="icon" :class="iconClasses">
                <component :is="icon" :fill="fill" />
            </div>
        </div>
    </Button>
</template>

<style scoped lang="sass"></style>
