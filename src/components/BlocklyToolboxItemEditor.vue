<template>
    <q-card class="bg-blue-grey-2 q-pl-lg">
        <q-card-section>
            <div class="row q-pa-none">
                <q-select
                    class="col-11 q-ml-lg col-sm-11 col-xs-11"
                    v-model="type"
                    :options="filteredBlockTypes"
                    label="Type"
                    use-input
                    input-debounce="0"
                    behavior="menu"
                    @filter="filterTypes"
                >
                    <template v-slot:no-option>
                        <q-item>
                            <q-item-section class="text-grey">
                                No results
                            </q-item-section>
                        </q-item>
                    </template>
                </q-select>
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
                label:
                    bl.header.message && bl.header.message.trim() != ''
                        ? bl.header.message
                        : bl.type,
                value: bl.type
            }
            return ret
        })
        return [...PredefinedBlockTypes, ...custom].sort((a, b) => a.label.localeCompare(b.label))
    }

    filteredBlockTypes: IListItemData[] = []

    filterTypes(val, update) {
        if (val === '') {
            update(() => {
                this.filteredBlockTypes = this.blockTypes
            })
            return
        }

        update(() => {
            const needle = val.toLowerCase()
            this.filteredBlockTypes = this.blockTypes.filter(
                v => v.label.toLowerCase().indexOf(needle) > -1
            )
        })
    }
}
</script>

<style></style>
