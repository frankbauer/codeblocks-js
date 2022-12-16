<template>
    <q-card class="bg-blue-grey-1 q-pl-lg">
        <q-card-section class="q-pb-none q-mb-none">
            <div class="text-overline text-black q-pa-none q-ma-none">
                {{ $t('Blockly.Properties') }}
            </div>
        </q-card-section>
        <q-card-section class="q-mb-none q-pb-none q-pt-none">
            <div class="row q-pa-none">
                <q-input
                    class="col-3 q-ml-lg col-sm-5 col-xs-11"
                    v-model="category.name"
                    label="Label"
                />
                <div class="col-3 q-ml-lg col-sm-5 col-xs-11">
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
        <q-card-section class="q-pb-none q-mb-none">
            <div class="text-overline text-black q-pa-none q-ma-none">
                {{ $t('Blockly.ToolboxItems') }}
                <q-btn
                    color="primary"
                    class="gt-xs"
                    size="12px"
                    flat
                    dense
                    round
                    icon="add"
                    @click="addItem"
                />
            </div>
        </q-card-section>
        <q-card-section class="q-mb-none q-pt-none">
            <q-list dense dark bordered class="rounded-borders q-mt-sm" style="max-width: 400px">
                <q-expansion-item
                    dense
                    v-model="item._expanded"
                    v-for="item in category.items"
                    v-bind:key="item.uuid"
                    expand-separator
                    group="itemListing"
                    header-class="bg-blue-grey text-white"
                    :label="labelForItem(item.type)"
                    :caption="item.type"
                >
                    <template v-slot:header>
                        <q-item style="width: 100%">
                            <q-item-section>
                                <q-item-label>{{ labelForItem(item.type) }}</q-item-label>
                                <q-item-label caption>
                                    {{ item.type }}
                                </q-item-label>
                            </q-item-section>
                            <q-item-section top side>
                                <q-btn
                                    @click="removeItem(item)"
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
                    <BlocklyToolboxItemEditor :item="item" :customBlocks="customBlocks" />
                </q-expansion-item>
            </q-list>
        </q-card-section>
    </q-card>
</template>

<script lang="ts">
import 'reflect-metadata'
import { Prop, Watch } from 'vue-property-decorator'
import {
    IBlocklyToolboxCategory,
    IBlocklyToolboxItem,
    IBlockDefinition,
} from '@/lib/IBlocklyHelper'
import { blocklyHelper, ColorSelectionWithNone } from '@/lib/BlocklyHelper'
import { IListItemData } from '@/lib/ICompilerRegistry'
import BlocklyToolboxItemEditor from '@/components/Blockly/BlocklyToolboxItemEditor.vue'

import { uuid } from 'vue3-uuid'
import { CodeBlocksGlobal } from '@/lib/global'
import { Vue, Options } from 'vue-class-component'

@Options({ components: { BlocklyToolboxItemEditor } })
export default class BlocklyToolboxCategoryEditor extends Vue {
    @Prop() category!: IBlocklyToolboxCategory
    @Prop() customBlocks!: IBlockDefinition[]

    get color() {
        let cl = this.category.color
        if (cl === undefined) {
            cl = ''
        }

        return CodeBlocksGlobal.$CodeBlock.itemForValue(this.colors, cl)
    }

    set color(v) {
        this.category.color = blocklyHelper.toColorCode(v.value)
    }

    get colors(): IListItemData[] {
        return ColorSelectionWithNone
    }

    get htmlColor() {
        return blocklyHelper.toHTMLColor(this.category.color)
    }

    removeItem(item) {
        const idx = this.category.items.indexOf(item)
        if (idx >= 0) {
            this.category.items.splice(idx, 1)
        }
    }

    addItem() {
        //close others
        this.category.items.forEach((item) => {
            item._expanded = false
        })

        //start new one expanede
        const item: IBlocklyToolboxItem = {
            uuid: uuid.v4(),
            type: '',
            _expanded: true,
        }
        this.category.items.push(item)
    }

    labelForItem(i: IBlocklyToolboxItem): string {
        return i.type
    }
}
</script>

<style>
.colorBlockContainer {
    position: relative;
    height: 100%;
    width: 40px;
    text-align: end;
}
.colorBlock {
    position: absolute;
    bottom: 0px;
    width: 40px;
    height: 40px;
    border: 1px solid white;
}
</style>
