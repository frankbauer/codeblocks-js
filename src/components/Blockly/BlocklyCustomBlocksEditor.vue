<template>
    <div class="q-ml-lg q-pb-sm q-pl-lg">
        <div class="row no-wrap q-pt-none q-pb-md">
            <div class="text-overline">{{ $t('Blockly.ToolboxItems') }}</div>
            <q-btn
                color="primary"
                class="gt-xs"
                size="12px"
                flat
                dense
                round
                icon="add"
                @click="addBlock"
            />
        </div>
        <q-list dense bordered class="rounded-borders q-mt-sm">
            <q-expansion-item
                v-model="item._expanded"
                v-for="item in customBlocks"
                v-bind:key="item.uuid"
                expand-separator
                dark
                group="blockListing"
                header-class="bg-blue-grey text-white"
                :label="labelForBlock(item)"
                :caption="item.JSON.type"
                @show="onShowBlock"
            >
                <template v-slot:header>
                    <q-item style="width: 100%">
                        <q-item-section>
                            <q-item-label>{{ labelForBlock(item) }}</q-item-label>
                            <q-item-label caption>
                                {{ item.JSON.type }}
                            </q-item-label>
                        </q-item-section>
                        <q-item-section top side>
                            <q-btn
                                @click="removeBlock(item)"
                                icon="delete"
                                flat
                                dense
                                color="red-3"
                                right
                                :ripple="{ center: true }"
                            ></q-btn>
                        </q-item-section>
                    </q-item>
                </template>
                <BlocklyCustomBlockEditor
                    :blockDefinition="item"
                    :block="block"
                    :customBlocks="customBlocks"
                />
            </q-expansion-item>
        </q-list>
    </div>
</template>

<script lang="ts">
import 'reflect-metadata'
import { Prop, Watch } from 'vue-property-decorator'
import { Vue, Options } from 'vue-class-component'
import Blockly from '@/plugins/blocklyEnv'
import { uuid } from 'vue3-uuid'

import { blocklyHelper, PredefinedBlockTypes } from '@/lib/BlocklyHelper'
import { BlockData } from '@/lib/codeBlocksManager'
import { IBlockDefinition, KnownBlocklyTypes } from '@/lib/IBlocklyHelper'

import BlocklyCustomBlockEditor from '@/components/Blockly/BlocklyCustomBlockEditor.vue'
import { CodeBlocksGlobal } from '@/lib/global'
@Options({ components: { BlocklyCustomBlockEditor } })
export default class BlocklyCustomBlocksEditor extends Vue {
    @Prop({ required: true }) block!: BlockData

    @Prop({ default: false }) editMode!: boolean

    get customBlocks(): IBlockDefinition[] {
        return this.block.blockly.blocks
    }

    labelForBlock(block: IBlockDefinition): string {
        return block.JSON.message0
    }

    removeBlock(item) {
        const idx = this.customBlocks.indexOf(item)
        if (idx >= 0) {
            this.customBlocks.splice(idx, 1)
        }
    }

    addBlock() {
        this.$q
            .dialog({
                title: CodeBlocksGlobal.$l('Blockly.Block.CreateCustomTitle'),
                message: CodeBlocksGlobal.$l('Blockly.Block.CreateCustomMessage'),
                html: true,
                prompt: {
                    model: '',
                    isValid: (val) =>
                        val.length > 2 &&
                        this.customBlocks.find(
                            (bl) => bl.JSON.type.toLowerCase() == val.toLowerCase()
                        ) === undefined &&
                        PredefinedBlockTypes.find(
                            (bl) => bl.value.toLowerCase() == val.toLowerCase()
                        ) === undefined,
                    type: 'text',
                },
                persistent: true,
                cancel: true,
                ok: {
                    push: true,
                    color: 'positive',
                },
            })
            .onOk((data: string) => {
                this._addBlock(data)
            })
            .onCancel(() => {})
            .onDismiss(() => {})
    }

    private _addBlock(type: string) {
        //close others
        this.customBlocks.forEach((item) => {
            item._expanded = false
        })

        //start new one expanede
        const item: IBlockDefinition = {
            uuid: uuid.v4(),
            _expanded: true,
            XML: '',
            JSON: {
                type: type,
                message0: type,
                args0: [],
                previousStatement: null,
                nextStatement: null,
                colour: '',
                tooltip: '',
                helpUrl: '',
            },
            codeString: 'return ""',
        }
        this.customBlocks.push(item)
    }

    onShowBlock() {
        CodeBlocksGlobal.$CodeBlock.refreshAllCodeMirrors()
    }
}
</script>

<style lang="sass"></style>
