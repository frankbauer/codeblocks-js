<template>
    <div class="q-ml-lg q-pb-sm q-pl-lg">
        <div class="row no-wrap q-pa-none">
            <div class="text-overline">{{ $t('Blockly.ToolboxCategories') }}</div>
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
                <BlocklyToolboxCategoryEditor :category="category" />
            </q-expansion-item>
        </q-list>
    </div>
</template>

<script lang="ts">
import 'reflect-metadata'
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import Blockly from '@/plugins/blocklyEnv'

import BlocklyToolboxCategoryEditor from '@/components/BlocklyToolboxCategoryEditor.vue'
import { blocklyHelper, ColorSelectionWithNone } from '@/lib/BlocklyHelper'
import { BlockData } from '@/lib/codeBlocksManager'
import { IBlocklyToolboxCategory } from '../lib/IBlocklyHelper'

const sampleCategories: IBlocklyToolboxCategory[] = [
    {
        uuid: '0',
        name: 'Logic',
        items: [
            {
                uuid: '0',
                type: 'controls_if'
            },
            {
                uuid: '1',
                type: 'logic_compare'
            }
        ],
        color: ''
    },
    {
        uuid: '1',
        name: 'Math',
        items: [
            {
                uuid: '3',
                type: 'math_arithmetic'
            },
            {
                uuid: '4',
                type: 'math_single'
            }
        ],
        color: '{!PrimaryColors.math}'
    }
]

const vCat = new Vue({
    data: () => {
        return {
            categories: sampleCategories
        }
    }
})

@Component({ components: { BlocklyToolboxCategoryEditor } })
export default class BlocklyToolboxEditor extends Vue {
    @Prop({ required: true }) block!: BlockData

    descriptionForCategory(c: IBlocklyToolboxCategory): string {
        return `items: ${c.items.length}, color:${blocklyHelper.toColor(c.color)}`
    }

    get categories(): IBlocklyToolboxCategory[] {
        return vCat.categories
    }
    get testCategory(): IBlocklyToolboxCategory {
        return {
            uuid: 4,
            name: 'test',
            items: []
        }
    }
}
</script>

<style lang="sass"></style>
