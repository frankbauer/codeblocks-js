<template>
    <div
        :data-question="block.parentID"
        :data-nr="block.id"
        :uuid="block.uuid"
        class="block-container"
    >
        <q-card
            v-if="editMode"
            :class="`q-mx-none q-my-xs q-pa-none editModeBlockContainer ${colorClass} ${bgClass}`"
        >
            <q-card-section class="q-mb-none q-pb-sm q-pt-sm">
                <div class="row q-my-none q-py-none" dense>
                    <div class="col-xs-12 col-sm-4 col-md-4 q-my-none q-py-none">
                        <q-select
                            :options="types"
                            v-model="typeObj"
                            dense
                            style="margin-top: -5px !important"
                        >
                            <template v-slot:after>
                                <q-btn
                                    flat
                                    round
                                    color="primary"
                                    icon="info"
                                    size="xs"
                                    @click="showTypeInfoDialog"
                                ></q-btn>
                            </template>
                        </q-select>
                    </div>
                    <div class="col-grow"></div>
                    <div
                        class="order-xs-first order-sm-last col-xs-12 col-sm-8 col-md-5 q-my-none q-py-none text-right"
                    >
                        <q-btn icon="settings" color="blue-7" push dense v-if="hasExtendedSettings">
                            <q-popup-proxy>
                                <!-- LineNumbers -->
                                <div class="q-pa-md" v-if="canSetLineNumbers">
                                    <div class="row no-wrap q-pt-none q-pb-md">
                                        <div class="text-overline">
                                            {{ $l('CodeBlockContainer.Display') }}
                                        </div>
                                    </div>
                                    <div class="row no-wrap q-pl-md">
                                        <div class="col-7">
                                            <div class="text-subtitle2">
                                                {{ $l('CodeBlockContainer.Lines') }}
                                            </div>
                                            <div
                                                class="text-caption text-blue-grey-4"
                                                v-html="$l('CodeBlockContainer.Lines_detail')"
                                            ></div>
                                        </div>
                                        <div class="col-5 q-pl-sm">
                                            <q-input
                                                v-model="visibleLines"
                                                :rules="[validNumber]"
                                                maxlength="4"
                                                style="width: 132px"
                                            />
                                        </div>
                                    </div>
                                    <div
                                        class="row no-wrap q-pl-md"
                                        v-if="canHaveAlternativeContent"
                                    >
                                        <div class="col-7">
                                            <div class="text-subtitle2">
                                                {{ $l('CodeBlockContainer.Prepopulate') }}
                                            </div>
                                            <div class="text-caption text-blue-grey-4" lines="2">
                                                {{ $l('CodeBlockContainer.Prepopulate_detail') }}
                                            </div>
                                        </div>
                                        <div class="col-5 q-pl-sm">
                                            <q-toggle v-model="hasAltComntent" />
                                        </div>
                                    </div>
                                </div>

                                <!-- Playground Versioning -->
                                <div class="q-pa-md" v-if="isVersionedPlayground">
                                    <div class="row no-wrap q-pt-none q-pb-md">
                                        <div class="text-overline">
                                            {{ $l('CodeBlockContainer.Behaviour') }}
                                        </div>
                                    </div>
                                    <div class="row no-wrap q-pl-md">
                                        <div class="col-7">
                                            <div class="text-subtitle2">
                                                {{ $l('CodeBlockContainer.ScriptV') }}
                                            </div>
                                            <div class="text-caption text-blue-grey-4">
                                                {{ $l('CodeBlockContainer.ScriptV_detail') }}
                                            </div>
                                        </div>
                                        <div class="col-5 q-pl-sm">
                                            <q-select
                                                :options="scriptVersions"
                                                v-model="scriptVersionObj"
                                            />
                                        </div>
                                    </div>

                                    <div class="row no-wrap q-pl-md">
                                        <div class="col-7">
                                            <div class="text-subtitle2">
                                                {{ $l('CodeBlockContainer.AutoReset') }}
                                            </div>
                                            <div class="text-caption text-blue-grey-4">
                                                {{ $l('CodeBlockContainer.AutoReset_detail') }}
                                            </div>
                                        </div>
                                        <div class="col-5 q-pl-sm">
                                            <q-toggle v-model="shouldAutoReset" />
                                        </div>
                                    </div>

                                    <div class="row no-wrap q-pl-md">
                                        <div class="col-7">
                                            <div class="text-subtitle2">
                                                {{ $l('CodeBlockContainer.GenerateTemplate') }}
                                            </div>
                                            <div class="text-caption text-blue-grey-4">
                                                {{
                                                    $l('CodeBlockContainer.GenerateTemplate_detail')
                                                }}
                                            </div>
                                        </div>
                                        <div class="col-5 q-pl-sm">
                                            <q-toggle v-model="shouldGenerateTemplate" />
                                        </div>
                                    </div>
                                </div>

                                <!-- Positioning -->
                                <div
                                    class="q-pa-md"
                                    v-if="canDefinePlacement && shouldGenerateTemplate"
                                >
                                    <div class="row no-wrap q-pt-none q-pb-md">
                                        <div class="text-overline">
                                            {{ $l('CodeBlockContainer.Positioning') }}
                                        </div>
                                    </div>
                                    <div class="row no-wrap q-pl-md q-pb-md">
                                        <div class="col-7">
                                            <div class="text-subtitle2">
                                                {{ $l('CodeBlockContainer.Width') }}
                                            </div>
                                            <div class="text-caption text-blue-grey-4">
                                                {{ $l('CodeBlockContainer.Width_detail') }}
                                            </div>
                                        </div>
                                        <div class="col-5 q-pl-sm">
                                            <q-input v-model="width" maxlength="7" dense />
                                        </div>
                                    </div>
                                    <div class="row no-wrap q-pl-md q-pb-md">
                                        <div class="col-7">
                                            <div class="text-subtitle2">
                                                {{ $l('CodeBlockContainer.Height') }}
                                            </div>
                                            <div class="text-caption text-blue-grey-4">
                                                {{ $l('CodeBlockContainer.Height_detail') }}
                                            </div>
                                        </div>
                                        <div class="col-5 q-pl-sm">
                                            <q-input v-model="height" maxlength="7" dense />
                                        </div>
                                    </div>
                                    <div class="row no-wrap q-pl-md">
                                        <div class="col-7">
                                            <div class="text-subtitle2">
                                                {{ $l('CodeBlockContainer.Alignment') }}
                                            </div>
                                            <div class="text-caption text-blue-grey-4">
                                                {{ $l('CodeBlockContainer.Alignment_detail') }}
                                            </div>
                                        </div>
                                        <div class="col-5 q-pl-sm">
                                            <q-select :options="alignments" v-model="align" dense />
                                        </div>
                                    </div>
                                </div>
                            </q-popup-proxy>
                        </q-btn>

                        <q-btn
                            @click="moveUp"
                            :disable="!canMoveUp"
                            icon="arrow_drop_up"
                            push
                            dense
                            class="q-ml-md q-mr-xs"
                            color="orange-6"
                            :ripple="{ center: true }"
                        ></q-btn>
                        <div class="inlined-input q-pl-sm q-pr-md q-m-none" style="width: 80px">
                            <q-select
                                :options="positions"
                                v-model="order"
                                dense
                                style="margin-top: -5px !important"
                            ></q-select>
                        </div>
                        <q-btn
                            @click="moveDown"
                            :disabled="!canMoveDown"
                            icon="arrow_drop_down"
                            push
                            dense
                            class="q-mr-md"
                            color="orange-6"
                            :ripple="{ center: true }"
                        ></q-btn>
                        <q-btn
                            @click="removeBlock"
                            :label="$l('CodeBlockContainer.Delete')"
                            icon="warning"
                            push
                            dense
                            class="gt-xs q-mr-sm-sm q-mr-md-lg q-pr-sm"
                            color="red-6"
                            right
                            :ripple="{ center: true }"
                        ></q-btn>
                        <q-btn
                            @click="removeBlock"
                            icon="warning"
                            push
                            dense
                            class="lt-sm q-mr-lg q-pr-none"
                            color="red-6"
                            right
                            :ripple="{ center: true }"
                        ></q-btn>
                        <q-btn
                            :icon="expanded ? 'expand_less' : 'expand_more'"
                            color="primary"
                            small
                            flat
                            round
                            style="margin-right: -9px"
                            @click="toggleExpanded"
                        >
                        </q-btn>
                    </div>
                </div>
                <textarea
                    :name="`block_options[${this.block.parentID}][${this.block.id}]`"
                    class="blockoptions"
                    v-model="serializedOptions"
                ></textarea>
            </q-card-section>
            <q-slide-transition>
                <q-card-section v-if="this.isExperimentalScriptVersion">
                    <q-banner rounded dense class="bg-orange text-white col-12 q-mt-xs q-mb-md">
                        <q-item>
                            <q-item-section avatar>
                                <q-icon name="whatshot" style="font-size: 3em"></q-icon>
                            </q-item-section>
                            <q-item-section>
                                <q-item-label overline>
                                    {{ $t('CodePlayground.ExperimentalScriptVersion') }}
                                </q-item-label>
                                <q-item-label>
                                    {{ $t('CodePlayground.ExperimentalScriptVersionDesc') }}
                                </q-item-label>
                            </q-item-section>
                        </q-item>
                    </q-banner>
                </q-card-section>
            </q-slide-transition>
            <q-slide-transition>
                <q-card-section v-if="this.isDeprecatedScriptVersion">
                    <q-banner rounded dense class="bg-yellow-12 text-black col-12 q-mt-xs q-mb-md">
                        <q-item>
                            <q-item-section avatar>
                                <q-icon name="hourglass_disabled" style="font-size: 3em"></q-icon>
                            </q-item-section>
                            <q-item-section>
                                <q-item-label overline>
                                    {{ $t('CodePlayground.DeprecatedScriptVersion') }}
                                </q-item-label>
                                <q-item-label>
                                    {{ $t('CodePlayground.DeprecatedScriptVersionDesc') }}
                                </q-item-label>
                            </q-item-section>
                        </q-item>
                    </q-banner>
                </q-card-section>
            </q-slide-transition>
            <q-slide-transition>
                <q-card-section class="my-0 q-pt-1 q-pb-0" v-show="expanded">
                    <slot></slot>
                </q-card-section>
            </q-slide-transition>
        </q-card>
        <div v-else class="ma-0 pa-0">
            <slot></slot>
        </div>
    </div>
