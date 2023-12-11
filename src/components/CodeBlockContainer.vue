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
                        class="order-xs-first order-sm-last col-xs-12 col-sm-8 col-md-5 q-my-none q-py-none rightContentContainerHeader"
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

                                    <div class="row no-wrap q-pl-md" v-if="canLoadResources">
                                        <div class="col-7">
                                            <div class="text-subtitle2">
                                                {{ $l('CodeBlockContainer.ReloadResources') }}
                                            </div>
                                            <div class="text-caption text-blue-grey-4">
                                                {{
                                                    $l('CodeBlockContainer.ReloadResources_detail')
                                                }}
                                            </div>
                                        </div>
                                        <div class="col-5 q-pl-sm">
                                            <q-toggle v-model="shouldReloadResources" />
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
                            size="sm"
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
                            size="sm"
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
                            size="md"
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
                            size="md"
                            :ripple="{ center: true }"
                        ></q-btn>
                        <q-btn
                            :icon="expanded ? 'expand_less' : 'expand_more'"
                            color="primary"
                            small
                            flat
                            round
                            size="sm"
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
import { defineComponent, toRefs, ref, computed, PropType, getCurrentInstance, nextTick } from 'vue'
import { IListItemData } from '@/lib/ICompilerRegistry'
import { KnownBlockTypes } from '@/lib/ICodeBlocks'
import { BlockData } from '@/lib/codeBlocksManager'
import { IOnChangeOrder, IOnReloadResourcesInfo } from './CodeBlocks.vue'
import { globalState } from '@/lib/globalState'

