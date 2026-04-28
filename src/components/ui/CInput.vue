<script setup lang="ts">
import { Input } from '@/shadcn/ui/input'
import { Label } from '@/shadcn/ui/label'
import { computed } from 'vue'

interface Props {
    modelValue: string | number
    label?: string
    rules?: ((value: any) => boolean | string)[]
    placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
    label: undefined,
    rules: () => [],
    placeholder: '',
})

const emit = defineEmits(['update:modelValue'])

const error = computed(() => {
    for (const rule of props.rules) {
        const result = rule(props.modelValue)
        if (result !== true) {
            return result
        }
    }
    return null
})
</script>

<template>
    <div class="tw-space-y-2">
        <Label v-if="label" :class="{ 'tw-text-destructive': error }">{{ label }}</Label>
        <Input
            :model-value="modelValue"
            @update:model-value="emit('update:modelValue', $event)"
            :placeholder="placeholder"
            :class="{ 'tw-border-destructive': error }"
        />
        <p v-if="error" class="tw-text-sm tw-text-destructive">{{ error }}</p>
    </div>
</template>
