<template>
    <div
        :data-question="block.parentID"
        :data-nr="block.id"
        :uuid="block.uuid"
        class="block-container"
    >
        <Card
            v-if="editMode"
            :class="`tw-mx-0 tw-my-1 tw-p-0 editModeBlockContainer ${colorClass} ${bgClass}`"
        >
            <CardContent class="tw-mb-0 tw-pb-2 tw-pt-2 ">
                <div class="tw-flex tw-flex-col sm:tw-flex-row tw-gap-1">
                    <div class="tw-w-full sm:tw-w-1/3 tw-flex tw-items-center tw-gap-2">
                        <CSelect
                            :model-value="typeObj"
                            :options="types"
                            @update:model-value="typeObj = $event"
                            class="tw-w-full"
                        />
                        <HoverCard>
                            <HoverCardTrigger>
                                <Info class="tw-h-4 tw-w-4 tw-cursor-help tw-text-muted-foreground hover:tw-text-foreground" />
                            </HoverCardTrigger>
                            <HoverCardContent class="tw-w-80">
                                <div v-html="l('CodeBlockContainer.Types')" class="hover-content"></div>
                            </HoverCardContent>
                        </HoverCard>
                    </div>
                    <div class="tw-flex-grow"></div>
                    <div class="tw-w-full sm:tw-w-2/3 md:tw-w-5/12 rightContentContainerHeader">
                        <DropdownMenu v-if="hasExtendedSettings">
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    <Settings class="tw-h-4 tw-w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent 
                                class="tw-max-h-[80vh] tw-max-w-[400px] tw-overflow-y-auto tw-overflow-x-hidden modern-scrollbars"
                                side="right"
                                align="start"
                                :sideOffset="5"
                            >
                                <!-- LineNumbers -->
                                <div v-if="canSetLineNumbers" class="tw-p-4">
                                    <div class="tw-text-sm tw-font-medium tw-mb-4">
                                        {{ l('CodeBlockContainer.Display') }}
                                    </div>
                                    <div class="tw-flex tw-items-center tw-space-x-4">
                                        <div class="tw-flex-1 tw-w-2/3">
                                            <div class="tw-font-medium">
                                                {{ l('CodeBlockContainer.Lines') }}
                                            </div>
                                            <div class="tw-text-sm tw-text-muted-foreground" v-html="l('CodeBlockContainer.Lines_detail')"></div>
                                        </div>
                                        <Input
                                            v-model="visibleLines"
                                            :rules="[validNumber]"
                                            class="tw-w-1/3"
                                            maxlength="4"
                                        />
                                    </div>
                                    <div v-if="canHaveAlternativeContent" class="tw-flex tw-items-center tw-space-x-4 tw-mt-4">
                                        <div class="tw-flex-1 tw-w-2/3">
                                            <div class="tw-font-medium">
                                                {{ l('CodeBlockContainer.Prepopulate') }}
                                            </div>
                                            <div class="tw-text-sm tw-text-muted-foreground">
                                                {{ l('CodeBlockContainer.Prepopulate_detail') }}
                                            </div>
                                        </div>
                                        <div class="tw-w-1/3">
                                            <Switch v-model="hasAltComntent" />
                                        </div>
                                    </div>
                                </div>

                                <!-- Playground Versioning -->
                                <div v-if="isVersionedPlayground" class="tw-p-4">
                                    <div class="tw-text-sm tw-font-medium tw-mb-4">
                                        {{ l('CodeBlockContainer.Behaviour') }}
                                    </div>
                                    <div class="tw-flex tw-items-center tw-space-x-4">
                                        <div class="tw-flex-1 tw-w-2/3">
                                            <div class="tw-font-medium">
                                                {{ l('CodeBlockContainer.ScriptV') }}
                                            </div>
                                            <div class="tw-text-sm tw-text-muted-foreground">
                                                {{ l('CodeBlockContainer.ScriptV_detail') }}
                                            </div>
                                        </div>
                                        <CSelect
                                            :model-value="scriptVersionObj"
                                            :options="scriptVersions"
                                            @update:model-value="scriptVersionObj = $event"
                                            class="tw-w-1/3"
                                        />
                                    </div>

                                    <div class="tw-flex tw-items-center tw-space-x-4 tw-mt-4">
                                        <div class="tw-flex-1 tw-w-2/3">
                                            <div class="tw-font-medium">
                                                {{ l('CodeBlockContainer.AutoReset') }}
                                            </div>
                                            <div class="tw-text-sm tw-text-muted-foreground">
                                                {{ l('CodeBlockContainer.AutoReset_detail') }}
                                            </div>
                                        </div>
                                        <div class="tw-w-1/3">
                                            <Switch v-model="shouldAutoReset" />
                                        </div>
                                    </div>

                                    <div v-if="canLoadResources" class="tw-flex tw-items-center tw-space-x-4 tw-mt-4">
                                        <div class="tw-flex-1 tw-w-2/3">
                                            <div class="tw-font-medium">
                                                {{ l('CodeBlockContainer.ReloadResources') }}
                                            </div>
                                            <div class="tw-text-sm tw-text-muted-foreground">
                                                {{ l('CodeBlockContainer.ReloadResources_detail') }}
                                            </div>
                                        </div>
                                        <div class="tw-w-1/3">
                                            <Switch v-model="shouldReloadResources" />
                                        </div>
                                    </div>

                                    <div class="tw-flex tw-items-center tw-space-x-4 tw-mt-4">
                                        <div class="tw-flex-1 tw-w-2/3">
                                            <div class="tw-font-medium">
                                                {{ l('CodeBlockContainer.GenerateTemplate') }}
                                            </div>
                                            <div class="tw-text-sm tw-text-muted-foreground">
                                                {{ l('CodeBlockContainer.GenerateTemplate_detail') }}
                                            </div>
                                        </div>
                                        <div class="tw-w-1/3">
                                            <Switch v-model="shouldGenerateTemplate" />
                                        </div>
                                    </div>
                                </div>

                                <!-- Positioning -->
                                <div v-if="canDefinePlacement && shouldGenerateTemplate" class="tw-p-4">
                                    <div class="tw-text-sm tw-font-medium tw-mb-4">
                                        {{ l('CodeBlockContainer.Positioning') }}
                                    </div>
                                    <div class="tw-flex tw-items-center tw-space-x-4">
                                        <div class="tw-flex-1 tw-w-2/3">
                                            <div class="tw-font-medium">
                                                {{ l('CodeBlockContainer.Width') }}
                                            </div>
                                            <div class="tw-text-sm tw-text-muted-foreground">
                                                {{ l('CodeBlockContainer.Width_detail') }}
                                            </div>
                                        </div>
                                        <Input v-model="width" maxlength="7" class="tw-w-1/3" />
                                    </div>
                                    <div class="tw-flex tw-items-center tw-space-x-4 tw-mt-4">
                                        <div class="tw-flex-1 tw-w-2/3">
                                            <div class="tw-font-medium">
                                                {{ l('CodeBlockContainer.Height') }}
                                            </div>
                                            <div class="tw-text-sm tw-text-muted-foreground">
                                                {{ l('CodeBlockContainer.Height_detail') }}
                                            </div>
                                        </div>
                                        <Input v-model="height" maxlength="7" class="tw-w-1/3" />
                                    </div>
                                    <div class="tw-flex tw-items-center tw-space-x-4 tw-mt-4">
                                        <div class="tw-flex-1 tw-w-2/3">
                                            <div class="tw-font-medium">
                                                {{ l('CodeBlockContainer.Alignment') }}
                                            </div>
                                            <div class="tw-text-sm tw-text-muted-foreground">
                                                {{ l('CodeBlockContainer.Alignment_detail') }}
                                            </div>
                                        </div>
                                        <CSelect
                                            :model-value="align"
                                            :options="alignments"
                                            @update:model-value="align = $event"
                                            class="tw-w-1/3"
                                        />
                                    </div>
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                            variant="outline"
                            class="tw-ml-4 tw-mr-1"
                            :disabled="!canMoveUp"
                            @click="moveUp"
                        >
                            <ChevronUp class="tw-h-4 tw-w-4" />
                        </Button>

                        <CSelect
                            :model-value="order"
                            :options="positions"
                            @update:model-value="order = $event"
                            class="tw-w-20"
                        />

                        <Button
                            variant="outline"
                            class="tw-ml-1 tw-mr-4"
                            :disabled="!canMoveDown"
                            @click="moveDown"
                        >
                            <ChevronDown class="tw-h-4 tw-w-4" />
                        </Button>

                        <CButton
                            variant="destructive"
                            class="tw-hidden sm:tw-block sm:tw-mr-2 md:tw-mr-6"
                            @click="removeBlock"
                            :icon="AlertTriangle"
                        >
                            {{ $t('CodeBlockContainer.Delete') }}
                        </CButton>

                        <Button
                            variant="ghost"
                            size="icon"
                            class="tw-mr-[-9px]"
                            @click="toggleExpanded"
                        >
                            <ChevronUp v-if="expanded" class="tw-h-4 tw-w-4" />
                            <ChevronDown v-else class="tw-h-4 tw-w-4" />
                        </Button>
                    </div>
                </div>
                <textarea
                    :name="`block_options[${block.parentID}][${block.id}]`"
                    class="blockoptions"
                    v-model="serializedOptions"
                ></textarea>
            </CardContent>

            <Alert
                v-if="isExperimentalScriptVersion"
                variant="destructive"
                class="tw-mx-4 tw-mb-4"
            >
                <Flame class="tw-h-4 tw-w-4" />
                <AlertTitle>{{ $t('CodePlayground.ExperimentalScriptVersion') }}</AlertTitle>
                <AlertDescription>
                    {{ $t('CodePlayground.ExperimentalScriptVersionDesc') }}
                </AlertDescription>
            </Alert>

            <Alert
                v-if="isDeprecatedScriptVersion"
                variant="destructive"
                class="tw-mx-4 tw-mb-4"
            >
                <HourglassIcon class="tw-h-4 tw-w-4" />
                <AlertTitle>{{ $t('CodePlayground.DeprecatedScriptVersion') }}</AlertTitle>
                <AlertDescription>
                    {{ $t('CodePlayground.DeprecatedScriptVersionDesc') }}
                </AlertDescription>
            </Alert>

            <CardContent v-show="expanded" class="tw-py-1">
                <slot></slot>
            </CardContent>
        </Card>
        <div v-else class="tw-m-0 tw-p-0">
            <slot></slot>
        </div>
    </div>

    <Dialog :open="deleteDialogOpen" @update:open="deleteDialogOpen = $event">
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{{ l('CodeBlockContainer.Confirm') }}</DialogTitle>
                <DialogDescription v-html="l('CodeBlockContainer.DeleteQuestion')"></DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button variant="outline" @click="deleteDialogOpen = false">Cancel</Button>
                <Button variant="destructive" @click="confirmDelete">Delete</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

