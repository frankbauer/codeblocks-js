<template>
    <div>
        <div
            class="row ma-0 pa-0 block-blockly"
            :data-question="block.parentID"
            :data-nr="block.id"
        >
            <div :class="`col-12 text-${block.align}`">
                <div class="blocklyCanvas" :style="`width:${block.width};height:${block.height}`">
                    <div class="blocklyContainer" ref="blocklyContainer"></div>
                </div>
            </div>
        </div>
        <xml ref="blocklyToolbox" style="display:none" v-html="toolboxContent"> </xml>
        <div v-if="editMode">
            <q-list bordered class="rounded-borders q-mt-sm">
                <q-expansion-item
                    expand-separator
                    icon="code"
                    :label="$t('Blockly.CodePreviewLabel')"
                    :caption="$t('Blockly.CodePreviewCaption')"
                    @before-show="onBeforeShow"
                >
                    <textarea
                        :name="`block[${block.parentID}][${block.id}]`"
                        v-html="block.content"
                        style="display:block"
                    ></textarea>
                    <CodeBlock
                        v-if="editMode"
                        :block="cmblock"
                        :theme="cmoptions.theme"
                        :mode="cmoptions.mode"
                        :visibleLines="visibleLinesNow"
                        :editMode="false"
                        :muteReadyState="true"
                        namePrefix="preview_"
                        @code-changed-in-edit-mode="onCodeChange"
                    />
                </q-expansion-item>

                <q-expansion-item
                    expand-separator
                    :default-opened="true"
                    icon="developer_board"
                    :label="$t('Blockly.CustomBlocksLabel')"
                    :caption="$t('Blockly.CustomBlocksCaption')"
                    @before-show="onBeforeShow"
                >
                    <BlocklyCustomBlocksEditor :block="block" />
                </q-expansion-item>

                <q-expansion-item
                    expand-separator
                    :default-opened="true"
                    icon="ballot"
                    :label="$t('Blockly.ToolboxLabel')"
                    :caption="$t('Blockly.ToolboxCaption')"
                    @before-show="onBeforeShow"
                >
                    <BlocklyToolboxEditor :block="block" />
                </q-expansion-item>

                <q-expansion-item
                    expand-separator
                    icon="event_note"
                    :expanded="true"
                    :label="$t('Blockly.RAWToolboxLabel')"
                    :caption="$t('Blockly.RAWToolboxCaption')"
                    @before-show="onBeforeShow"
                >
                    <CodeBlock
                        v-if="editMode"
                        :block="tbblock"
                        :theme="tboptions.theme"
                        :mode="tboptions.mode"
                        :visibleLines="visibleLinesNow"
                        :editMode="false"
                        :muteReadyState="true"
                        namePrefix="toolbox_"
                        @code-changed-in-edit-mode="onToolboxChange"
                    />
                </q-expansion-item>
            </q-list>
        </div>
    </div>
</template>

<script lang="ts">
import Blockly from '@/plugins/blocklyEnv'
import 'reflect-metadata'
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'

import CodeBlock from './CodeBlock.vue'
import BlocklyCustomBlocksEditor from '@/components/BlocklyCustomBlocksEditor.vue'
import BlocklyToolboxEditor from '@/components/BlocklyToolboxEditor.vue'

import { BlockData } from '@/lib/codeBlocksManager'
import { IRandomizerSet } from '@/lib/ICodeBlocks'
import {
    BlockPrimaryColors,
    BlockSecondaryColors,
    BlockTertiaryColors
} from '../lib/IBlocklyHelper'

@Component({
    components: {
        CodeBlock,
        BlocklyCustomBlocksEditor,
        BlocklyToolboxEditor
    }
})
export default class BlocklyBlock extends Vue {
    @Prop({ default: '' }) namePrefix!: string
    @Prop({ default: false }) readonly!: boolean
    @Prop({ default: false }) editMode!: boolean
    @Prop({ default: 'auto' }) visibleLines!: number | 'auto'
    @Prop({ default: 'base16-dark' }) theme!: string
    @Prop({ default: 'text/javascript' }) mode!: string
    @Prop({ default: undefined }) tagSet!: IRandomizerSet
    @Prop({ required: true }) block!: BlockData

    workspace: Blockly.Workspace | null = null
    tmpcode: string = ''

    beforeDestroy() {
        if (this.block._oac) {
            this.block.actualContent = this.block._oac
            this.block._oac = undefined
        }
    }
    get blocklyContainer(): Element {
        return this.$refs.blocklyContainer as Element
    }

    get blocklyToolbox(): Element {
        const el = this.$refs.blocklyToolbox as Element
        return el
    }

    unmountBlockly() {
        if (this.workspace !== null) {
            this.blocklyContainer.innerHTML = ''
            this.workspace = null
        }
    }

    remountBlockly() {
        if (this.workspace !== null) {
            this.unmountBlockly()
        }
        this.mountBlockly()
    }

