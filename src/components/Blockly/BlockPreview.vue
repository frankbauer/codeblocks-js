<template>
    <div class="q-ml-lg q-pb-sm q-pl-lg">
        <div
            class="blocklyBlockContainer"
            ref="blocklyPreviewContainer"
            :style="`width:${width}; height:${height}`"
        ></div>
    </div>
</template>

<script lang="ts">
import 'reflect-metadata'
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import Blockly from '@/plugins/blocklyEnv'

import { blocklyHelper, ColorSelectionWithNone, theme } from '@/lib/BlocklyHelper'
import { IBlocklyToolboxCategory, IBlockDefinition, BlockPrimaryColors } from '@/lib/IBlocklyHelper'

import { uuid } from 'vue-uuid'

/**
 * Name of block if not named.
 * @type string
 */
const UNNAMED = 'unnamed'

@Component
export default class BlockEditor extends Vue {
    @Prop({ required: true }) blockDefinition!: IBlockDefinition
    @Prop({ default: '100%' }) width!: string
    @Prop({ default: '100px' }) height!: string

    previewWorkspace: Blockly.Workspace | undefined = undefined

    get blocklyPreviewContainer(): Element {
        return this.$refs.blocklyPreviewContainer as Element
    }

    mounted() {
        this.updatePreview()
    }

    @Watch('blockDefinition.JSON', { immediate: false, deep: true })
    onJSONUpdate() {
        this.updatePreview()
    }

    private updatePreview() {
        if (!this.previewWorkspace) {
            console.d('INJECT BLOCKLY PREVIEW', this.blocklyPreviewContainer)
            this.previewWorkspace = Blockly.inject(this.blocklyPreviewContainer, {
                scrollbars: false,
                theme: theme,
                renderer: 'minimalist',
                zoom: {
                    controls: false,
                    wheel: false,
                    startScale: 0.75,
                    maxScale: 2,
                    minScale: 0.3,
                    scaleSpeed: 1.2
                }
            })
        }

        this.previewWorkspace.clear()

        const code = blocklyHelper.serializeCustomBlock(this.blockDefinition)
        if (!code.trim()) {
            return
        }

        // Backup Blockly.Blocks object so that main workspace and preview don't
        // collide if user creates a 'factory_base' block, for instance.
        const backupBlocks = Blockly.Blocks
        try {
            // Make a shallow copy.
            Blockly.Blocks = Object.create(null)
            for (let prop in backupBlocks) {
                Blockly.Blocks[prop] = backupBlocks[prop]
            }

            const json = JSON.parse(code)
            Blockly.Blocks[json.type || UNNAMED] = {
                init: function() {
                    this.jsonInit(json)
                }
            }

            // Look for a block on Blockly.Blocks that does not match the backup.
            let blockType: string | null = null
            for (let type in Blockly.Blocks) {
                if (
                    typeof Blockly.Blocks[type].init == 'function' &&
                    Blockly.Blocks[type] != backupBlocks[type]
                ) {
                    blockType = type
                    break
                }
            }
            if (!blockType) {
                return
            }

            // Create the preview block.
            const previewBlock: any = this.previewWorkspace.newBlock(blockType)
            previewBlock.initSvg()
            previewBlock.render()
            previewBlock.setMovable(false)
            previewBlock.setDeletable(false)
            previewBlock.moveBy(0, 0)
            this.previewWorkspace.clearUndo()
        } catch (err) {
            // TODO: Show error on the UI
            console.log(err)
        } finally {
            Blockly.Blocks = backupBlocks
        }
    }
}
</script>

<style lang="stylus">
@import '../../styles/quasar.variables.styl'

.blocklyBlockContainer
    .blocklySvg
        width: 100%
        height: 100%
        border: 0px solid white
        background-color: $blue-grey-2
        .blocklyMainBackground
            stroke-width: 0px
</style>
