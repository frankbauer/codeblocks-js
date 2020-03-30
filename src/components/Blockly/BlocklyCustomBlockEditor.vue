<template>
    <q-card class="bg-blue-grey-2 q-pl-lg">
        <q-card-section>
            <div class="row q-pa-none">
                <q-input
                    class="col-3 q-pl-lg col-sm-6 col-xs-12"
                    v-model="blockDefinition.type"
                    :label="$t('Blockly.Block.TypeName')"
                />
                <div class="col-3 q-pl-lg col-sm-6 col-xs-12">
                    <q-select v-model="color" :options="colors" label="Color">
                        <template v-slot:before>
                            <div class="colorBlockContainer">
                                <div
                                    class="colorBlock"
                                    :style="`background-color:${htmlColor}`"
                                ></div>
                            </div>
                        </template>
                    </q-select>
                </div>
            </div>
        </q-card-section>
        <q-card-section class="q-pb-xs">
            <div class="row no-wrap q-pa-none">
                <div class="text-overline">{{ $t('Blockly.Block.AdditionalLines') }}</div>
                <q-btn
                    color="primary"
                    class="gt-xs"
                    size="12px"
                    flat
                    dense
                    round
                    icon="add"
                    @click="addLine"
                />
            </div>
        </q-card-section>
        <q-card-section class="q-pt-xs q-pb-xs">
            <BlocklyCustomBlockLine
                :block="blockDefinition"
                :line="blockDefinition.header"
                :customBlocks="customBlocks"
                :title="$t('Blockly.Block.Header')"
                icon="title"
            />
        </q-card-section>
        <q-card-section
            v-for="(line, index) in blockDefinition.additionalLines"
            :key="line.uuid"
            class="q-mt-none q-pt-xs q-pb-xs"
        >
            <BlocklyCustomBlockLine
                :block="blockDefinition"
                :line="line"
                :customBlocks="customBlocks"
                :title="$t('Blockly.Block.AddonLineTitle', { nr: indexForLine(index) })"
                :icon="iconForIndex(index)"
            />
        </q-card-section>
        <q-card-section>
            <CodeBlock
                :block="prefixCodeBlock"
                :theme="staticCodeOptions.theme"
                :mode="staticCodeOptions.mode"
                visibleLines="1"
                :editMode="false"
                :muteReadyState="true"
                namePrefix="blockCodePre"
            />
            <CodeBlock
                :block="codeBlock"
                :theme="codeOptions.theme"
                :mode="codeOptions.mode"
                visibleLines="10"
                :editMode="true"
                :muteReadyState="true"
                namePrefix="blockCode"
                @code-changed-in-edit-mode="onBlockCodeChange"
            />
            <CodeBlock
                :block="postfixCodeBlock"
                :theme="staticCodeOptions.theme"
                :mode="staticCodeOptions.mode"
                visibleLines="1"
                :editMode="false"
                :muteReadyState="true"
                namePrefix="blockCodePost"
            />
        </q-card-section>
    </q-card>
</template>

<script lang="ts">
import 'reflect-metadata'
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import { IBlocklyToolboxItem, IBlockDefinition, IBlockLine } from '@/lib/IBlocklyHelper'
import { blocklyHelper, PredefinedBlockTypes, ColorSelectionWithNone } from '@/lib/BlocklyHelper'
import { IListItemData } from '@/lib/ICompilerRegistry'
import BlocklyCustomBlockLine from '@/components/Blockly/BlocklyCustomBlockLine.vue'
import CodeBlock from '@/components/CodeBlock.vue'
import { uuid } from 'vue-uuid'
import { BlockData } from '../../lib/codeBlocksManager'

@Component({ components: { BlocklyCustomBlockLine, CodeBlock } })
export default class BlocklyCustomBlockEditor extends Vue {
    @Prop() customBlocks!: IBlockDefinition[]
    @Prop() blockDefinition!: IBlockDefinition
    @Prop({ required: true }) block!: BlockData

    indexForLine(index: number): number {
        return index + 2
    }
    iconForIndex(index: number): string {
        let nr = '' + this.indexForLine(index)
        if (index == 0) {
            nr = 'two'
        }
        return `looks_${nr}`
    }

    get color() {
        let cl = this.blockDefinition.color
        if (cl === undefined) {
            cl = ''
        }

        return Vue.$CodeBlock.itemForValue(this.colors, cl)
    }

    set color(v) {
        const cc = blocklyHelper.toColorCode(v.value)
        this.blockDefinition.color = cc !== undefined ? cc : ''
    }

    get colors(): IListItemData[] {
        return ColorSelectionWithNone
    }

    get htmlColor() {
        return blocklyHelper.toHTMLColor(this.blockDefinition.color)
    }

    addLine() {
        const line: IBlockLine = {
            message: '',
            args: [],
            uuid: uuid.v4(),
            expanded: true
        }

        this.blockDefinition.additionalLines.push(line)
    }

    get codeOptions() {
        return {
            mode: this.$CodeBlock.mimeType('xml'),
            theme: this.block.getThemeForBlock(this.codeBlock),
            lineNumbers: false,
            line: false,
            tabSize: 4,
            indentUnit: 4,
            readOnly: false,
            firstLineNumber: 1,
            gutters: []
        }
    }
    get codeBlock() {
        return {
            type: 'appplication/javascript',
            content: this.blockDefinition.codeString,
            scopeUUID: this.block.scopeUUID,
            firstLine: 2,
            hidden: false,
            readonly: false,
            static: false,
            alternativeContent: '',
            parentID: this.block.parentID,
            id: this.block.id,
            actualContent: () => {
                return this.blockDefinition.codeString
            }
        }
    }

    get staticCodeOptions() {
        return {
            mode: this.$CodeBlock.mimeType('xml'),
            theme: this.block.getThemeForBlock(this.prefixCodeBlock),
            lineNumbers: false,
            line: false,
            tabSize: 4,
            indentUnit: 4,
            readOnly: true,
            firstLineNumber: 1,
            gutters: []
        }
    }
    get prefixCodeBlock() {
        return {
            type: 'appplication/javascript',
            content: 'function(block) {',
            scopeUUID: this.block.scopeUUID,
            firstLine: 1,
            hidden: false,
            readonly: true,
            static: true,
            alternativeContent: '',
            parentID: this.block.parentID,
            id: this.block.id,
            actualContent: () => {
                return 'function(block) {'
            }
        }
    }
    codeLen: number = 0
    get postfixCodeBlock() {
        return {
            type: 'appplication/javascript',
            content: '}',
            scopeUUID: this.block.scopeUUID,
            firstLine: 2 + this.blockDefinition.codeString.split('\n').length,
            hidden: false,
            readonly: true,
            static: true,
            alternativeContent: '',
            parentID: this.block.parentID,
            id: this.block.id,
            actualContent: () => {
                return '}'
            }
        }
    }

    onBlockCodeChange() {
        this.blockDefinition.codeString = this.codeBlock.content
        this.blockDefinition.code = undefined
    }
}
</script>

<style></style>