<script lang="ts" setup>
import { defineComponent, toRefs, ref, computed, PropType, getCurrentInstance, nextTick } from 'vue'
import { IListItemData } from '@/lib/ICompilerRegistry'
import { IRandomizerSet, KnownBlockTypes } from '@/lib/ICodeBlocks'
import { BlockData } from '@/lib/codeBlocksManager'
import { globalState } from '@/lib/globalState'
import { l } from '@/plugins/i18n'
import { BasicBlockProps, DEFAULT_BASIC_BLOCK_PROPS } from '@/composables/basicBlock'
import { BlockStorageType, useBlockStorage } from '@/storage/blockStorage'

// Import shadcn components
import { Button } from '@/shadcn/ui/button'
import { Card, CardContent } from '@/shadcn/ui/card'
import { Input } from '@/shadcn/ui/input'
import { Switch } from '@/shadcn/ui/switch'

// Import icons
import { AlertTriangle, ChevronDown, ChevronUp, Settings, Info, Flame, HourglassIcon } from 'lucide-vue-next'

// Import new components
import CSelect  from './ui/CSelect.vue'
import CInput  from './ui/CInput.vue'
import  CButton  from './ui/CButton.vue'
import { Alert, AlertDescription, AlertTitle } from '../shadcn/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../shadcn/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../shadcn/ui/dropdown-menu'
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from '../shadcn/ui/hover-card'