</template>

<script lang="ts">
import 'reflect-metadata'
import { Vue, Component, Prop } from 'vue-property-decorator'
import { IListItemData } from '@/lib/ICompilerRegistry'
import { KnownBlockTypes } from '@/lib/ICodeBlocks'
import { BlockData } from '@/lib/codeBlocksManager'
import { blocklyLoader } from '@/lib/BlockloadManagers/BlocklyManager'
import { IOnChangeOrder } from './CodeBlocks.vue'

@Component
export default class CodeBlocksContainer extends Vue {
    frank = 'hello'
    settingsMenu: boolean = false
    highlighted: boolean = false

    get types(): IListItemData[] {
        return [
            {
                label: this.$l('CodeBlockContainer.Canvas'),
                value: KnownBlockTypes.PLAYGROUND,
            },
            {
                label: this.$l('CodeBlockContainer.Text'),
                value: KnownBlockTypes.TEXT,
            },
            {
                label: this.$l('CodeBlockContainer.Hidden'),
                value: KnownBlockTypes.BLOCKHIDDEN,
            },
            {
                label: this.$l('CodeBlockContainer.Static'),
                value: KnownBlockTypes.BLOCKSTATIC,
            },
            {
                label: this.$l('CodeBlockContainer.Block'),
                value: KnownBlockTypes.BLOCK,
            },
            {
                label: this.$l('CodeBlockContainer.Blockly'),
                value: KnownBlockTypes.BLOCKLY,
            },
            {
                label: this.$l('CodeBlockContainer.REPL'),
                value: KnownBlockTypes.REPL,
            },
        ]
    }
    get alignments(): IListItemData[] {
        return [
            {
                label: this.$l('CodeBlockContainer.Start'),
                value: 'left',
            },
            {
                label: this.$l('CodeBlockContainer.Center'),
                value: 'center',
            },
            {
                label: this.$l('CodeBlockContainer.End'),
                value: 'right',
            },
        ]
    }
    get scriptVersions(): IListItemData[] {
        return [
            {
                label: this.$l('CodeBlockContainer.ScriptVersion_1'),
                value: '100',
            },
            {
                label: this.$l('CodeBlockContainer.ScriptVersion_2'),
                value: '101',
            },
            {
                label: this.$l('CodeBlockContainer.ScriptVersion_3'),
                value: '102',
            },
        ]
    }

