<template>
    <q-card class="bg-blue-grey-2 q-pl-lg">
        <q-card-section>
            <div class="row q-pa-none">
                <q-input
                    class="col-3 q-ml-lg col-sm-5 col-xs-11"
                    v-model="item.type"
                    label="Type"
                />
            </div>
        </q-card-section>
    </q-card>
</template>

<script lang="ts">
import 'reflect-metadata'
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import { IBlocklyToolboxItem } from '../lib/IBlocklyHelper'
import { blocklyHelper } from '../lib/BlocklyHelper'
import { IListItemData } from '../lib/ICompilerRegistry'

@Component
export default class BlocklyToolboxItemEditor extends Vue {
    @Prop() item!: IBlocklyToolboxItem
}
</script>

<style></style>
