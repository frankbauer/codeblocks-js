<template>
    <q-card class="bg-blue-grey-2 q-pl-lg">
        <q-card-section>
            <div class="row q-pa-none">
                <q-select
                    class="col-11 q-ml-lg col-sm-11 col-xs-11"
                    v-model="type"
                    :options="blockTypes"
                    label="Type"
                />
            </div>
        </q-card-section>
    </q-card>
</template>

<script lang="ts">
import 'reflect-metadata'
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import { IBlocklyToolboxItem, IBlockDefinition } from '../lib/IBlocklyHelper'
import { blocklyHelper, PredefinedBlockTypes } from '../lib/BlocklyHelper'
import { IListItemData } from '../lib/ICompilerRegistry'

@Component
export default class BlocklyToolboxItemEditor extends Vue {
    @Prop() item!: IBlocklyToolboxItem
    @Prop() customBlocks!: IBlockDefinition[]

    get type(): IListItemData {
        return this.$CodeBlock.itemForValue(this.blockTypes, this.item.type)
    }

    set type(v: IListItemData) {
        this.item.type = v.value
    }

    get blockTypes(): IListItemData[] {
        const custom: IListItemData[] = this.customBlocks.map(bl => {
            const ret: IListItemData = {
                label: bl.message0,
                value: bl.type
            }
            return ret
        })
        return [...PredefinedBlockTypes, ...custom].sort((a, b) =>
            a.value == b.value ? 0 : a.value < b.value ? -1 : +1
        )
    }
}
</script>

<style></style>