    get positions(): IListItemData[] {
        return this.block.appSettings.blocks.map((bl) => {
            return {
                label: `${bl.id + 1}`,
                value: `${bl.id}`,
            }
        })
    }

    get isDeprecatedScriptVersion(): boolean {
        return this.scriptVersion === '100'
    }

    get isExperimentalScriptVersion(): boolean {
        return this.scriptVersion === '102'
    }

    // mounted() {
    //     console.log('Mounted', this)
    // }

    @Prop({ required: true }) block!: BlockData
    @Prop({ default: false }) editMode!: boolean

    validNumber(v: 'auto' | number): boolean | string {
        //console.log(v, isNaN(v), v!='auto');
        if (v != 'auto' && isNaN(v)) {
            return "Must be a valid Number or 'auto'."
        }
        return true
    }
    toggleExpanded(): void {
        this.$CodeBlock.refreshAllCodeMirrors()
        this.expanded = !this.expanded
    }
    moveUp(): void {
        this.$emit('move-up', this.block.id)
    }
    moveDown(): void {
        this.$emit('move-down', this.block.id)
    }

    get order(): IListItemData {
        return Vue.$CodeBlock.itemForValue(this.positions, this.block.id)
    }

    set order(val: IListItemData) {
        const data: IOnChangeOrder = { id: this.block.id, newID: +val.value }
        this.$emit('change-order', data)
    }

