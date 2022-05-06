<template>
    <div v-show="editMode" class="blocksEditorPanelContainer" :style="`width:${width}px`">
        <div class="blocksEditorPanelLeft" v-show="block !== null">
            <q-btn
                :icon="expanded ? 'chevron_right' : 'chevron_left'"
                size="sm"
                unelevated
                align="center"
                class="expander"
                color="blue-grey-4"
                @click="onExpandClick"
            ></q-btn>
            <CodeBlock
                :block="saveBlock"
                :theme="themeForBlock(block)"
                mode=""
                :visibleLines="visibleLinesNow"
                :editMode="true"
                :muteReadyState="true"
                :isBookmarkPanel="true"
                namePrefix="panel_"
                @code-changed-in-edit-mode="onCodeChange"
            />
        </div>
    </div>
</template>

<script lang="ts">
import 'reflect-metadata'
import { Vue, Component, Prop } from 'vue-property-decorator'
import CodeBlock from '@/components/CodeBlock.vue'
import { BlockData } from '../lib/codeBlocksManager'
import {
    IBlockData,
    KnownBlockTypes,
    ICodeBlockDataState,
    CodeExpansionType,
} from '../lib/ICodeBlocks'

interface IBlockDataExtended extends IBlockData {
    firstLine: number
    actualContent: string
    actualAltContent: string
}
@Component({ components: { CodeBlock } })
export default class CodePanel extends Vue {
    @Prop({ default: false }) editMode!: boolean
    @Prop({ default: 'auto' }) visibleLines!: number | 'auto'
    @Prop({ required: true }) block!: BlockData | null
    @Prop({ default: 400 }) panelWidth!: number

    get saveBlock(): IBlockData {
        if (
            this.block !== null &&
            this.block !== undefined &&
            this.block.content !== null &&
            this.block.content !== undefined
        ) {
            return this.block
        }
        const ret: IBlockDataExtended = {
            hasCode: false,
            type: KnownBlockTypes.BLOCKSTATIC,
            content: '',
            alternativeContent: '',
            noContent: true,
            id: -1,
            uuid: '',
            parentID: -2,
            expanded: true,
            codeExpanded: CodeExpansionType.AUTO,
            obj: null,
            version: '',
            readyCount: 0,
            errors: [],
            visibleLines: 'auto',
            hasAlternativeContent: false,
            shouldAutoreset: false,
            shouldReloadResources: false,
            generateTemplate: true,
            firstLine: 1,
            actualContent: '',
            actualAltContent: '',
            width: '100%',
            height: '200px',
            align: 'center',
            readonly: true,
            static: true,
            hidden: false,
            themeForCodeBlock: '',
            lineCountHint: -0,
            getThemeForBlock: (bl: ICodeBlockDataState) => {
                return ''
            },
            blockly: {
                _blockErrors: [],
                useOverride: false,
                toolbox: {
                    categories: [],
                },
                showControls: false,
                toolboxOverride: '',
                blocks: [],
            },
        }
        return ret
    }

    get visibleLinesNow() {
        if (this.visibleLines === 'auto') {
            return 'auto'
        }
        if (this.visibleLines <= 2) {
            return 2
        }
        return this.visibleLines
    }
    onCodeChange() {}

    get width() {
        if (this.expanded) {
            return 2 * this.panelWidth
        }
        return this.panelWidth
    }

    expanded: boolean = false
    onExpandClick() {
        this.expanded = !this.expanded
    }

    themeForBlock(bl: BlockData | null): string {
        if (bl === null || bl === undefined) {
            return ''
        }
        return bl.themeForCodeBlock
    }
}
</script>

<style lang="sass" scoped>
div.blocksEditorPanelContainer
    position: fixed
    right: 0px
    top: 16px
    z-index: 10000
    transition: width 0.3s
div.blocksEditorPanelLeft
    padding: 24px 0px 8px 40px
    border-top-left-radius: 5px
    border-bottom-left-radius: 5px
    position: sticky
    display: block
    background-color: rgba(255, 255, 255, 0.8)
    box-shadow: 2px 3px 10px rgba(0,0,0,0.3)
.expander
    position: absolute
    left: 0px
    top: 0px
    width: 24px
    height: 100%
    border-top-left-radius: 5px
    border-bottom-left-radius: 5px
    border-top-right-radius: 0px
    border-bottom-right-radius: 0px
    padding: 0px 0px 0px 0px
</style>
