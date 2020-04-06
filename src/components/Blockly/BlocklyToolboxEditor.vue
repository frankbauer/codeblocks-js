<template>
    <div class="q-ml-lg q-pb-sm q-pl-lg">
        <div class="row no-wrap q-pa-none">
            <div class="text-overline">{{ $t('Blockly.ToolboxCategories') }}</div>
            <q-btn
                color="primary"
                class="gt-xs"
                size="12px"
                flat
                dense
                round
                icon="add"
                @click="addCategory"
            />
        </div>
        <q-list dark bordered class="rounded-borders q-mt-sm ">
            <q-expansion-item
                v-for="category in categories"
                v-bind:key="category.uuid"
                expand-separator
                group="categoryListing"
                header-class="bg-blue-grey text-white"
                :label="category.name"
                :caption="descriptionForCategory(category)"
            >
                <BlocklyToolboxCategoryEditor
                    :category="category"
                    :customBlocks="block.blockly.blocks"
                />
            </q-expansion-item>
        </q-list>
    </div>
</template>

<script lang="ts">
import 'reflect-metadata'
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import Blockly from '@/plugins/blocklyEnv'

import BlocklyToolboxCategoryEditor from '@/components/Blockly/BlocklyToolboxCategoryEditor.vue'
import { blocklyHelper, ColorSelectionWithNone } from '@/lib/BlocklyHelper'
import { BlockData } from '@/lib/codeBlocksManager'
import { IBlocklyToolboxCategory } from '@/lib/IBlocklyHelper'

import { uuid } from 'vue-uuid'

@Component({ components: { BlocklyToolboxCategoryEditor } })
export default class BlocklyToolboxEditor extends Vue {
    @Prop({ required: true }) block!: BlockData

    descriptionForCategory(c: IBlocklyToolboxCategory): string {
        return `items: ${c.items.length}, color:${blocklyHelper.toColor(c.color)}`
    }

    get categories(): IBlocklyToolboxCategory[] {
        if (this.block.blockly.toolbox.categories) {
            return this.block.blockly.toolbox.categories
        }
        return []
    }

    addCategory() {
        if (this.block.blockly.toolbox.categories) {
            const cat: IBlocklyToolboxCategory = {
                uuid: uuid.v4(),
                name: '',
                items: [],
                color: ''
            }
            this.block.blockly.toolbox.categories.push(cat)
        }
    }
}
</script>

<style lang="sass"></style>
