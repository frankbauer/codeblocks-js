<template>
    <div
        class="tw-flex tw-w-full ma-0 pa-0 block-playground"
        :data-question="block.parentID"
        :data-nr="block.id"
    >
        <div
            class="tw-w-full tw-flex"
            :class="{
                'tw-justify-start': block.align === 'left',
                'tw-justify-center': block.align === 'center',
                'tw-justify-end': block.align === 'right',
            }"
            v-if="block.generateTemplate"
        >
            <div
                ref="innerPlaygroundContainer"
                class="playground"
                :style="`width:${block.width};height:${block.height}`"
                :data-question="block.parentID"
                :data-nr="block.id"
            ></div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { IRandomizerSet } from '@/lib/ICodeBlocks'
import { BlockData } from '@/lib/codeBlocksManager'
import { IScriptBlock, Runner } from '@/lib/IScriptBlock'
import { computed, nextTick, onBeforeUnmount, onMounted, PropType, ref } from 'vue'
import { EventHubType } from '@/composables/globalEvents'
import compilerRegistry from '@/lib/CompilerRegistry'

const props = defineProps({
    output: String,
    obj: {
        type: Object as PropType<IScriptBlock>,
        required: true,
    },
    block: {
        type: Object as PropType<BlockData>,
        required: true,
    },
    eventHub: {
        type: Object as PropType<EventHubType>,
        required: true,
    },
    tagSet: {
        type: Object as PropType<IRandomizerSet>,
        required: false,
    },
    runner: {
        type: Function as PropType<Runner>,
        default: () => {},
    },
})

const emit = defineEmits(['did-init', 'canvas-change'])

const innerPlaygroundContainer = ref<HTMLElement | null>(null)

const canvas = computed(() => {
    console.log('PLAYGROUND REF:', innerPlaygroundContainer.value)
    return innerPlaygroundContainer.value || undefined
})

defineExpose({ canvas })

function whenMounted(): void {
    if (props.obj && compilerRegistry !== undefined) {
        console.d('Will Init', canvas, $(canvas.value).css('background-color'))
        compilerRegistry.loadLibraries(props.block.domLibs, () => {
            console.d('Will Init', canvas, $(canvas.value).css('background-color'))
            props.obj.resetResources()
            props.obj.resetBlockData(props.block.appSettings.blocks)
            props.obj.rebuild()
            props.obj.setupDOM($(canvas.value), props.block.scope)
            nextTick(() => {
                nextTick(() => {
                    props.obj.init($(canvas.value), props.block.scope, props.runner)
                    emit('did-init', canvas.value)
                })
            })
        })
    }
}

onMounted(() => {
    if (props.eventHub) {
        props.eventHub.on('all-mounted', whenMounted)
    } else {
        whenMounted()
    }

    emit('canvas-change', canvas.value)
})

onBeforeUnmount(() => {
    if (props.eventHub) {
        props.eventHub.off('all-mounted')
    }
})
</script>

<style lang="sass" scoped>
.playground
    display: inline-block
    width: 100%
    height: 200px
    border: none
    border-radius: 8px
    background-color: #ffffff
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04)
    margin-top: 8px
    margin-bottom: 8px
    transition: opacity 600ms, visibility 600ms, box-shadow 0.3s ease
    overflow: hidden

    &:hover
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.06)
</style>