// Define interfaces locally
interface IOnChangeOrder {
    id: number;
    newID: number;
}

interface IOnReloadResourcesInfo {
    shouldReloadResources: boolean;
    id: number;
}

interface Props extends BasicBlockProps {
    editMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    ...DEFAULT_BASIC_BLOCK_PROPS,
    editMode: false,
})
const emit = defineEmits([
    'change-order',
    'move-up',
    'move-down',
    'remove-block',
    'type-change',
    'visible-lines-change',
    'placement-change',
    'auto-reset-change',
    'reload-resources-change',
    'generate-template-change',
    'script-version-change',
])

const instance = getCurrentInstance()

const t = instance?.proxy?.$root?.$t
const blockStorage: BlockStorageType = useBlockStorage(props.appID)
const block = blockStorage.getBlock(props.blockID)
const { editMode } = toRefs(props)
const settingsMenu = ref<boolean>(false)
let highlighted = ref<boolean>(false)
const deleteDialogOpen = ref(false)

const removeBlock = (): void => {
    highlighted.value = true
    deleteDialogOpen.value = true
}

const confirmDelete = (): void => {
    emit('remove-block', block.value.id)
    deleteDialogOpen.value = false
    highlighted.value = false
}
// ...rest of existing code...

const types = computed((): IListItemData[] => {
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
        return globalState.appState.itemForValue(positions.value, `${block.value.id}`)
    },
    set(val: IListItemData) {
        const data: IOnChangeOrder = { id: block.value.id, newID: +val.value }
        emit('change-order', data)
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
        emit('auto-reset-change', {
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
        emit('reload-resources-change', data)
    },
})
const shouldGenerateTemplate = computed({
    get(): boolean {
        return block.value.generateTemplate
    },
    set(v: boolean) {
        emit('generate-template-change', {
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
        return globalState.appState.itemForValue(scriptVersions.value, scriptVersion.value)
    },
    set(v: IListItemData) {
        emit('script-version-change', {
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
        return globalState.appState.itemForValue(types.value, type.value)
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
                    'module.exports = {\n    init: function(canvasElement, outputElement, scope, runner) {\n\n    },\n    addArgumentsTo(args) {},\n    reset(canvasElement) {},\n    update: function(txt, json, canvasElement, outputElement) {\n\n    }\n}'
            }
        }
        emit('type-change', ret)
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
        emit('visible-lines-change', {
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
        emit('placement-change', {
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
        emit('placement-change', {
            width: block.value.width,
            height: v,
            align: block.value.align,
            id: block.value.id,
        })
    },
})
const align = computed({
    get(): IListItemData {
        return globalState.appState.itemForValue(alignments.value, block.value.align)
    },
    set(v: IListItemData) {
        emit('placement-change', {
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
    globalState.appState.refreshAllCodeMirrors()
    expanded.value = !expanded.value
}
const moveUp = (): void => {
    emit('move-up', block.value.id)
}
const moveDown = (): void => {
    emit('move-down', block.value.id)
}
const filteredCopy = (objIn: object, extended: boolean = true, path: string = 'this'): object => {
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
                    v = v.map((item, nr) => filteredCopy(item, false, path + '.' + k + `[${nr}]`))
                } else {
                    v = filteredCopy(v, false, path + '.' + k)
                }
            }
            obj[k] = v
        })
    return obj
}
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

.hover-content
    @apply tw-text-sm tw-text-muted-foreground
    @apply [&>p]:tw-mb-2 [&>ul]:tw-ml-4 [&>ul]:tw-list-disc [&>ul>li]:tw-mb-1
    @apply [&>code]:tw-px-1.5 [&>code]:tw-py-0.5 [&>code]:tw-bg-muted [&>code]:tw-rounded-sm [&>code]:tw-font-mono [&>code]:tw-text-xs
    @apply [&>pre]:tw-bg-muted [&>pre]:tw-p-2 [&>pre]:tw-rounded-md [&>pre]:tw-my-2 [&>pre]:tw-font-mono [&>pre]:tw-text-xs

:deep(.tw-max-w-\[400px\])
    .tw-text-sm
        word-wrap: break-word
        overflow-wrap: break-word
    .tw-flex
        min-width: 0
    .tw-flex-1
        min-width: 0
</style>
