<template>
    <q-card class="bg-blue-grey-2 q-pl-lg">
        <q-card-section>
            <div class="row q-pa-none">
                <q-input
                    class="col-3 q-ml-lg col-sm-5 col-xs-11"
                    v-model="block.type"
                    :label="$t('Blockly.Block.TypeName')"
                />
            </div>
        </q-card-section>
        <BlocklyCustomBlockLine
            :block="block"
            :line="block.header"
            :customBlocks="customBlocks"
            title="Header"
        />
    </q-card>
</template>

<script lang="ts">
import 'reflect-metadata'
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import { IBlocklyToolboxItem, IBlockDefinition } from '../lib/IBlocklyHelper'
import { blocklyHelper, PredefinedBlockTypes } from '../lib/BlocklyHelper'
import { IListItemData } from '../lib/ICompilerRegistry'
import BlocklyCustomBlockLine from '@/components/BlocklyCustomBlockLine.vue'

@Component({ components: { BlocklyCustomBlockLine } })
export default class BlocklyCustomBlockEditor extends Vue {
    @Prop() block!: IBlockDefinition
    @Prop() customBlocks!: IBlockDefinition[]
}
</script>

<style></style>
