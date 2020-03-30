<template
    ><q-card flat>
        <q-item>
            <q-item-section avatar>
                <q-icon :dark="false" :name="icon"></q-icon>
            </q-item-section>

            <q-item-section>
                <q-item-label>{{ title }}</q-item-label>
                <q-item-label caption>
                    {{ descriptionForRow(line) }}
                </q-item-label>
            </q-item-section>

            <q-item-section side>
                <q-btn
                    color="grey"
                    round
                    flat
                    dense
                    :icon="isRowExpanded(line) ? 'keyboard_arrow_up' : 'keyboard_arrow_down'"
                    @click="toogleRowExpanded(line)"
                />
            </q-item-section>
        </q-item>

        <q-slide-transition>
            <div v-show="isRowExpanded(line)">
                <q-separator></q-separator>

                <q-card-section>
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
                            <q-list dense bordered class="rounded-borders q-mt-sm ">
                                <q-expansion-item
                                    v-model="item.$expanded"
                                    v-for="(item, index) in line.args"
                                    v-bind:key="item.uuid"
                                    expand-separator
                                    dark
                                    group="lineArguments"
                                    header-class="bg-blue-grey text-white"
                                    :label="item.name"
                                    :caption="labelForType(item.type) + ` = %${index + 1}`"
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
            </div>
        </q-slide-transition>
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
} from '@/lib/IBlocklyHelper'
import { blocklyHelper, PredefinedBlockTypes } from '@/lib/BlocklyHelper'
import { IListItemData } from '@/lib/ICompilerRegistry'
import BlocklyCustomBlockArgument from '@/components/Blockly/BlocklyCustomBlockArgument.vue'
import { uuid } from 'vue-uuid'

@Component({ components: { BlocklyCustomBlockArgument } })
export default class BlocklyCustomBlockLine extends Vue {
    @Prop() block!: IBlockDefinition
    @Prop() line!: IBlockLine
    @Prop() customBlocks!: IBlockDefinition[]
    @Prop() title!: string
    @Prop() icon!: string

    labelForType(a: BlockArgumentTypes): string {
        return blocklyHelper.toArgumentDescription(a)
    }

    descriptionForRow(l: IBlockLine): string {
        return l.message
    }

    isRowExpanded(l: IBlockLine): boolean {
        return l.$expanded
    }

    toogleRowExpanded(l: IBlockLine): void {
        l.$expanded = !l.$expanded
    }

    addArgument(): void {
        //close others
        this.line.args.forEach(item => {
            item.$expanded = false
        })

        const item: IBlockArgument = {
            uuid: uuid.v4(),
            type: BlockArgumentTypes.field_number,
            name: `VALUE_${this.line.args.length + 1}`,
            $expanded: true
        }
        this.line.args.push(item)
    }
}
</script>

<style></style>
