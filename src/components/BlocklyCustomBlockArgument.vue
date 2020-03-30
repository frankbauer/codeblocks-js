<template>
    <q-card>
        <q-card-section>
            <div class="row q-pa-none">
                <q-input
                    class="col-12 q-pl-lg "
                    v-model="argument.name"
                    :label="$t('Blockly.Block.ArgumentName')"
                />

                <q-select
                    class="col-12 q-pl-lg"
                    v-model="argumentType"
                    :options="argumentTypes"
                    label="Type"
                />
            </div>
        </q-card-section>
    </q-card>
</template>

<script lang="ts">
import 'reflect-metadata'
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import {
    IBlocklyToolboxItem,
    IBlockDefinition,
    IBlockLine,
    IBlockArgument,
    BlockArgumentTypes
} from '../lib/IBlocklyHelper'
import { blocklyHelper, PredefinedBlockTypes, PredefinedArgumentTypes } from '../lib/BlocklyHelper'
import { IListItemData } from '../lib/ICompilerRegistry'

@Component
export default class BlocklyCustomBlockArgument extends Vue {
    @Prop() block!: IBlockDefinition
    @Prop() line!: IBlockLine
    @Prop() argument!: IBlockArgument
    @Prop() customBlocks!: IBlockDefinition[]

    get argumentTypes() {
        return PredefinedArgumentTypes
    }

    get argumentType(): IListItemData {
        return this.$CodeBlock.itemForValue(this.argumentTypes, this.argument.type)
    }

    set argumentType(v: IListItemData) {
        this.argument.type = BlockArgumentTypes[v.value]
    }
}
</script>

<style></style>
