<template>
    <q-card-section>
        <div class="text-overline">{{ title }}</div>
        <div class="row q-pa-none items-start">
            <q-input
                class="col-3 q-pl-lg col-sm-4 col-xs-12"
                v-model="line.message"
                :label="$t('Blockly.Block.MainDescription')"
            />

            <div class="col-9 col-sm-8 col-xs-12 q-pl-lg">
                <div class="row no-wrap q-pa-none">
                    <div class="text-overline">{{ $t('Blockly.Block.Arguments') }}</div>
                    <q-btn
                        color="primary"
                        class="gt-xs"
                        size="12px"
                        flat
                        dense
                        round
                        icon="add"
                        @click="addArgument"
                    />
                </div>
                <q-list dense dark bordered class="rounded-borders q-mt-sm ">
                    <q-expansion-item
                        v-model="item.expanded"
                        v-for="item in line.args"
                        v-bind:key="item.uuid"
                        expand-separator
                        group="lineArguments"
                        header-class="bg-blue-grey text-white"
                        :label="item.name"
                        :caption="labelForType(item.type)"
                    >
                        <BlocklyCustomBlockArgument
                            :block="block"
                            :line="line"
                            :argument="item"
                            :customBlocks="customBlocks"
                        />
                    </q-expansion-item>
                </q-list>
            </div>
        </div>
    </q-card-section>
</template>

<script lang="ts">
import 'reflect-metadata'
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import {
    IBlocklyToolboxItem,
    IBlockDefinition,
    IBlockLine,
    IBlockArgument,
    BlockArgumentTypes,
    IBlockArgumentUI
} from '../lib/IBlocklyHelper'
import { blocklyHelper, PredefinedBlockTypes } from '../lib/BlocklyHelper'
import { IListItemData } from '../lib/ICompilerRegistry'
import BlocklyCustomBlockArgument from '@/components/BlocklyCustomBlockArgument.vue'
import { uuid } from 'vue-uuid'

@Component({ components: { BlocklyCustomBlockArgument } })
export default class BlocklyCustomBlockLine extends Vue {
    @Prop() title!: string
    @Prop() block!: IBlockDefinition
    @Prop() line!: IBlockLine
    @Prop() customBlocks!: IBlockDefinition[]

    labelForType(a: BlockArgumentTypes): string {
        return blocklyHelper.toArgumentDescription(a)
    }

    addArgument(): void {
        //close others
        this.line.args.forEach(item => {
            const i = item as IBlockArgumentUI
            i.expanded = false
        })

        const item: IBlockArgumentUI = {
            uuid: uuid.v4(),
            type: BlockArgumentTypes.field_number,
            name: `VALUE_${this.line.args.length + 1}`,
            expanded: true
        }
        this.line.args.push(item)
    }
}
</script>

<style></style>
