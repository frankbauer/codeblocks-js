<template>
    <div
        :data-question="block.parentID"
        :data-nr="block.id"
        :uuid="block.uuid"
        class="block-container"
    >
        <div
            v-if="editMode"
            class="tw-group tw-relative tw-my-1"
            :style="isDragOver ? dropIndicatorStyle : {}"
            @dragover.prevent="onDragOver"
            @dragleave="onDragLeave"
            @drop.prevent="onDrop"
        >
            <!--
              Toolbar: appears on block-hover (opacity), extends on toolbar-hover (max-width).

              The drag handle is NOT inside overflow-hidden so it is always draggable once
              the toolbar is visible. Only the extended buttons are clipped via max-width.

              Layout: [grip | <overflow-hidden>[settings, delete, collapse]</overflow-hidden>]
              The whole assembly sits flush against the left colored border (border-radius 0 on
              the left, rounded on the right) with a type-color gradient background and glow.
            -->
            <div
                class="cbc-toolbar tw-absolute tw-top-0 tw-left-0 tw-z-10 tw-flex tw-items-center
                       tw-transition-opacity tw-duration-150"
                :class="toolbarIsOpen
                    ? 'tw-pointer-events-auto tw-opacity-100'
                    : 'tw-pointer-events-none group-hover:tw-pointer-events-auto tw-opacity-0 group-hover:tw-opacity-100'"
                :style="toolbarBaseStyle"
            >
                <!-- Drag handle: free from overflow-hidden so dragstart fires reliably -->
                <div
                    draggable="true"
                    @dragstart="onDragStart"
                    class="tw-w-6 tw-h-6 tw-shrink-0 tw-cursor-grab tw-flex tw-items-center tw-justify-center tw-text-foreground/50 hover:tw-text-foreground"
                >
                    <GripVertical class="tw-h-3.5 tw-w-3.5" style="pointer-events: none;" />
                </div>

                <!-- Extended buttons: slide out on toolbar :hover via CSS -->
                <div class="cbc-extended tw-flex tw-items-center tw-w-max tw-h-6" :class="{ 'is-open': toolbarIsOpen }">
                        <!-- Settings -->
                        <DropdownMenu v-model:open="settingsOpen">
                            <DropdownMenuTrigger as-child>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    class="tw-h-6 tw-w-6 tw-text-foreground/60 hover:tw-text-foreground"
                                >
                                    <Settings class="tw-h-3.5 tw-w-3.5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                side="bottom"
                                class="tw-w-[300px] sm:tw-w-[300px] md:tw-w-[45vw] tw-max-h-[60vh] tw-overflow-y-auto tw-overflow-x-hidden modern-scrollbar"
                                align="start"
                                :sideOffset="4"
                            >
                                <!-- Block type + label -->
                                <div class="tw-p-4">
                                    <div class="tw-flex tw-items-center tw-gap-2 tw-mb-3">
                                        <div class="tw-hidden sm:tw-block">
                                            <HoverCard>
                                                <HoverCardTrigger>
                                                    <Info
                                                        class="tw-h-4 tw-w-4 tw-cursor-help tw-text-muted-foreground hover:tw-text-foreground"
                                                    />
                                                </HoverCardTrigger>
                                                <HoverCardContent
                                                    class="tw-w-80 tw-max-h-[30vh] tw-overflow-y-auto tw-overflow-x-hidden modern-scrollbar"
                                                >
                                                    <div
                                                        v-html="l('CodeBlockContainer.Types')"
                                                        class="hover-content"
                                                    ></div>
                                                </HoverCardContent>
                                            </HoverCard>
                                        </div>
                                        <CSelect
                                            :model-value="typeObj"
                                            :options="types"
                                            @update:model-value="typeObj = $event"
                                            class="tw-flex-1"
                                        />
                                    </div>
                                    <div class="tw-space-y-1">
                                        <Label class="tw-text-xs tw-text-muted-foreground tw-ml-1">
                                            {{
                                                block.type === KnownBlockTypes.DATA ||
                                                block.type === KnownBlockTypes.LIBRARY
                                                    ? $t('LibraryBlock.Name')
                                                    : $t('CodeBlockContainer.Label')
                                            }}
                                        </Label>
                                        <Input
                                            v-model="block.name"
                                            class="tw-w-full"
                                            :placeholder="
                                                block.type === KnownBlockTypes.DATA ||
                                                block.type === KnownBlockTypes.LIBRARY
                                                    ? $t('LibraryBlock.Name')
                                                    : $t('CodeBlockContainer.OptionalLabel')
                                            "
                                        />
                                    </div>
                                    <div class="tw-flex tw-items-center tw-gap-2 tw-mt-2">
                                        <span class="tw-text-sm tw-text-muted-foreground tw-whitespace-nowrap">
                                            {{ l('CodeBlockContainer.Position') }}
                                        </span>
                                        <Input
                                            v-model="orderNumber"
                                            type="number"
                                            class="tw-w-20"
                                            min="1"
                                            :max="positions.length"
                                            @change="applyOrderNumber"
                                        />
                                        <span class="tw-text-sm tw-text-muted-foreground">/ {{ positions.length }}</span>
                                    </div>
                                </div>

                                <DropdownMenuSeparator v-if="hasExtendedSettings" />

                                <!-- LineNumbers (BLOCK type) -->
                                <div v-if="canSetLineNumbers" class="tw-p-4">
                                    <div class="tw-text-lg tw-font-medium tw-mb-4">
                                        {{ l('CodeBlockContainer.Display') }}
                                    </div>
                                    <div class="tw-flex tw-items-center tw-space-x-4 tw-ml-3">
                                        <div class="tw-w-2/3">
                                            <div class="tw-font-medium">
                                                {{ l('CodeBlockContainer.Lines') }}
                                            </div>
                                            <div
                                                class="tw-text-sm tw-text-muted-foreground"
                                                v-html="l('CodeBlockContainer.Lines_detail')"
                                            ></div>
                                        </div>
                                        <div>
                                            <Input
                                                v-model="visibleLines"
                                                :rules="[validNumber]"
                                                class="tw-w-1/3"
                                                maxlength="4"
                                            />
                                        </div>
                                    </div>
                                    <div
                                        v-if="canHaveAlternativeContent"
                                        class="tw-flex tw-items-center tw-space-x-4 tw-ml-3 tw-mt-4"
                                    >
                                        <div class="tw-w-2/3">
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

                                <!-- Playground versioning (PLAYGROUND type) -->
                                <div v-if="isVersionedPlayground" class="tw-p-4">
                                    <div class="tw-text-lg tw-font-medium tw-mb-4">
                                        {{ l('CodeBlockContainer.Behaviour') }}
                                    </div>
                                    <div class="tw-flex tw-items-center tw-space-x-4 tw-ml-3">
                                        <div class="tw-w-2/3">
                                            <div class="tw-font-medium">
                                                {{ l('CodeBlockContainer.ScriptV') }}
                                            </div>
                                            <div class="tw-text-sm tw-text-muted-foreground">
                                                {{ l('CodeBlockContainer.ScriptV_detail') }}
                                            </div>
                                        </div>
                                        <div class="tw-w-1/3">
                                            <CSelect
                                                :model-value="scriptVersionObj"
                                                :options="scriptVersions"
                                                @update:model-value="scriptVersionObj = $event"
                                            />
                                        </div>
                                    </div>

                                    <div
                                        class="tw-flex tw-items-center tw-space-x-4 tw-ml-3 tw-mt-4"
                                    >
                                        <div class="tw-w-2/3">
                                            <div class="tw-font-medium">
                                                {{ l('CodeBlockContainer.AutoReset') }}
                                            </div>
                                            <div class="tw-text-sm tw-text-muted-foreground">
                                                {{
                                                    l('CodeBlockContainer.AutoReset_detail')
                                                }}
                                            </div>
                                        </div>
                                        <div class="tw-w-1/3">
                                            <Switch v-model="shouldAutoReset" />
                                        </div>
                                    </div>

                                    <div
                                        v-if="canLoadResources"
                                        class="tw-flex tw-items-center tw-space-x-4 tw-ml-3 tw-mt-4"
                                    >
                                        <div class="tw-w-2/3">
                                            <div class="tw-font-medium">
                                                {{
                                                    l(
                                                        'CodeBlockContainer.ReloadResources'
                                                    )
                                                }}
                                            </div>
                                            <div class="tw-text-sm tw-text-muted-foreground">
                                                {{
                                                    l(
                                                        'CodeBlockContainer.ReloadResources_detail'
                                                    )
                                                }}
                                            </div>
                                        </div>
                                        <div class="tw-w-1/3">
                                            <Switch v-model="shouldReloadResources" />
                                        </div>
                                    </div>

                                    <div
                                        class="tw-flex tw-items-center tw-space-x-4 tw-ml-3 tw-mt-4"
                                    >
                                        <div class="tw-w-2/3">
                                            <div class="tw-font-medium">
                                                {{
                                                    l(
                                                        'CodeBlockContainer.GenerateTemplate'
                                                    )
                                                }}
                                            </div>
                                            <div class="tw-text-sm tw-text-muted-foreground">
                                                {{
                                                    l(
                                                        'CodeBlockContainer.GenerateTemplate_detail'
                                                    )
                                                }}
                                            </div>
                                        </div>
                                        <div class="tw-w-1/3">
                                            <Switch v-model="shouldGenerateTemplate" />
                                        </div>
                                    </div>
                                </div>

                                <!-- Positioning (PLAYGROUND with template) -->
                                <div
                                    v-if="canDefinePlacement && shouldGenerateTemplate"
                                    class="tw-p-4"
                                >
                                    <div class="tw-text-lg tw-font-medium tw-mb-4">
                                        {{ l('CodeBlockContainer.Positioning') }}
                                    </div>
                                    <div
                                        class="tw-flex tw-items-center tw-space-x-4 tw-ml-3"
                                    >
                                        <div class="tw-w-2/3">
                                            <div class="tw-font-medium">
                                                {{ l('CodeBlockContainer.Width') }}
                                            </div>
                                            <div class="tw-text-sm tw-text-muted-foreground">
                                                {{ l('CodeBlockContainer.Width_detail') }}
                                            </div>
                                        </div>
                                        <div class="tw-w-1/3">
                                            <Input v-model="width" maxlength="7" />
                                        </div>
                                    </div>
                                    <div
                                        class="tw-flex tw-items-center tw-space-x-4 tw-ml-3 tw-mt-4"
                                    >
                                        <div class="tw-w-2/3">
                                            <div class="tw-font-medium">
                                                {{ l('CodeBlockContainer.Height') }}
                                            </div>
                                            <div class="tw-text-sm tw-text-muted-foreground">
                                                {{ l('CodeBlockContainer.Height_detail') }}
                                            </div>
                                        </div>
                                        <div class="tw-w-1/3">
                                            <Input v-model="height" maxlength="7" />
                                        </div>
                                    </div>
                                    <div
                                        class="tw-flex tw-items-center tw-space-x-4 tw-ml-3 tw-mt-4"
                                    >
                                        <div class="tw-w-2/3">
                                            <div class="tw-font-medium">
                                                {{ l('CodeBlockContainer.Alignment') }}
                                            </div>
                                            <div class="tw-text-sm tw-text-muted-foreground">
                                                {{
                                                    l('CodeBlockContainer.Alignment_detail')
                                                }}
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

                        <!-- Add Above -->
                        <DropdownMenu v-model:open="addAboveOpen">
                            <DropdownMenuTrigger as-child>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    class="tw-h-6 tw-w-6 tw-text-foreground/60 hover:tw-text-foreground"
                                    :title="l('CodeBlockContainer.AddAbove')"
                                >
                                    <ArrowUpFromLine class="tw-h-3.5 tw-w-3.5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent side="bottom" align="start" :sideOffset="4">
                                <DropdownMenuItem
                                    v-for="t in types"
                                    :key="t.value"
                                    @click="emit('add-above', { type: t.value, id: block.id })"
                                >{{ t.label }}</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <!-- Add Below -->
                        <DropdownMenu v-model:open="addBelowOpen">
                            <DropdownMenuTrigger as-child>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    class="tw-h-6 tw-w-6 tw-text-foreground/60 hover:tw-text-foreground"
                                    :title="l('CodeBlockContainer.AddBelow')"
                                >
                                    <ArrowDownToLine class="tw-h-3.5 tw-w-3.5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent side="bottom" align="start" :sideOffset="4">
                                <DropdownMenuItem
                                    v-for="t in types"
                                    :key="t.value"
                                    @click="emit('add-below', { type: t.value, id: block.id })"
                                >{{ t.label }}</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <!-- Delete -->
                        <Button
                            variant="ghost"
                            size="icon"
                            class="tw-h-6 tw-w-6 tw-text-foreground/60 hover:tw-text-destructive"
                            @click="removeBlock"
                        >
                            <Trash2 class="tw-h-3.5 tw-w-3.5" />
                        </Button>

                        <!-- Expand/Shrink -->
                        <Button
                            variant="ghost"
                            size="icon"
                            class="tw-h-6 tw-w-6 tw-text-foreground/60 hover:tw-text-foreground"
                            @click="toggleExpanded"
                        >
                            <ChevronUp v-if="expanded" class="tw-h-3.5 tw-w-3.5" />
                            <ChevronDown v-else class="tw-h-3.5 tw-w-3.5" />
                        </Button>
                </div>
            </div>

            <!-- Content with colored left border -->
            <div :class="`editModeBorder ${colorClass}`">
                <Transition
                    enter-active-class="tw-transition-all tw-duration-300 tw-ease-out"
                    enter-from-class="tw-transform tw-scale-95 tw-opacity-0"
                    enter-to-class="tw-transform tw-scale-100 tw-opacity-100"
                    leave-active-class="tw-transition-all tw-duration-200 tw-ease-in"
                    leave-from-class="tw-transform tw-scale-100 tw-opacity-100"
                    leave-to-class="tw-transform tw-scale-95 tw-opacity-0"
                >
                    <Alert
                        v-if="isExperimentalScriptVersion"
                        variant="destructive"
                        class="tw-bg-orange-50 tw-border-orange-200 tw-py-2 tw-mb-2"
                    >
                        <div class="tw-flex tw-gap-2 tw-items-center">
                            <Flame class="tw-h-12 tw-w-12 tw-text-orange-500" />
                            <div class="tw-flex-1">
                                <AlertTitle
                                    class="tw-text-xs tw-font-medium tw-mb-0 tw-text-orange-600"
                                    >{{
                                        $t('CodePlayground.ExperimentalScriptVersion')
                                    }}</AlertTitle
                                >
                                <AlertDescription class="tw-text-xs tw-mt-1 tw-text-orange-500">
                                    {{ $t('CodePlayground.ExperimentalScriptVersionDesc') }}
                                </AlertDescription>
                            </div>
                        </div>
                    </Alert>
                </Transition>

                <Transition
                    enter-active-class="tw-transition-all tw-duration-300 tw-ease-out"
                    enter-from-class="tw-transform tw-scale-95 tw-opacity-0"
                    enter-to-class="tw-transform tw-scale-100 tw-opacity-100"
                    leave-active-class="tw-transition-all tw-duration-200 tw-ease-in"
                    leave-from-class="tw-transform tw-scale-100 tw-opacity-100"
                    leave-to-class="tw-transform tw-scale-95 tw-opacity-0"
                >
                    <Alert
                        v-if="isDeprecatedScriptVersion"
                        variant="destructive"
                        class="tw-bg-yellow-50 tw-border-yellow-300 tw-py-2 tw-mb-2"
                    >
                        <div class="tw-flex tw-gap-2 tw-items-center">
                            <AlertTriangle class="tw-h-12 tw-w-12 tw-text-yellow-500" />
                            <div class="tw-flex-1">
                                <AlertTitle
                                    class="tw-text-xs tw-font-medium tw-mb-0 tw-text-yellow-600"
                                    >{{
                                        $t('CodePlayground.DeprecatedScriptVersion')
                                    }}</AlertTitle
                                >
                                <AlertDescription class="tw-text-xs tw-mt-1 tw-text-yellow-500">
                                    {{ $t('CodePlayground.DeprecatedScriptVersionDesc') }}
                                </AlertDescription>
                            </div>
                        </div>
                    </Alert>
                </Transition>

                <!-- Collapsed summary: click to expand -->
                <div
                    v-if="!expanded"
                    class="tw-py-1.5 tw-px-3 tw-text-xs tw-text-muted-foreground tw-cursor-pointer"
                    @click="toggleExpanded"
                >
                    <span class="tw-font-semibold">{{ typeObj.label }}</span>
                    <span v-if="block.name" class="tw-ml-1">{{ block.name }}</span>
                </div>

                <!-- Block content -->
                <div v-if="expanded">
                    <slot></slot>
                </div>

                <textarea
                    :name="`block_options[${block.parentID}][${block.id}]`"
                    class="blockoptions"
                    v-model="serializedOptions"
                ></textarea>
            </div>
        </div>

        <div v-else class="tw-m-0 tw-p-0">
            <slot></slot>
        </div>

        <Dialog v-model:open="deleteDialogOpen">
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{{ l('CodeBlockContainer.Confirm') }}</DialogTitle>
                    <DialogDescription
                        v-html="l('CodeBlockContainer.DeleteQuestion')"
                    ></DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" @click="cancelDelete">Cancel</Button>
                    <Button variant="destructive" @click="confirmDelete">Delete</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
