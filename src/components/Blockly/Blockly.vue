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
                        style="display:none"
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
                    v-model="tbEditExpanded"
                    expand-separator
                    :default-opened="true"
                    :disable="useToolboxOverride"
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
                    <q-checkbox
                        v-model="block.blockly.useOverride"
                        :label="$t('Blockly.UseCustomToolbox')"
                        @input="onToolboxOverrideChange"
                    />
                    <CodeBlock
                        v-if="editMode"
                        :block="tbblock"
                        :theme="tboptions.theme"
                        :mode="tboptions.mode"
                        :visibleLines="visibleLinesNow"
                        :editMode="this.block.blockly.toolboxOverride"
                        :muteReadyState="true"
                        namePrefix="toolbox_"
                        @code-changed-in-edit-mode="onToolboxOverrideChange"
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

import CodeBlock from '@/components/CodeBlock.vue'
import BlocklyCustomBlocksEditor from '@/components/Blockly/BlocklyCustomBlocksEditor.vue'
import BlocklyToolboxEditor from '@/components/Blockly/BlocklyToolboxEditor.vue'

import { BlockData } from '@/lib/codeBlocksManager'
import { IRandomizerSet } from '@/lib/ICodeBlocks'
import { BlockPrimaryColors, BlockSecondaryColors, BlockTertiaryColors } from '@/lib/IBlocklyHelper'
import { blocklyHelper } from '@/lib/BlocklyHelper'

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
    tbEditExpanded: boolean = false

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
                    colourPrimary: BlockPrimaryColors.Colour,
                    colourSecondary: BlockSecondaryColors.Colour,
                    colourTertiary: BlockTertiaryColors.Colour
                },
                list_blocks: {
                    colourPrimary: BlockPrimaryColors.List,
                    colourSecondary: BlockSecondaryColors.List,
                    colourTertiary: BlockTertiaryColors.List
                },
                logic_blocks: {
                    colourPrimary: BlockPrimaryColors.Logic,
                    colourSecondary: BlockSecondaryColors.Logic,
                    colourTertiary: BlockTertiaryColors.Logic
                },
                loop_blocks: {
                    colourPrimary: BlockPrimaryColors.Loop,
                    colourSecondary: BlockSecondaryColors.Loop,
                    colourTertiary: BlockTertiaryColors.Loop
                },
                math_blocks: {
                    colourPrimary: BlockPrimaryColors.Math,
                    colourSecondary: BlockSecondaryColors.Math,
                    colourTertiary: BlockTertiaryColors.Math
                },
                procedure_blocks: {
                    colourPrimary: BlockPrimaryColors.Procedure,
                    colourSecondary: BlockSecondaryColors.Procedure,
                    colourTertiary: BlockTertiaryColors.Procedure
                },
                text_blocks: {
                    colourPrimary: BlockPrimaryColors.Text,
                    colourSecondary: BlockSecondaryColors.Text,
                    colourTertiary: BlockTertiaryColors.Text
                },
                variable_blocks: {
                    colourPrimary: BlockPrimaryColors.Variable,
                    colourSecondary: BlockSecondaryColors.Variable,
                    colourTertiary: BlockTertiaryColors.Variable
                },
                variable_dynamic_blocks: {
                    colourPrimary: BlockPrimaryColors.Variable_dynamic,
                    colourSecondary: BlockSecondaryColors.Variable_dynamic,
                    colourTertiary: BlockTertiaryColors.Variable_dynamic
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
        this.block.blockly.blocks.forEach(bl => {
            const B = Blockly as any
            console.log(blocklyHelper.filterCustomBlock(bl))
            B.Blocks[bl.type] = {
                init: function() {
                    this.jsonInit(blocklyHelper.filterCustomBlock(bl))
                }
            }

            if (this.isPython) {
                B.Python[bl.type] = bl.code
            } else if (this.isJava) {
                B.Java[bl.type] = bl.code
            } else {
                B.JavaScript[bl.type] = bl.code
            }
        })

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
    get useToolboxOverride(): boolean {
        return this.block.blockly.useOverride
    }
    get tboptions() {
        return {
            mode: this.$CodeBlock.mimeType('xml'),
            theme: this.block.getThemeForBlock(this.tbblock),
            lineNumbers: true,
            line: true,
            tabSize: 4,
            indentUnit: 4,
            readOnly: !this.useToolboxOverride,
            firstLineNumber: 1,
            gutters: []
        }
    }
    get tbblock() {
        return {
            type: 'XML',
            content: this.unparsedOverrideToolboxContent,
            scopeUUID: this.block.scopeUUID,
            firstLine: 1,
            hidden: false,
            readonly: !this.useToolboxOverride,
            static: !this.useToolboxOverride,
            alternativeContent: '',
            parentID: this.block.parentID,
            id: this.block.id,
            actualContent: () => {
                return this.unparsedOverrideToolboxContent
            }
        }
    }

    get unparsedOverrideToolboxContent(): string {
        return this.block.blockly.toolboxOverride ? this.block.blockly.toolboxOverride : ''
    }
    get unparsedToolboxContent(): string {
        if (this.useToolboxOverride) {
            return this.unparsedOverrideToolboxContent
        }
        return blocklyHelper.serializeToolbox(this.block.blockly.toolbox)
    }
    get toolboxContent(): string {
        return this.parseToolboxCode(this.unparsedToolboxContent)
    }
    get visibleLinesNow() {
        if (!this.block.codeExpanded) {
            return '5.2'
        }
        return 'auto'
    }

    get isPython(): boolean {
        return this.mode == 'text/x-python' || this.mode == 'text/python' || this.mode == 'python'
    }
    get isJava(): boolean {
        return this.mode == 'text/x-java' || this.mode == 'text/java' || this.mode == 'java'
    }
    get isJavaScript(): boolean {
        return (
            this.mode == 'text/javascript' ||
            this.mode == 'javascript' ||
            this.mode == 'application/javascript' ||
            this.mode == 'application/ecmascript' ||
            this.mode == 'text/ecmascript'
        )
    }
    get code() {
        if (this.workspace) {
            const BBlockly = Blockly as any
            if (this.isPython) {
                return BBlockly.Python.workspaceToCode(this.workspace)
            } else if (this.isJava) {
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

    onToolboxOverrideChange(newCode) {
        this.tbEditExpanded = this.tbEditExpanded && !this.useToolboxOverride
        this.$nextTick(() => {
            this.remountBlockly()
        })
    }

    @Watch('block.blockly.toolbox', { immediate: false, deep: true })
    onToolboxChanged() {
        this.$nextTick(() => {
            this.remountBlockly()
        })
    }

    @Watch('block.blockly.blocks', { immediate: false, deep: true })
    onBlocksChanged() {
        console.log('Changed Blocks')
        this.$nextTick(() => {
            this.remountBlockly()
        })
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->

<style lang="stylus">
@import '../../styles/quasar.variables.styl'
.blocklyContainer
    height: 100%
    width: 100%
    text-align: left
    border: 1px solid #eee
    border-radius: 3px
    box-shadow: 1px 2px 8px #ddd
.blocklyCanvas
    display: inline-block
    width:100%
    height:200px
    margin-top:4px
    margin-bottom:4px
    transition: opacity 600ms, visibility 600ms
.blocklyText
    font-family: 'Roboto', '-apple-system', 'Helvetica Neue', Helvetica, Arial, sans-serif
    font-weight: 300
.blocklyEditableText
    .blocklyText
        font-weight:500
.blocklyMainBackground
    stroke:#fff
.blocklyScrollbarHandle
    fill:$blue-grey-1
.blocklyToolboxDiv
    padding:4px 16px 4px 8px
    background-color:$blue-grey-1

.blocklyTreeRow
    border-radius:3px
.blocklyTreeSelected
    .blocklyTreeLabel
        font-weight: 900
.blocklyTreeLabel
    font-family: 'Roboto', '-apple-system', 'Helvetica Neue', Helvetica, Arial, sans-serif
    color:$blue-grey-10
    font-weight: 300
.blocklyFlyoutBackground
    fill:$blue-grey-1
.blocklyFlyoutScrollbar
    .blocklyScrollbarHandle
        fill:$blue-grey-3
</style>
