<template>
    <q-card class="bg-blue-grey-2 q-pl-lg">
        <q-card-section>
            <div class="row q-pa-none">
                <q-input
                    class="col-3 q-pl-lg col-sm-6 col-xs-12"
                    v-model="block.type"
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
import { blocklyHelper, PredefinedBlockTypes, ColorSelectionWithNone } from '../lib/BlocklyHelper'
import { IListItemData } from '../lib/ICompilerRegistry'
import BlocklyCustomBlockLine from '@/components/BlocklyCustomBlockLine.vue'

@Component({ components: { BlocklyCustomBlockLine } })
export default class BlocklyCustomBlockEditor extends Vue {
    @Prop() block!: IBlockDefinition
    @Prop() customBlocks!: IBlockDefinition[]

    get color() {
        let cl = this.block.color
        if (cl === undefined) {
            cl = ''
        }

        return Vue.$CodeBlock.itemForValue(this.colors, cl)
    }

    set color(v) {
        const cc = blocklyHelper.toColorCode(v.value)
        this.block.color = cc !== undefined ? cc : ''
    }

    get colors(): IListItemData[] {
        return ColorSelectionWithNone
    }

    get htmlColor() {
        return blocklyHelper.toHTMLColor(this.block.color)
    }
}
</script>

<style></style>