</template>

<script lang="ts" setup>
import { BasicBlockProps, DEFAULT_BASIC_BLOCK_PROPS } from '@/composables/basicBlock'
import { KnownBlockTypes } from '@/lib/ICodeBlocks'
import { IListItemData } from '@/lib/ICompilerRegistry'
import { globalState } from '@/lib/globalState'
import { l } from '@/plugins/i18n'
import { BlockStorageType, useBlockStorage } from '@/storage/blockStorage'
import { computed, getCurrentInstance, nextTick, ref, toRefs, watch } from 'vue'

import { Button } from '@/shadcn/ui/button'
import { Input } from '@/shadcn/ui/input'
import { Switch } from '@/shadcn/ui/switch'

import {
    AlertTriangle,
    ArrowDownToLine,
    ArrowUpFromLine,
    ChevronDown,
    ChevronUp,
    Flame,
    GripVertical,
    Info,
    Settings,
    Trash2,
} from 'lucide-vue-next'

import { Alert, AlertDescription, AlertTitle } from '../shadcn/ui/alert'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../shadcn/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../shadcn/ui/dropdown-menu'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../shadcn/ui/hover-card'
import CSelect from './ui/CSelect.vue'

interface IOnChangeOrder {
    id: number
    newID: number
}

interface IOnReloadResourcesInfo {
    shouldReloadResources: boolean
    id: number
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
    'remove-block',
    'add-above',
    'add-below',
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
let highlighted = ref<boolean>(false)
const deleteDialogOpen = ref(false)
const isDragOver = ref(false)
const addAboveOpen = ref(false)
const addBelowOpen = ref(false)
const settingsOpen = ref(false)
const toolbarIsOpen = computed(() => addAboveOpen.value || addBelowOpen.value || settingsOpen.value)

// Debounce isDragOver so child dragenter/dragleave cycles don't flicker the indicator.
let dragLeaveTimer: ReturnType<typeof setTimeout> | null = null

const removeBlock = (): void => {
    highlighted.value = true
    deleteDialogOpen.value = true
}

const cancelDelete = (): void => {
    deleteDialogOpen.value = false
    highlighted.value = false
}

const confirmDelete = (): void => {
    emit('remove-block', block.value.id)
    deleteDialogOpen.value = false
    highlighted.value = false
}

const onDragStart = (e: DragEvent): void => {
    e.dataTransfer!.setData('text/plain', String(block.value.id))
    e.dataTransfer!.effectAllowed = 'move'
}

const onDragOver = (e: DragEvent): void => {
    e.dataTransfer!.dropEffect = 'move'
    if (dragLeaveTimer !== null) {
        clearTimeout(dragLeaveTimer)
        dragLeaveTimer = null
    }
    isDragOver.value = true
}

const onDragLeave = (): void => {
    dragLeaveTimer = setTimeout(() => {
        isDragOver.value = false
        dragLeaveTimer = null
    }, 60)
}

const onDrop = (e: DragEvent): void => {
    if (dragLeaveTimer !== null) {
        clearTimeout(dragLeaveTimer)
        dragLeaveTimer = null
    }
    isDragOver.value = false
    const sourceId = Number(e.dataTransfer?.getData('text/plain'))
    if (!isNaN(sourceId) && sourceId !== block.value.id) {
        emit('change-order', { id: sourceId, newID: block.value.id } as IOnChangeOrder)
    }
}

// ── Color helpers ─────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
    return [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16),
    ]
}

