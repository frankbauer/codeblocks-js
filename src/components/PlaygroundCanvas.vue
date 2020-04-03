<template>
    <div class="row ma-0 pa-0 block-playground" :data-question="block.parentID" :data-nr="block.id">
        <div :class="`col-12 text-${block.align}`">
            <div
                ref="innerPlaygroundContainer"
                class="playground"
                :style="`width:${block.width};height:${block.height}`"
                :data-question="block.parentID"
                :data-nr="block.id"
            >
                {{ output }}
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import 'reflect-metadata'
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import { IRandomizerSet } from '@/lib/ICodeBlocks'
import { BlockData } from '@/lib/codeBlocksManager'
import { IScriptBlock } from '@/lib/IScriptBlock'

@Component
export default class PlaygroundCanvas extends Vue {
    @Prop() output: string = ''
    @Prop({ required: true }) obj!: IScriptBlock
    @Prop({ required: true }) block!: BlockData
    @Prop({ required: true }) eventHub!: Vue
    @Prop({ default: () => {} }) runner!: () => void
    @Prop() tagSet?: IRandomizerSet

    get canvas(): HTMLElement {
        return this.$refs.innerPlaygroundContainer as HTMLElement
    }

    whenMounted(): void {
        //console.d("MOUNTED");
        if (this.obj) {
            //console.d('Will Init', this.canvas, $(this.canvas).css('background-color'))

            this.$compilerRegistry.loadLibraries(this.block.domLibs, () => {
                this.$nextTick(() => {
                    this.obj.rebuild() //we need to rebuild the script to make sure its context is the current state of the DOM

                    this.obj.init($(this.canvas), $(this.block.scopeSelector), this.runner)
                    this.$emit('did-init', this.canvas)
                })
            })
        }
    }

    mounted() {
        if (this.eventHub) {
            this.eventHub.$on('all-mounted', this.whenMounted)
        } else {
            this.whenMounted()
        }

        this.$emit('canvas-change', this.canvas)
    }
    beforeDestroy() {
        if (this.eventHub) {
            this.eventHub.$off('all-mounted')
        }
    }
}
</script>

<style lang="sass" scoped>
.playground
    display: inline-block
    width:100%
    height:200px
    border:1px dashed rgb(128, 48, 48, 0.66)
    border-radius: 3px
    background-color:rgba(255, 255, 255, 0.63766)
    margin-top:4px
    margin-bottom:4px
    transition: opacity 600ms, visibility 600ms
</style>
