<template>
    <q-card-section>
        <div class="text-overline">{{ title }}</div>
        <div class="row q-pa-none">
            <q-input
                class="col-3 q-ml-lg col-sm-5 col-xs-11"
                v-model="line.message"
                :label="$t('Blockly.Block.MainDescription')"
            />
        </div>
    </q-card-section>
</template>

<script lang="ts">
import 'reflect-metadata'
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import { IBlocklyToolboxItem, IBlockDefinition, IBlockLine } from '../lib/IBlocklyHelper'
import { blocklyHelper, PredefinedBlockTypes } from '../lib/BlocklyHelper'
import { IListItemData } from '../lib/ICompilerRegistry'

@Component
export default class BlocklyCustomBlockLine extends Vue {
    @Prop() title!: string
    @Prop() block!: IBlockDefinition
    @Prop() line!: IBlockLine
    @Prop() customBlocks!: IBlockDefinition[]
}
</script>

<style></style>
