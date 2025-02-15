<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { Check, ChevronsUpDown, X } from 'lucide-vue-next'
import { Button } from '@/shadcn/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shadcn/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shadcn/ui/popover'

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
const searchQuery = ref('')

watch(() => props.modelValue, (newVal) => {
  value.value = newVal
})

const filteredOptions = computed(() => {
  return props.options.filter(option =>
    option.label.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
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
        class="tw-w-full tw-justify-between tw-min-h-[2.5rem] tw-h-auto tw-py-0.5"       
      >
        <div class="tw-flex tw-flex-wrap tw-gap-1">
          <template v-if="value.length > 0">
            <div
              v-for="item in value"
              :key="item.value"
              class="tw-flex tw-items-center tw-gap-1 tw-rounded-sm tw-bg-secondary tw-px-1.5 tw-py-0.5 tw-text-sm"
            >
              <span class="tw-break-all">{{ item.label }}</span>
              <button
                type="button"
                @click.stop="removeItem(item)"
                class="tw-flex tw-items-center tw-justify-center"
              >
                <X class="tw-h-3.5 tw-w-3.5 tw-cursor-pointer hover:tw-text-destructive tw-shrink-0" />
              </button>
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
        <CommandInput v-model="searchQuery" placeholder="Search items..." autoFocus />
        <CommandEmpty v-if="filteredOptions.length === 0">No item found.</CommandEmpty>
        <CommandList>
          <CommandGroup>
            <CommandItem
              v-for="option in filteredOptions"
              :key="option.value"
              :value="option.label"
              @select="() => toggleItem(option)"
              class="tw-cursor-pointer"
            >
              <Check
                class="tw-mr-2 tw-h-4 tw-w-4"
                :class="{
                  'tw-opacity-100': value.some(v => v.value === option.value),
                  'tw-opacity-0': !value.some(v => v.value === option.value)
                }"
              />
              {{ option.label }}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
</template>