    showTypeInfoDialog(): void {
        this.$q
            .dialog({
                title: this.$l('CodeBlockContainer.TypesCaption'),
                message: this.$l('CodeBlockContainer.Types'),
                html: true,
                style: 'width:75%',
            })
            .onOk(() => {
                // console.log('OK')
            })
            .onCancel(() => {
                // console.log('Cancel')
            })
            .onDismiss(() => {
                // console.log('I am triggered on both OK and Cancel')
            })
    }
    removeBlock(): void {
        const self = this
        self.highlighted = true
        this.$q
            .dialog({
                title: this.$l('CodeBlockContainer.Confirm'),
                message: this.$l('CodeBlockContainer.DeleteQuestion'),
                html: true,
                ok: {
                    push: true,
                    color: 'negative',
                    icon: 'warning',
                },
                cancel: {
                    push: true,
                    color: 'positive',
                },
                persistent: true,
            })
            .onOk(() => {
                this.$emit('remove-block', this.block.id)
            })
            .onCancel(() => {})
            .onDismiss(() => {
                self.highlighted = false
            })
    }

    get expanded(): boolean {
        return this.block.expanded
    }
    set expanded(v: boolean) {
        this.block.expanded = v
    }

    get canMoveUp(): boolean {
        return this.block.id > 0
    }
    get canMoveDown(): boolean {
        return !this.block.isLast
    }

