<script setup lang="ts">
import type { ListboxItemEmits, ListboxItemProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit, useCurrentElement } from '@vueuse/core'
import { ListboxItem, useForwardPropsEmits, useId } from 'reka-ui'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { cn } from '@/lib/utils'
import { useCommand, useCommandGroup } from '.'

const props = defineProps<ListboxItemProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<ListboxItemEmits>()

const delegatedProps = reactiveOmit(props, 'class')

const forwarded = useForwardPropsEmits(delegatedProps, emits)

const id = useId()
const { filterState, allItems, allGroups } = useCommand()
const groupContext = useCommandGroup()

const isRender = computed(() => {
    if (!filterState.search) {
        return true
    } else {
        const filteredCurrentItem = filterState.filtered.items.get(id)
        // If the filtered items is undefined means not in the all times map yet
        // Do the first render to add into the map
        if (filteredCurrentItem === undefined) {
            return true
        }

        // Check with filter
        return filteredCurrentItem > 0
    }
})

const itemRef = ref()
const currentElement = useCurrentElement(itemRef)
onMounted(() => {
    if (!(currentElement.value instanceof HTMLElement)) {
        return
    }

    // textValue to perform filter
    allItems.value.set(id, currentElement.value.textContent ?? props?.value!.toString())

    const groupId = groupContext?.id
    if (groupId) {
        if (!allGroups.value.has(groupId)) {
            allGroups.value.set(groupId, new Set([id]))
        } else {
            allGroups.value.get(groupId)?.add(id)
        }
    }
})
onUnmounted(() => {
    allItems.value.delete(id)
})
</script>

<template>
    <ListboxItem
        v-if="isRender"
        v-bind="forwarded"
        :id="id"
        ref="itemRef"
        :class="
            cn(
                'tw-relative tw-flex tw-cursor-default tw-gap-2 tw-select-none tw-items-center tw-rounded-sm tw-px-2 tw-py-1.5 tw-text-sm tw-outline-none data-[highlighted]:tw-bg-accent data-[highlighted]:tw-text-accent-foreground data-[disabled]:tw-pointer-events-none data-[disabled]:tw-opacity-50 [&_svg]:tw-size-4 [&_svg]:tw-shrink-0',
                props.class
            )
        "
        @select="
            () => {
                filterState.search = ''
            }
        "
    >
        <slot />
    </ListboxItem>
</template>