export default defineComponent({
    name: 'CodeBlockContainer',
    props: {
        block: { required: true, type: Object as PropType<BlockData> },
        editMode: { default: false, type: Boolean },
    },
    setup(props, ctx) {
        const instance = getCurrentInstance()
        const q = instance?.proxy?.$root?.$q
        const t = instance?.proxy?.$root?.$t
        const l = instance?.proxy?.$root?.$l

        const { block, editMode } = toRefs(props)
        const settingsMenu = ref<boolean>(false)
        let highlighted = ref<boolean>(false)
        const types = computed((): IListItemData[] => {
            if (l == undefined) {
                return []
            }
            return [
                {
                    label: l('CodeBlockContainer.Canvas'),
                    value: KnownBlockTypes.PLAYGROUND,
                },
                {
                    label: l('CodeBlockContainer.DataBlock'),
                    value: KnownBlockTypes.DATA,
                },
                {
                    label: l('CodeBlockContainer.Text'),
                    value: KnownBlockTypes.TEXT,
                },
                {
                    label: l('CodeBlockContainer.Hidden'),
                    value: KnownBlockTypes.BLOCKHIDDEN,
                },
                {
                    label: l('CodeBlockContainer.Static'),
                    value: KnownBlockTypes.BLOCKSTATIC,
                },
                {
                    label: l('CodeBlockContainer.Block'),
                    value: KnownBlockTypes.BLOCK,
                },
                {
                    label: l('CodeBlockContainer.REPL'),
                    value: KnownBlockTypes.REPL,
                },
            ]
        })
        const alignments = computed((): IListItemData[] => {
            if (l == undefined) {
                return []
            }
            return [
                {
                    label: l('CodeBlockContainer.Start'),
                    value: 'left',
                },
                {
                    label: l('CodeBlockContainer.Center'),
                    value: 'center',
                },
                {
                    label: l('CodeBlockContainer.End'),
                    value: 'right',
                },
            ]
        })
        const scriptVersions = computed((): IListItemData[] => {
            if (l == undefined) {
                return []
            }
            return [
                {
                    label: l('CodeBlockContainer.ScriptVersion_1'),
                    value: '100',
                },
                {
                    label: l('CodeBlockContainer.ScriptVersion_2'),
                    value: '101',
                },
                {
                    label: l('CodeBlockContainer.ScriptVersion_3'),
                    value: '102',
                },
            ]
        })
        const positions = computed((): IListItemData[] => {
            return block.value.appSettings.blocks.map((bl) => {
                return {
                    label: `${bl.id + 1}`,
                    value: `${bl.id}`,
                }
            })
        })
        const isDeprecatedScriptVersion = computed((): boolean => {
            return scriptVersion.value === '100'
        })
        const isExperimentalScriptVersion = computed((): boolean => {
            return scriptVersion.value === '102'
        })
        const order = computed({
            get(): IListItemData {
                return globalState.codeBlocks.itemForValue(positions.value, `${block.value.id}`)
            },
            set(val: IListItemData) {
                const data: IOnChangeOrder = { id: block.value.id, newID: +val.value }
                ctx.emit('change-order', data)
            },
        })
        const expanded = computed({
            get(): boolean {
                return block.value.expanded
            },
            set(v: boolean) {
                block.value.expanded = v
            },
        })
        const canMoveUp = computed((): boolean => {
            return block.value.id > 0
        })
        const canMoveDown = computed((): boolean => {
            return !block.value.isLast
        })
        const serializedOptions = computed({
            get(): string {
                return JSON.stringify(filteredCopy(block.value))
            },
            set(v: string) {},
        })
        const hasExtendedSettings = computed((): boolean => {
            return type.value == KnownBlockTypes.PLAYGROUND || type.value == KnownBlockTypes.BLOCK
        })
        const isVersionedPlayground = computed((): boolean => {
            return type.value == KnownBlockTypes.PLAYGROUND
        })
        const canSetLineNumbers = computed(() => {
            return type.value == KnownBlockTypes.BLOCK
        })
        const canHaveAlternativeContent = computed(() => {
            return type.value == KnownBlockTypes.BLOCK
        })
        const canDefinePlacement = computed(() => {
            return type.value == KnownBlockTypes.PLAYGROUND
        })
        const shouldAutoReset = computed({
            get(): boolean {
                return block.value.shouldAutoreset
            },
            set(v: boolean) {
                ctx.emit('auto-reset-change', {
                    shouldAutoreset: v,
                    id: block.value.id,
                })
            },
        })
        const shouldReloadResources = computed({
            get(): boolean {
                return block.value.shouldReloadResources
            },
            set(v: boolean) {
                const data: IOnReloadResourcesInfo = {
                    shouldReloadResources: v,
                    id: block.value.id,
                }
                ctx.emit('reload-resources-change', data)
            },
        })
        const shouldGenerateTemplate = computed({
            get(): boolean {
                return block.value.generateTemplate
            },
            set(v: boolean) {
                ctx.emit('generate-template-change', {
                    generateTemplate: v,
                    id: block.value.id,
                })
            },
        })
        const scriptVersion = computed((): string => {
            if (
                block.value === undefined ||
                block.value.version === undefined ||
                block.value.version == ''
            ) {
                return '100'
            }
            return block.value.version
        })
        const scriptVersionObj = computed({
            get(): IListItemData {
                return globalState.codeBlocks.itemForValue(
                    scriptVersions.value,
                    scriptVersion.value
                )
            },
            set(v: IListItemData) {
                ctx.emit('script-version-change', {
                    version: v.value,
                    id: block.value.id,
                })
            },
        })
        const canLoadResources = computed((): boolean => {
            return +scriptVersion.value > 100
        })
        const hasAltComntent = computed({
            get(): boolean {
                return block.value.hasAlternativeContent
            },
            set(v: boolean) {
                if (v != block.value.hasAlternativeContent && v) {
                    nextTick(() => {
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
                block.value.hasAlternativeContent = v
            },
        })
        const colorClass = computed((): string => {
            const t = type.value
            if (t == KnownBlockTypes.TEXT) {
                return 'text-border'
            } else if (t == KnownBlockTypes.PLAYGROUND) {
                return 'playground-border'
            } else if (t == KnownBlockTypes.DATA) {
                return 'data-border'
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
        })
        const bgClass = computed((): string => {
            if (highlighted.value) {
                return 'highlightedCard'
            }
            return ''
        })
        const type = computed((): KnownBlockTypes => {
            if (block.value.type == KnownBlockTypes.BLOCK) {
                if (block.value.hidden) {
                    return KnownBlockTypes.BLOCKHIDDEN
                }
                if (block.value.static) {
                    return KnownBlockTypes.BLOCKSTATIC
                }
            }
            return block.value.type
        })
        const typeObj = computed({
            get(): IListItemData {
                return globalState.codeBlocks.itemForValue(types.value, type.value)
            },
            set(val: IListItemData) {
                const v = val.value
                let ret = {
                    type: v.match(/([^-]*)/)![0],
                    hidden: v == KnownBlockTypes.BLOCKHIDDEN,
                    static: v == KnownBlockTypes.BLOCKSTATIC,
                    id: block.value.id,
                    hasCode: false,
                }
                ret.hasCode = ret.type == KnownBlockTypes.BLOCK
                if (
                    ret.type == KnownBlockTypes.PLAYGROUND &&
                    block.value.content === '' &&
                    editMode.value
                ) {
                    if (block.value.scriptVersion == '100') {
                        block.value.content =
                            '{\n    init: function(canvasElement) {\n\n    },\n    update: function(output, canvasElement) {\n\n    }\n}'
                    } else {
                        block.value.content =
                            '{\n    init: function(canvasElement, outputElement, scope, runner) {\n\n    },\n    addArgumentsTo(args) {},\n    reset(canvasElement) {},\n    update: function(txt, json, canvasElement, outputElement) {\n\n    }\n}'
                    }
                }
                ctx.emit('type-change', ret)
            },
        })
        const visibleLines = computed({
            get(): number | 'auto' {
                const v = block.value.visibleLines
                if (v == 'auto' || isNaN(v)) {
                    return 'auto'
                }
                return v
            },
            set(v: number | 'auto') {
                if (v == 'auto' || isNaN(v)) {
                    v = 'auto'
                }
                console.log('set', v)
                ctx.emit('visible-lines-change', {
                    visibleLines: v,
                    id: block.value.id,
                })
            },
        })
        const width = computed({
            get(): string {
                return block.value.width
            },
            set(v: string) {
                ctx.emit('placement-change', {
                    width: v,
                    height: block.value.height,
                    align: block.value.align,
                    id: block.value.id,
                })
            },
        })
        const height = computed({
            get(): string {
                return block.value.height
            },
            set(v: string) {
                ctx.emit('placement-change', {
                    width: block.value.width,
                    height: v,
                    align: block.value.align,
                    id: block.value.id,
                })
            },
        })
        const align = computed({
            get(): IListItemData {
                return globalState.codeBlocks.itemForValue(alignments.value, block.value.align)
            },
            set(v: IListItemData) {
                ctx.emit('placement-change', {
                    width: block.value.width,
                    height: block.value.height,
                    align: v.value,
                    id: block.value.id,
                })
            },
        })
        const validNumber = (v: 'auto' | number): boolean | string => {
            if (v != 'auto' && isNaN(v)) {
                return "Must be a valid Number or 'auto'."
            }
            return true
        }
        const toggleExpanded = (): void => {
            globalState.codeBlocks.refreshAllCodeMirrors()
            expanded.value = !expanded.value
        }
        const moveUp = (): void => {
            ctx.emit('move-up', block.value.id)
        }
        const moveDown = (): void => {
            ctx.emit('move-down', block.value.id)
        }
        const showTypeInfoDialog = (): void => {
            if (q === undefined || l === undefined) {
                return
            }
            q.dialog({
                title: l('CodeBlockContainer.TypesCaption'),
                message: l('CodeBlockContainer.Types'),
                html: true,
                style: 'width:75%',
            })
                .onOk(() => {})
                .onCancel(() => {})
                .onDismiss(() => {})
        }
        const removeBlock = (): void => {
            if (q === undefined || l === undefined) {
                return
            }
            const self = this
            highlighted.value = true
            q.dialog({
                title: l('CodeBlockContainer.Confirm'),
                message: l('CodeBlockContainer.DeleteQuestion'),
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
                    ctx.emit('remove-block', block.value.id)
                })
                .onCancel(() => {})
                .onDismiss(() => {
                    highlighted.value = false
                })
        }
        const filteredCopy = (
            objIn: object,
            extended: boolean = true,
            path: string = 'this'
        ): object => {
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
                                k != 'noContent')) &&
                        k != 'uuid' &&
                        k != 'scopeUUID' &&
                        k != 'scopeSelector'
                )
                .forEach((k) => {
                    let v = objIn[k]
                    if (v !== undefined && v !== null && typeof v === 'object') {
                        if (Array.isArray(v)) {
                            v = v.map((item, nr) =>
                                filteredCopy(item, false, path + '.' + k + `[${nr}]`)
                            )
                        } else {
                            v = filteredCopy(v, false, path + '.' + k)
                        }
                    }
                    obj[k] = v
                })
            return obj
        }
        return {
            settingsMenu,
            highlighted,
            types,
            alignments,
            scriptVersions,
            positions,
            isDeprecatedScriptVersion,
            isExperimentalScriptVersion,
            order,
            expanded,
            canMoveUp,
            canMoveDown,
            serializedOptions,
            hasExtendedSettings,
            isVersionedPlayground,
            canSetLineNumbers,
            canHaveAlternativeContent,
            canDefinePlacement,
            shouldAutoReset,
            shouldReloadResources,
            shouldGenerateTemplate,
            scriptVersion,
            scriptVersionObj,
            canLoadResources,
            hasAltComntent,
            colorClass,
            bgClass,
            type,
            typeObj,
            visibleLines,
            width,
            height,
            align,
            validNumber,
            toggleExpanded,
            moveUp,
            moveDown,
            showTypeInfoDialog,
            removeBlock,
            filteredCopy,
        }
    },
})
</script>

<style lang="sass">
.rightContentContainerHeader
    display: flex
    justify-content: flex-end
    align-items: center

.inlined-input
    display: inline-block

.editModeBlockContainer
    border-radius: 0px !important
    border-left-width: 4px !important
    border-left-style: solid !important

textarea.blockoptions
    display: none !important
    width: 1px
    height: 1px

.highlightedCard
    background-image: linear-gradient(45deg, #d15151 25%, #5F5370 25%, #5F5370 50%, #d15151 50%, #d15151 75%, #5F5370 75%, #5F5370 100%)
    background-size: 56.57px 56.57px
    background-repeat: repeat

.highlightedCard.sample
    border-radius: 6px
    padding: 4px
    margin: 3px
    box-shadow: 2px 2px 3px rgba(0, 0, 0, 0.3)
    color: white
    font-weight: bold
</style>