    filteredCopy(objIn: object, extended: boolean = true, path: string = 'this'): object {
        let obj = {}
        Object.keys(objIn)
            .filter(
                (k) =>
                    k.indexOf('appSettings') != 0 &&
                    k.indexOf('$') != 0 &&
                    k.indexOf('_') != 0 &&
                    (!extended ||
                        (k != 'obj' &&
                            k != 'errors' &&
                            k != 'content' &&
                            k != 'firstLine' &&
                            k != 'nextLine' &&
                            k != 'lineCount' &&
                            k != 'hasCode' &&
                            k != 'isLast' &&
                            k != 'readyCount' &&
                            k != 'noContent' &&
                            (this.block.type === KnownBlockTypes.BLOCKLY || k != 'blockly'))) &&
                    k != 'uuid' &&
                    k != 'scopeUUID' &&
                    k != 'scopeSelector'
            )
            .forEach((k) => {
                let v = objIn[k]
                if (v !== undefined && v !== null && typeof v === 'object') {
                    if (Array.isArray(v)) {
                        v = v.map((item, nr) =>
                            this.filteredCopy(item, false, path + '.' + k + `[${nr}]`)
                        )
                    } else {
                        v = this.filteredCopy(v, false, path + '.' + k)
                    }
                }
                obj[k] = v
            })

        return obj
    }
    get serializedOptions(): string {
        return JSON.stringify(this.filteredCopy(this.block))
    }
    set serializedOptions(v: string) {}

    get hasExtendedSettings(): boolean {
        return (
            this.type == KnownBlockTypes.PLAYGROUND ||
            this.type == KnownBlockTypes.BLOCK ||
            this.type == KnownBlockTypes.BLOCKLY
        )
    }
    get isVersionedPlayground(): boolean {
        return this.type == KnownBlockTypes.PLAYGROUND
    }
    get canSetLineNumbers() {
        return this.type == KnownBlockTypes.BLOCK
    }
    get canHaveAlternativeContent() {
        return this.type == KnownBlockTypes.BLOCK
    }
    get canDefinePlacement() {
        return this.type == KnownBlockTypes.PLAYGROUND || this.type == KnownBlockTypes.BLOCKLY
    }
    get shouldAutoReset(): boolean {
        return this.block.shouldAutoreset
    }
    set shouldAutoReset(v: boolean) {
        this.$emit('auto-reset-change', {
            shouldAutoreset: v,
            id: this.block.id,
        })
    }
    get shouldGenerateTemplate(): boolean {
        return this.block.generateTemplate
    }
    set shouldGenerateTemplate(v: boolean) {
        this.$emit('generate-template-change', {
            generateTemplate: v,
            id: this.block.id,
        })
    }

    get scriptVersion(): string {
        if (
            this.block === undefined ||
            this.block.version === undefined ||
            this.block.version == ''
        ) {
            return '100'
        }
        return this.block.version
    }
    get scriptVersionObj(): IListItemData {
        return Vue.$CodeBlock.itemForValue(this.scriptVersions, this.scriptVersion)
    }
    set scriptVersionObj(v: IListItemData) {
        this.$emit('script-version-change', {
            version: v.value,
            id: this.block.id,
        })
    }

    get hasAltComntent(): boolean {
        return this.block.hasAlternativeContent
    }
    set hasAltComntent(v: boolean) {
        if (v != this.block.hasAlternativeContent && v) {
            this.$nextTick(() => {
                setTimeout(function () {
                    $('.CodeMirror')
                        .toArray()
                        .forEach((cm) => {
                            const element = cm as any
                            element.CodeMirror.refresh()
                        })
                }, 200)
            })
        }
        this.block.hasAlternativeContent = v
    }

