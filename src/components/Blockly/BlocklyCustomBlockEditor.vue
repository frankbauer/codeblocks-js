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
                :block="block"
                :line="block.header"
                :customBlocks="customBlocks"
                :title="$t('Blockly.Block.Header')"
                icon="title"
            />
        </q-card-section>
        <q-card-section
            v-for="(line, index) in block.additionalLines"
            :key="line.uuid"
            class="q-mt-none q-pt-xs q-pb-xs"
        >
            <BlocklyCustomBlockLine
                :block="block"
                :line="line"
                :customBlocks="customBlocks"
                :title="$t('Blockly.Block.AddonLineTitle', { nr: indexForLine(index) })"
                :icon="iconForIndex(index)"
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
import { uuid } from 'vue-uuid'

@Component({ components: { BlocklyCustomBlockLine } })
export default class BlocklyCustomBlockEditor extends Vue {
    @Prop() block!: IBlockDefinition
    @Prop() customBlocks!: IBlockDefinition[]

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

    addLine() {
        const line: IBlockLine = {
            message: '',
            args: [],
            uuid: uuid.v4(),
            expanded: true
        }

        this.block.additionalLines.push(line)
    }
}
</script>

<style></style>
