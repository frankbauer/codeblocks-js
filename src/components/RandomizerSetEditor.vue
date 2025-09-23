<template>
    <div class="tw-space-y-4">
        <div v-for="tag in tagSet.values" v-bind:key="tag.tag" class="tw-space-y-2">
            <LabelComponent :for="`tag-${tag.tag}`" class="tw-text-sm tw-font-medium">
                {{ tag.tag }}
            </LabelComponent>
            <InputComponent :id="`tag-${tag.tag}`" v-model="tag.value" class="tw-w-full" />
        </div>
    </div>
</template>

<script lang="ts">
import { IRandomizerSet } from '@/lib/ICodeBlocks'
import { computed, ComputedRef, defineComponent, PropType, onMounted } from 'vue'

// Define a minimal interface for what we need
interface IRandomizerOptions {
    randomizer: {
        knownTags: string[]
    }
}

// shadcn components
import { Input } from '@/shadcn/ui/input'
import { Label } from '@/shadcn/ui/label'

export default defineComponent({
    name: 'RandomizerSetEditor',
    components: {
        InputComponent: Input,
        LabelComponent: Label,
    },
    props: {
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
    },
    setup(props, context) {
        const tags: ComputedRef<string[]> = computed(() => {
            return props.tagSet.values.map((v) => v.tag)
        })

        function onShow() {
            // Note: Direct prop mutation is intentional here for this component's design
            // eslint-disable-next-line vue/no-mutating-props
            props.tagSet.values = props.tagSet.values.filter(
                (v) => props.options.randomizer.knownTags.indexOf(v.tag) >= 0
            )
            props.options.randomizer.knownTags.forEach((t) => {
                if (props.tagSet.values.find((v) => v.tag == t) === undefined) {
                    // eslint-disable-next-line vue/no-mutating-props
                    props.tagSet.values.push({
                        tag: t,
                        value: '',
                    })
                }
            })
        }

        // Initialize the component when mounted
        onMounted(() => {
            onShow()
        })

        return {
            tags,
            onShow,
        }
    },
})
</script>

<style></style>