const typeColor = computed((): string => {
    const t = type.value
    if (t === KnownBlockTypes.PLAYGROUND) return '#00aff5'
    if (t === KnownBlockTypes.LIBRARY) return '#ec4899'
    if (t === KnownBlockTypes.BLOCK) return '#22c55e'
    if (t === KnownBlockTypes.DATA) return '#f59e0b'
    if (t === KnownBlockTypes.TEXT) return '#64748b'
    if (t === KnownBlockTypes.BLOCKHIDDEN) return '#9ca3af'
    if (t === KnownBlockTypes.BLOCKSTATIC) return '#a855f7'
    return '#94a3b8'
})

// Expose the type color as a CSS custom property so all toolbar states (collapsed,
// expanded, glow) can reference it without recomputing in JS.
const toolbarBaseStyle = computed(() => {
    const [r, g, b] = hexToRgb(typeColor.value)
    return { '--type-rgb': `${r}, ${g}, ${b}` }
})

// Drop-target outline uses the TARGET block's type color.
const dropIndicatorStyle = computed(() => {
    const [r, g, b] = hexToRgb(typeColor.value)
    return {
        outline: `2px solid rgba(${r},${g},${b},0.8)`,
        outlineOffset: '2px',
        borderRadius: '2px',
    }
})

// ── Block data ────────────────────────────────────────────────────────────────

