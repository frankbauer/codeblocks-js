<script setup lang="ts">
import { ref, watch } from 'vue'
import { Check, ChevronsUpDown, X } from 'lucide-vue-next'
import { Button } from '@/shadcn/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/shadcn/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shadcn/ui/popover'
import { cn } from '@/lib/utils'

interface Option {
  label: string
  value: string | number
}

const props = defineProps<{
  modelValue: Option[]
  options: Option[]
  placeholder?: string
}>()

const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const value = ref<Option[]>(props.modelValue || [])

watch(() => props.modelValue, (newVal) => {
  value.value = newVal
})

const removeItem = (item: Option) => {
  const newValue = value.value.filter((v) => v.value !== item.value)
  value.value = newValue
  emit('update:modelValue', newValue)
}

const toggleItem = (item: Option) => {
  const exists = value.value.some((v) => v.value === item.value)
  const newValue = exists
    ? value.value.filter((v) => v.value !== item.value)
    : [...value.value, item]
  value.value = newValue
  emit('update:modelValue', newValue)
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        role="combobox"
        :aria-expanded="open"
        class="tw-w-full tw-justify-between"
      >
        <div class="tw-flex tw-flex-wrap tw-gap-1">
          <template v-if="value.length > 0">
            <div
              v-for="item in value"
              :key="item.value"
              class="tw-flex tw-items-center tw-gap-1 tw-rounded-md tw-bg-secondary tw-px-2 tw-py-1"
            >
              <span>{{ item.label }}</span>
              <X
                class="tw-h-4 tw-w-4 tw-cursor-pointer hover:tw-text-destructive"
                @click.stop="removeItem(item)"
              />
            </div>
          </template>
          <span v-else class="tw-text-muted-foreground">
            {{ placeholder || "Select items..." }}
          </span>
        </div>
        <ChevronsUpDown class="tw-ml-2 tw-h-4 tw-w-4 tw-shrink-0 tw-opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent class="tw-w-full tw-p-0">
      <Command>
        <CommandInput placeholder="Search items..." />
        <CommandEmpty>No item found.</CommandEmpty>
        <CommandGroup>
          <CommandItem
            v-for="option in options"
            :key="option.value"
            :value="option.label"
            @select="() => toggleItem(option)"
          >
            <Check
              class="tw-mr-2 tw-h-4 tw-w-4"
              :class="{'tw-opacity-100': value.some(v => v.value === option.value), 'tw-opacity-0': !value.some(v => v.value === option.value)}"
            />
            {{ option.label }}
          </CommandItem>
        </CommandGroup>
      </Command>
    </PopoverContent>
  </Popover>
</template>