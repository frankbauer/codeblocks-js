<template>
    <div class="q-ml-lg q-pb-sm q-pl-lg">
        <div class="row no-wrap q-pa-none">
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
        <q-list dense dark bordered class="rounded-borders q-mt-sm ">
            <q-expansion-item
                v-model="item.expanded"
                v-for="item in customBlocks"
                v-bind:key="item.uuid"
                expand-separator
                group="blockListing"
                header-class="bg-blue-grey text-white"
                :label="labelForBlock(item)"
                :caption="item.type"
            >
            </q-expansion-item>
        </q-list>
    </div>
</template>

<script lang="ts">
import 'reflect-metadata'
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import Blockly from '@/plugins/blocklyEnv'
import { uuid } from 'vue-uuid'

import { blocklyHelper } from '@/lib/BlocklyHelper'
import { BlockData } from '../lib/codeBlocksManager'
import { IBlockDefinition, IBlockDefinitionUI } from '../lib/IBlocklyHelper'
@Component
export default class BlocklyCustomBlocksEditor extends Vue {
    @Prop({ required: true }) block!: BlockData

    get customBlocks(): IBlockDefinition[] {
        return this.block.blockly.blocks
    }

    labelForBlock(block: IBlockDefinition): string {
        return block.message0
    }

    addBlock() {
        //close others
        this.customBlocks.forEach(item => {
            const i = item as IBlockDefinitionUI
            i.expanded = false
        })

        //start new one expanede
        const item: IBlockDefinitionUI = {
            uuid: uuid.v4(),
            type: '',
            expanded: true,
            message0: '',
            arg0: [],
            message1: '',
            arg1: [],
            message2: '',
            arg2: [],
            message3: '',
            arg3: [],
            message4: '',
            arg4: [],
            previousStatement: null,
            nextStatement: null,
            color: '',
            tooltip: '',
            helpUrl: ''
        }
        this.customBlocks.push(item)
    }
}
</script>

<style lang="sass"></style>