const types = computed((): IListItemData[] => [
    { label: l('CodeBlockContainer.Canvas'), value: KnownBlockTypes.PLAYGROUND },
    { label: l('CodeBlockContainer.Library'), value: KnownBlockTypes.LIBRARY },
    { label: l('CodeBlockContainer.DataBlock'), value: KnownBlockTypes.DATA },
    { label: l('CodeBlockContainer.Text'), value: KnownBlockTypes.TEXT },
    { label: l('CodeBlockContainer.Hidden'), value: KnownBlockTypes.BLOCKHIDDEN },
    { label: l('CodeBlockContainer.Static'), value: KnownBlockTypes.BLOCKSTATIC },
    { label: l('CodeBlockContainer.Block'), value: KnownBlockTypes.BLOCK },
])
const alignments = computed((): IListItemData[] => {
    if (l == undefined) return []
    return [
        { label: l('CodeBlockContainer.Start'), value: 'left' },
        { label: l('CodeBlockContainer.Center'), value: 'center' },
        { label: l('CodeBlockContainer.End'), value: 'right' },
    ]
})
const scriptVersions = computed((): IListItemData[] => {
    if (l == undefined) return []
    return [
        { label: l('CodeBlockContainer.ScriptVersion_1'), value: '100' },
        { label: l('CodeBlockContainer.ScriptVersion_2'), value: '101' },
        { label: l('CodeBlockContainer.ScriptVersion_3'), value: '102' },
    ]
})
const positions = computed((): IListItemData[] =>
    block.value.appSettings.blocks.map((bl) => ({
        label: `${bl.id + 1}`,
        value: `${bl.id}`,
    }))
)
const isDeprecatedScriptVersion = computed(() => scriptVersion.value === '100')
const isExperimentalScriptVersion = computed(() => scriptVersion.value === '102')
const order = computed({
    get(): IListItemData {
        return globalState.appState.itemForValue(positions.value, `${block.value.id}`)
    },
    set(val: IListItemData) {
        emit('change-order', { id: block.value.id, newID: +val.value } as IOnChangeOrder)
    },
})
const orderNumber = ref<number>(block.value.id + 1)
watch(() => block.value.id, (id) => { orderNumber.value = id + 1 })
const applyOrderNumber = (): void => {
    const target = Math.min(Math.max(1, orderNumber.value), positions.value.length) - 1
    orderNumber.value = target + 1
    if (target !== block.value.id) {
        emit('change-order', { id: block.value.id, newID: target } as IOnChangeOrder)
    }
}
const expanded = computed({
    get(): boolean { return block.value.expanded },
    set(v: boolean) { block.value.expanded = v },
})
const serializedOptions = computed({
    get(): string { return JSON.stringify(filteredCopy(block.value)) },
    set(_v: string) {},
})
const hasExtendedSettings = computed(() =>
    type.value === KnownBlockTypes.PLAYGROUND || type.value === KnownBlockTypes.BLOCK
)
const isVersionedPlayground = computed(() => type.value === KnownBlockTypes.PLAYGROUND)
const canSetLineNumbers = computed(() => type.value === KnownBlockTypes.BLOCK)
const canHaveAlternativeContent = computed(() => type.value === KnownBlockTypes.BLOCK)
const canDefinePlacement = computed(() => type.value === KnownBlockTypes.PLAYGROUND)
const shouldAutoReset = computed({
    get(): boolean { return block.value.shouldAutoreset },
    set(v: boolean) {
        emit('auto-reset-change', { shouldAutoreset: v, id: block.value.id })
    },
})
const shouldReloadResources = computed({
    get(): boolean { return block.value.shouldReloadResources },
    set(v: boolean) {
        emit('reload-resources-change', {
            shouldReloadResources: v,
            id: block.value.id,
        } as IOnReloadResourcesInfo)
    },
})
const shouldGenerateTemplate = computed({
    get(): boolean { return block.value.generateTemplate },
    set(v: boolean) {
        emit('generate-template-change', { generateTemplate: v, id: block.value.id })
    },
})
const scriptVersion = computed((): string => {
    if (!block.value?.version) return '100'
    return block.value.version
})
const scriptVersionObj = computed({
    get(): IListItemData {
        return globalState.appState.itemForValue(scriptVersions.value, scriptVersion.value)
    },
    set(v: IListItemData) {
        emit('script-version-change', { version: v.value, id: block.value.id })
    },
})
const canLoadResources = computed(() => +scriptVersion.value > 100)
const hasAltComntent = computed({
    get(): boolean { return block.value.hasAlternativeContent },
    set(v: boolean) {
        // if (v !== block.value.hasAlternativeContent && v) {
        //     nextTick(() => {
        //         setTimeout(() => {
        //             $('.CodeMirror').toArray().forEach((cm) => {
        //                 ;(cm as any).CodeMirror.refresh()
        //             })
        //         }, 200)
        //     })
        // }
        block.value.hasAlternativeContent = v
    },
})
const colorClass = computed((): string => {
    const t = type.value
    if (t === KnownBlockTypes.TEXT) return 'text-border'
    if (t === KnownBlockTypes.PLAYGROUND) return 'playground-border'
    if (t === KnownBlockTypes.LIBRARY) return 'library-border'
    if (t === KnownBlockTypes.DATA) return 'data-border'
    if (t === KnownBlockTypes.BLOCK) return 'block-border'
    if (t === KnownBlockTypes.BLOCKHIDDEN) return 'block-hidden-border'
    if (t === KnownBlockTypes.BLOCKSTATIC) return 'block-static-border'
    return 'default-border'
})
const type = computed((): KnownBlockTypes => {
    if (block.value.type === KnownBlockTypes.BLOCK) {
        if (block.value.hidden) return KnownBlockTypes.BLOCKHIDDEN
        if (block.value.static) return KnownBlockTypes.BLOCKSTATIC
    }
    return block.value.type
})
const typeObj = computed({
    get(): IListItemData {
        return globalState.appState.itemForValue(types.value, type.value)
    },
    set(val: IListItemData) {
        const v = val.value
        const ret = {
            type: v.match(/([^-]*)/)![0],
            hidden: v === KnownBlockTypes.BLOCKHIDDEN,
            static: v === KnownBlockTypes.BLOCKSTATIC,
            id: block.value.id,
            hasCode: false,
        }
        ret.hasCode = ret.type === KnownBlockTypes.BLOCK
        if (ret.type === KnownBlockTypes.PLAYGROUND && block.value.content === '' && editMode.value) {
            block.value.content =
                block.value.scriptVersion === '100'
                    ? '{\n    init: function(canvasElement) {\n\n    },\n    update: function(output, canvasElement) {\n\n    }\n}'
                    : 'module.exports = {\n    init: function(canvasElement, outputElement, scope, runner) {\n\n    },\n    addArgumentsTo(args) {},\n    reset(canvasElement) {},\n    update: function(txt, json, canvasElement, outputElement) {\n\n    }\n}'
        }
        emit('type-change', ret)
    },
})
const visibleLines = computed({
    get(): number | 'auto' {
        const v = block.value.visibleLines
        if (v === 'auto' || isNaN(v)) return 'auto'
        return v
    },
    set(v: number | 'auto') {
        if (v === 'auto' || isNaN(v as number)) v = 'auto'
        console.log('set', v)
        emit('visible-lines-change', { visibleLines: v, id: block.value.id })
    },
})
const width = computed({
    get(): string { return block.value.width },
    set(v: string) {
        emit('placement-change', { width: v, height: block.value.height, align: block.value.align, id: block.value.id })
    },
})
const height = computed({
    get(): string { return block.value.height },
    set(v: string) {
        emit('placement-change', { width: block.value.width, height: v, align: block.value.align, id: block.value.id })
    },
})
const align = computed({
    get(): IListItemData {
        return globalState.appState.itemForValue(alignments.value, block.value.align)
    },
    set(v: IListItemData) {
        emit('placement-change', { width: block.value.width, height: block.value.height, align: v.value, id: block.value.id })
    },
})
const validNumber = (v: 'auto' | number): boolean | string => {
    if (v !== 'auto' && isNaN(v as number)) return "Must be a valid Number or 'auto'."
    return true
}
const toggleExpanded = (): void => {
    globalState.appState.refreshAllCodeMirrors()
    expanded.value = !expanded.value
}
const filteredCopy = (objIn: object, extended = true, path = 'this'): object => {
    const obj: Record<string, unknown> = {}
    Object.keys(objIn)
        .filter(
            (k) =>
                !k.startsWith('appSettings') &&
                !k.startsWith('$') &&
                !k.startsWith('_') &&
                (!extended ||
                    !['obj', 'errors', 'content', 'firstLine', 'nextLine', 'lineCount',
                      'hasCode', 'isLast', 'readyCount', 'noContent'].includes(k)) &&
                !['uuid', 'scopeUUID', 'scopeSelector'].includes(k)
        )
        .forEach((k) => {
            let v = (objIn as Record<string, unknown>)[k]
            if (v !== undefined && v !== null && typeof v === 'object') {
                v = Array.isArray(v)
                    ? (v as unknown[]).map((item, nr) =>
                          filteredCopy(item as object, false, `${path}.${k}[${nr}]`)
                      )
                    : filteredCopy(v as object, false, `${path}.${k}`)
            }
            obj[k] = v
        })
    return obj
}
</script>