    get colorClass(): string {
        const t = this.type
        if (t == KnownBlockTypes.TEXT) {
            return 'text-border'
        } else if (t == KnownBlockTypes.PLAYGROUND) {
            return 'playground-border'
        } else if (t == KnownBlockTypes.BLOCK) {
            return 'block-border'
        } else if (t == KnownBlockTypes.BLOCKHIDDEN) {
            return 'block-hidden-border'
        } else if (t == KnownBlockTypes.BLOCKSTATIC) {
            return 'block-static-border'
        } else if (t == KnownBlockTypes.REPL) {
            return 'repl-border'
        }
        return 'default-border'
    }
    get bgClass(): string {
        if (this.highlighted) {
            return 'highlightedCard'
        }
        return ''
    }
    get type(): KnownBlockTypes {
        if (this.block.type == KnownBlockTypes.BLOCK) {
            if (this.block.hidden) {
                return KnownBlockTypes.BLOCKHIDDEN
            }
            if (this.block.static) {
                return KnownBlockTypes.BLOCKSTATIC
            }
        }
        return this.block.type
    }
    get typeObj(): IListItemData {
        return Vue.$CodeBlock.itemForValue(this.types, this.type)
    }
    set typeObj(val: IListItemData) {
        const v = val.value
        let ret = {
            type: v.match(/([^-]*)/)![0],
            hidden: v == KnownBlockTypes.BLOCKHIDDEN,
            static: v == KnownBlockTypes.BLOCKSTATIC,
            id: this.block.id,
            hasCode: false,
        }
        ret.hasCode = ret.type == KnownBlockTypes.BLOCK

        if (ret.type == KnownBlockTypes.PLAYGROUND && this.block.content === '' && this.editMode) {
            if (this.block.scriptVersion == '100') {
                this.block.content =
                    '{\n    init: function(canvasElement) {\n\n    },\n    update: function(output, canvasElement) {\n\n    }\n}'
            } else {
                this.block.content =
                    '{\n    init: function(canvasElement, outputElement, scope, runner) {\n\n    },\n    addArgumentsTo(args) {},\n    reset(canvasElement) {},\n    update: function(txt, json, canvasElement, outputElement) {\n\n    }\n}'
            }
        } else if (
            ret.type == KnownBlockTypes.BLOCKLY &&
            this.block.blockly.toolbox.categories.length === 0 &&
            this.editMode
        ) {
            this.block.blockly.toolbox = blocklyLoader.defaultToolbox
        }

        this.$emit('type-change', ret)
    }
    get visibleLines(): number | 'auto' {
        const v = this.block.visibleLines
        if (v == 'auto' || isNaN(v)) {
            return 'auto'
        }
        return v
    }
    set visibleLines(v: number | 'auto') {
        if (v == 'auto' || isNaN(v)) {
            v = 'auto'
        }
        console.log('set', v)

        this.$emit('visible-lines-change', {
            visibleLines: v,
            id: this.block.id,
        })
    }

    get width(): string {
        return this.block.width
    }
    set width(v: string) {
        this.$emit('placement-change', {
            width: v,
            height: this.block.height,
            align: this.block.align,
            id: this.block.id,
        })
    }
    get height(): string {
        return this.block.height
    }
    set height(v: string) {
        this.$emit('placement-change', {
            width: this.block.width,
            height: v,
            align: this.block.align,
            id: this.block.id,
        })
    }
    get align(): IListItemData {
        return Vue.$CodeBlock.itemForValue(this.alignments, this.block.align)
    }
    set align(v: IListItemData) {
        this.$emit('placement-change', {
            width: this.block.width,
            height: this.block.height,
            align: v.value,
            id: this.block.id,
        })
    }
}
</script>

<style lang="sass">
.inlined-input
    display : inline-block
.editModeBlockContainer
    border-radius : 0px !important
    border-left-width : 4px !important
    border-left-style : solid !important
textarea.blockoptions
    display : none !important
    width : 1px
    height : 1px
.highlightedCard
    background-image: linear-gradient(45deg, #d15151 25%, #5F5370 25%, #5F5370 50%, #d15151 50%, #d15151 75%, #5F5370 75%, #5F5370 100%)
    background-size: 56.57px 56.57px
    background-repeat: repeat
.highlightedCard.sample
    border-radius: 6px
    padding: 4px
    margin: 3px
    box-shadow: 2px 2px 3px rgba(0,0,0, 0.3)
    color: white
    font-weight: bold
</style>