    mountBlockly() {
        const options = this.$props.options || {}
        if (!options.toolbox) {
            options.toolbox = this.blocklyToolbox
        }
        if (!options.theme) {
            const blockStyles = {
                colour_blocks: {
                    colourPrimary: BlockPrimaryColors.colour,
                    colourSecondary: BlockSecondaryColors.colour,
                    colourTertiary: BlockTertiaryColors.colour
                },
                list_blocks: {
                    colourPrimary: BlockPrimaryColors.list,
                    colourSecondary: BlockSecondaryColors.list,
                    colourTertiary: BlockTertiaryColors.list
                },
                logic_blocks: {
                    colourPrimary: BlockPrimaryColors.logic,
                    colourSecondary: BlockSecondaryColors.logic,
                    colourTertiary: BlockTertiaryColors.logic
                },
                loop_blocks: {
                    colourPrimary: BlockPrimaryColors.loop,
                    colourSecondary: BlockSecondaryColors.loop,
                    colourTertiary: BlockTertiaryColors.loop
                },
                math_blocks: {
                    colourPrimary: BlockPrimaryColors.math,
                    colourSecondary: BlockSecondaryColors.math,
                    colourTertiary: BlockTertiaryColors.math
                },
                procedure_blocks: {
                    colourPrimary: BlockPrimaryColors.procedure,
                    colourSecondary: BlockSecondaryColors.procedure,
                    colourTertiary: BlockTertiaryColors.procedure
                },
                text_blocks: {
                    colourPrimary: BlockPrimaryColors.text,
                    colourSecondary: BlockSecondaryColors.text,
                    colourTertiary: BlockTertiaryColors.text
                },
                variable_blocks: {
                    colourPrimary: BlockPrimaryColors.variable,
                    colourSecondary: BlockSecondaryColors.variable,
                    colourTertiary: BlockTertiaryColors.variable
                },
                variable_dynamic_blocks: {
                    colourPrimary: BlockPrimaryColors.variable_dynamic,
                    colourSecondary: BlockSecondaryColors.variable_dynamic,
                    colourTertiary: BlockTertiaryColors.variable_dynamic
                },
                hat_blocks: {
                    colourPrimary: '330',
                    hat: 'cap'
                }
            }

            const categoryStyles = {
                colour_category: { colour: blockStyles.colour_blocks.colourPrimary },
                list_category: { colour: blockStyles.list_blocks.colourPrimary },
                logic_category: { colour: blockStyles.logic_blocks.colourPrimary },
                loop_category: { colour: blockStyles.loop_blocks.colourPrimary },
                math_category: { colour: blockStyles.math_blocks.colourPrimary },
                procedure_category: { colour: blockStyles.procedure_blocks.colourPrimary },
                text_category: { colour: blockStyles.text_blocks.colourPrimary },
                variable_category: { colour: blockStyles.variable_blocks.colourPrimary },
                variable_dynamic_category: {
                    colour: blockStyles.variable_dynamic_blocks.colourPrimary
                }
            }
            options.theme = new Blockly.Theme(blockStyles as any, categoryStyles)
        }
        options.renderer = 'minimalist'
        this.workspace = Blockly.inject(this.blocklyContainer, options)
        this.workspace.addChangeListener(this.onBlocklyChange.bind(this))
        this.content = this.block.content
    }