<style lang="sass">
.cbc-toolbar
    // Collapsed: opaque type-color bar; the white gradient overlay is always present
    // but only visible when the base color is opaque (it fades with the base on hover).
    background-color: rgba(var(--type-rgb), 1.0)
    background-image: linear-gradient(to right, rgba(0,0,0,0), rgba(255,255,255,0.14))
    border-radius: 0 6px 6px 0
    // Start with neutral backdrop-filter so the transition to blur is animated.
    backdrop-filter: blur(0px) brightness(1) saturate(1)
    -webkit-backdrop-filter: blur(0px) brightness(1) saturate(1)
    transition: background-color 0.25s ease-out, backdrop-filter 0.25s ease-out, -webkit-backdrop-filter 0.25s ease-out, box-shadow 0.2s ease-out

.cbc-toolbar:hover
    // Expanded: base fades to semi-transparent, blur takes over to make it readable.
    background-color: rgba(var(--type-rgb), 0.28)
    backdrop-filter: blur(8px) brightness(1.15) saturate(1.5)
    -webkit-backdrop-filter: blur(8px) brightness(1.15) saturate(1.5)
    box-shadow: 0 0 10px 3px rgba(var(--type-rgb), 0.45)

.cbc-extended
    max-width: 0
    overflow: hidden
    transition: max-width 0.15s ease-out

.cbc-toolbar:hover .cbc-extended,
.cbc-extended.is-open
    max-width: 200px

.editModeBorder
    border-left-width: 4px
    border-left-style: solid
    padding-left: 8px

.library-border
    border-color: #ec4899

.playground-border
    border-color: #00aff5

.text-border
    border-color: #64748b

.data-border
    border-color: #f59e0b

.block-border
    border-color: #22c55e

.block-hidden-border
    border-color: #9ca3af

.block-static-border
    border-color: #a855f7

.default-border
    border-color: var(--border)

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
