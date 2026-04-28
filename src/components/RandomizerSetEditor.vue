<template>
    <div class="tw-space-y-3">
        <div v-for="tag in tagSet.values" :key="tag.tag">
            <div class="tw-flex tw-items-baseline tw-justify-between tw-mb-1">
                <LabelComponent :for="`tag-${tag.tag}`" class="tw-text-sm tw-font-medium">
                    {{ tag.tag }}
                </LabelComponent>
                <span class="tw-text-xs tw-text-muted-foreground tw-font-mono"
                    >{:{{ tag.tag }}}</span
                >
            </div>
            <InputComponent :id="`tag-${tag.tag}`" v-model="tag.value" class="tw-w-full" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { IRandomizerSet } from '@/lib/ICodeBlocks'
import { computed, onMounted, PropType } from 'vue'

interface IRandomizerOptions {
    randomizer: {
        knownTags: string[]
    }
}

import { Input } from '@/shadcn/ui/input'
import { Label } from '@/shadcn/ui/label'
const InputComponent = Input
const LabelComponent = Label

const props = defineProps({
    options: {
        type: Object as PropType<IRandomizerOptions>,
        required: true,
    },
    tagSet: {
        type: Object as PropType<IRandomizerSet>,
        required: true,
    },
    nr: {
        type: Number,
        required: true,
    },
})

const tags = computed(() => {
    return props.tagSet.values.map((v) => v.tag)
})

function onShow() {
    // Direct prop mutation is intentional here — tagSet is a reference into the parent's data

    props.tagSet.values = props.tagSet.values.filter(
        (v) => props.options.randomizer.knownTags.indexOf(v.tag) >= 0
    )
    props.options.randomizer.knownTags.forEach((t) => {
        if (props.tagSet.values.find((v) => v.tag == t) === undefined) {
            props.tagSet.values.push({ tag: t, value: '' })
        }
    })
}

onMounted(() => {
    onShow()
})
</script>

<style></style>
