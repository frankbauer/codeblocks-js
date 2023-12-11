<template>
    <div class="row ma-0 pa-0 block-playground" :data-question="block.parentID" :data-nr="block.id">
        <div :class="`col-12 text-${block.align}`" v-if="block.generateTemplate">
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

<script lang="ts">
import { IRandomizerSet } from '@/lib/ICodeBlocks'
import { BlockData } from '@/lib/codeBlocksManager'
import { IScriptBlock, Runner } from '@/lib/IScriptBlock'
import Vue, {
    computed,
    ComputedRef,
    defineComponent,
    getCurrentInstance,
    nextTick,
    onBeforeUnmount,
    onMounted,
    PropType,
    Ref,
    ref,
} from 'vue'

export default defineComponent({
    name: 'PlaygroundCanvas',
    components: {},
    props: {
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
            type: Object as PropType<Vue>,
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
    },
    setup(props, context) {
        const instance = getCurrentInstance()
        const compilerRegistry = instance?.proxy?.$root?.$compilerRegistry
        const innerPlaygroundContainer: Ref<HTMLElement | null> = ref(null)

        const canvas: ComputedRef<HTMLElement> = computed(() => {
            console.log('PLAYGROUND REF:', innerPlaygroundContainer.value)
            if (innerPlaygroundContainer.value == null) {
                return new HTMLElement()
            }
            return innerPlaygroundContainer.value
        })

        function whenMounted(): void {
            if (props.obj && compilerRegistry !== undefined) {
                console.d('Will Init', canvas, $(canvas.value).css('background-color'))
                compilerRegistry.loadLibraries(props.block.domLibs, () => {
                    console.d('Will Init', canvas, $(canvas.value).css('background-color'))
                    props.obj.resetResources()
                    props.obj.resetBlockData(props.block.appSettings.blocks)
                    props.obj.rebuild() //we need to rebuild the script to make sure its context is the current state of the DOM
                    props.obj.setupDOM($(canvas.value), props.block.scope)
                    nextTick(() => {
                        nextTick(() => {
                            props.obj.init($(canvas.value), props.block.scope, props.runner)
                            context.emit('did-init', canvas)
                        })
                    })
                })
            }
        }

        onMounted(() => {
            if (props.eventHub) {
                props.eventHub.$on('all-mounted', whenMounted)
            } else {
                whenMounted()
            }

            context.emit('canvas-change', canvas)
        })

        onBeforeUnmount(() => {
            if (props.eventHub) {
                props.eventHub.$off('all-mounted')
            }
        })

        return {
            innerPlaygroundContainer,
            canvas,
        }
    },
})
</script>

<style lang="sass" scoped>
.playground
    display: inline-block
    width: 100%
    height: 200px
    border: 1px dashed rgb(128, 48, 48, 0.66)
    border-radius: 3px
    background-color: rgba(255, 255, 255, 0.63766)
    margin-top: 4px
    margin-bottom: 4px
    transition: opacity 600ms, visibility 600ms
</style>
