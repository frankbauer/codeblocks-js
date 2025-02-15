<script setup lang="ts">
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shadcn/ui/select'
import { Label } from '@/shadcn/ui/label'

interface Option {
  label: string
  value: string | number
}

const props = defineProps<{
  modelValue: Option | string | number
  options: (Option | string | number)[]
  label?: string
  placeholder?: string
}>()

const emit = defineEmits(['update:modelValue'])

const getOptionLabel = (option: Option | string | number) => {
  if (typeof option === 'object') {
    return option.label
  }
  return option.toString()
}

const getOptionValue = (option: Option | string | number) => {
  if (typeof option === 'object') {
    return option.value
  }
  return option
}
</script>

<template>
  <div class="tw-space-y-2">
    <Label v-if="label">{{ label }}</Label>
    <Select :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)">
      <SelectTrigger>
        <SelectValue :placeholder="placeholder">
          {{ getOptionLabel(modelValue) }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem v-for="option in options" :key="getOptionValue(option)" :value="option">
          <slot name="option" :option="option">
            {{ getOptionLabel(option) }}
          </slot>
        </SelectItem>
      </SelectContent>
    </Select>
  </div>
</template>