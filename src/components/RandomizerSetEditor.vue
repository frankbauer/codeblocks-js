<template>
    <q-popup-proxy transition-show="flip-up" transition-hide="flip-down" @before-show="onShow">
        <!-- LineNumbers -->
        <div class="q-pa-md">
            <div class="row no-wrap q-pt-none q-pb-md">
                <div class="text-overline">{{ $t('RandomizerSetEditor.Caption', { nr: nr }) }}</div>
            </div>
            <div class="q-pl-md" v-for="tag in tagSet.values" v-bind:key="tag.tag">
                <q-input v-model="tag.value" :label="tag.tag" />
            </div>
        </div>
    </q-popup-proxy>
</template>

<script lang="ts">
import { IRandomizerSet } from '@/lib/ICodeBlocks'
import { computed, ComputedRef, defineComponent, PropType } from 'vue'
import { ICodeBlockSettingsOptions } from '@/components/CodeBlocksSettings.vue'

export default defineComponent({
    name: 'RandomizerSetEditor',
    components: {},
    props: {
        options: {
            type: Object as PropType<ICodeBlockSettingsOptions>,
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

        function onShow(o) {
            props.tagSet.values = props.tagSet.values.filter(
                (v) => props.options.randomizer.knownTags.indexOf(v.tag) >= 0
            )
            props.options.randomizer.knownTags.forEach((t) => {
                if (props.tagSet.values.find((v) => v.tag == t) === undefined) {
                    props.tagSet.values.push({
                        tag: t,
                        value: '',
                    })
                }
            })
        }

        return {
            tags,
            onShow,
        }
    },
})
</script>

<style></style>