    mounted() {
        if (!this.block._oac) {
            let self = this
            this.block._oac = this.block.actualContent
            this.block.actualContent = function() {
                return self.code
            }
        }

        this.mountBlockly()
    }
    get cmoptions() {
        return {
            // codemirror options
            mode: this.$CodeBlock.mimeType('javascript'),
            theme: this.block.getThemeForBlock(this.cmblock),
            lineNumbers: true,
            line: true,
            tabSize: 4,
            indentUnit: 4,
            autoCloseBrackets: true,
            readOnly: true,
            firstLineNumber: 1,
            gutters: ['diagnostics', 'CodeMirror-linenumbers']
        }
    }
    get cmblock() {
        return {
            type: 'BLOCKLY',
            content: this.code,
            scopeUUID: this.block.scopeUUID,
            firstLine: 1,
            hidden: false,
            readonly: true,
            static: true,
            alternativeContent: this.code,
            parentID: this.block.parentID,
            id: this.block.id,
            actualContent: () => {
                return this.code
            }
        }
    }
    get tboptions() {
        return {
            mode: this.$CodeBlock.mimeType('xml'),
            theme: this.block.getThemeForBlock(this.tbblock),
            lineNumbers: true,
            line: true,
            tabSize: 4,
            indentUnit: 4,
            readOnly: true,
            firstLineNumber: 1,
            gutters: []
        }
    }
    get tbblock() {
        return {
            type: 'XML',
            content: this.block.blockly.toolbox,
            scopeUUID: this.block.scopeUUID,
            firstLine: 1,
            hidden: false,
            readonly: true,
            static: true,
            alternativeContent: '',
            parentID: this.block.parentID,
            id: this.block.id,
            actualContent: () => {
                return this.block.blockly.toolbox
            }
        }
    }
    get toolboxContent(): string {
        if (this.block.blockly.toolbox === null) {
            return '<xml></xml>'
        }
        return this.parseToolboxCode(this.block.blockly.toolbox)
    }
    get visibleLinesNow() {
        if (!this.block.codeExpanded) {
            return '5.2'
        }
        return 'auto'
    }
    get code() {
        if (this.workspace) {
            const BBlockly = Blockly as any
            if (
                this.mode == 'text/x-python' ||
                this.mode == 'text/python' ||
                this.mode == 'python'
            ) {
                return BBlockly.Python.workspaceToCode(this.workspace)
            } else if (
                this.mode == 'text/x-java' ||
                this.mode == 'text/java' ||
                this.mode == 'java'
            ) {
                return BBlockly.Java.workspaceToCode(this.workspace)
            }
            return BBlockly.JavaScript.workspaceToCode(this.workspace)
        } else {
            return ''
        }
    }
    get content(): string {
        if (this.workspace) {
            let xml = Blockly.Xml.workspaceToDom(this.workspace)
            if (xml) {
                return Blockly.Xml.domToText(xml)
            }
        }
        return ''
    }
    set content(text: string) {
        if (this.workspace && text && text != '') {
            try {
                let dom = Blockly.Xml.textToDom(text)
                if (dom) {
                    Blockly.Xml.domToWorkspace(dom, this.workspace)
                }
            } catch (e) {
                console.error('toDOM Error', e)
            }
        }
    }

    private onBeforeShow(e: MouseEvent) {
        this.$CodeBlock.refreshAllCodeMirrors()
    }

    onCodeChange(newCode) {
        if (this.editMode) {
            //Nothing to do yet
        }
    }
    onBlocklyChange(e) {
        this.tmpcode = this.code
        this.block.content = this.content
    }
    onToolboxChange(newCode) {
        if (this.workspace) {
            const ws = this.workspace as any
            ws.updateToolbox(this.parseToolboxCode('<xml>' + this.tbblock.content + '</xml>'))
        }
    }

    private parseToolboxCode(toolboxXML: string) {
        Object.keys(BlockPrimaryColors).forEach(key => {
            toolboxXML = toolboxXML.replaceAll(`{!PrimaryColors.${key}}`, BlockPrimaryColors[key])
        })
        Object.keys(BlockSecondaryColors).forEach(key => {
            toolboxXML = toolboxXML.replaceAll(
                `{!SecondaryColors.${key}}`,
                BlockSecondaryColors[key]
            )
        })
        Object.keys(BlockTertiaryColors).forEach(key => {
            toolboxXML = toolboxXML.replaceAll(`{!TertiaryColors.${key}}`, BlockTertiaryColors[key])
        })

        return toolboxXML
    }

    @Watch('block.width')
    onWidthChange(oldWidth: string, newWidth: string) {
        this.$nextTick(() => {
            this.remountBlockly()
        })
    }

    @Watch('block.height', { immediate: false })
    onHeightChange(oldHeight: string, newHeight: string) {
        this.$nextTick(() => {
            this.remountBlockly()
        })
    }

    @Watch('block.align')
    onAlignChange(oldAlign: string, newAlign: string) {
        this.$nextTick(() => {
            this.remountBlockly()
        })
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->

<style lang="sass" scoped>
.blocklyContainer
    height: 100%
    width: 100%
    text-align: left
    border: 1px solid #eee
    border-radius: 3px
.blocklyCanvas
    overflow: hidden
    display: block
    width:100%
    height:200px
    margin-top:4px
    margin-bottom:4px
    transition: opacity 600ms, visibility 600ms
</style>
<style lang="sass">
.blocklyText
    font-family: 'Roboto', '-apple-system', 'Helvetica Neue', Helvetica, Arial, sans-serif
    font-weight: 300
.blocklyEditableText
    .blocklyText
        font-weight:500
.blocklyMainBackground
    stroke:#fff
.blocklyScrollbarHandle
    fill:#eee
.blocklyToolboxDiv
    padding:4px
    border-top-right-radius: 3px
    border-bottom-right-radius: 3px
    background-color:#eee
    box-shadow: 1px 2px 8px #ddd

.blocklyTreeRow
    border-radius:3px
.blocklyTreeSelected
    .blocklyTreeLabel
        font-weight: 900
.blocklyTreeLabel
    font-family: 'Roboto', '-apple-system', 'Helvetica Neue', Helvetica, Arial, sans-serif
    color:#444
    font-weight: 300
.blocklyFlyoutBackground
    fill:#eee
.blocklyFlyoutScrollbar
    .blocklyScrollbarHandle
        fill:#ddd
</style>
