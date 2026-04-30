<template>
    <Dialog :open="open" @update:open="$emit('update:open', $event)">
        <DialogScrollContent class="tw-max-w-2xl tw-w-[95vw] tw-bg-white">
            <DialogHeader>
                <DialogTitle>{{ $t('ImportExport.Title') }}</DialogTitle>
                <DialogDescription>{{ $t('ImportExport.Description') }}</DialogDescription>
            </DialogHeader>

            <Tabs v-model="activeTab" class="tw-w-full">
                <TabsList class="tw-grid tw-w-full tw-grid-cols-2">
                    <TabsTrigger value="export">{{ $t('ImportExport.Export') }}</TabsTrigger>
                    <TabsTrigger value="import">{{ $t('ImportExport.Import') }}</TabsTrigger>
                </TabsList>

                <!-- Export Tab -->
                <TabsContent value="export" class="tw-mt-4 tw-space-y-4">
                    <div class="tw-max-h-[50vh] tw-overflow-y-auto tw-pr-2 modern-scrollbar">
                        <div class="tw-flex tw-items-center tw-justify-between tw-mb-4">
                            <h3 class="tw-text-sm tw-font-medium">
                                {{ $t('ImportExport.SelectBlocks') }}
                            </h3>
                            <div class="tw-flex tw-items-center tw-gap-2">
                                <Button variant="ghost" size="sm" @click="selectAll(true)">{{
                                    $t('ImportExport.SelectAll')
                                }}</Button>
                                <Button variant="ghost" size="sm" @click="selectAll(false)">{{
                                    $t('ImportExport.DeselectAll')
                                }}</Button>
                            </div>
                        </div>

                        <div class="tw-space-y-2">
                            <div
                                v-for="block in blocks"
                                :key="block.uuid"
                                class="tw-flex tw-items-center tw-gap-3 tw-p-2 tw-rounded-md hover:tw-bg-accent/50"
                            >
                                <Checkbox
                                    :id="'export-' + block.uuid"
                                    :model-value="selectedBlockUuids.includes(block.uuid)"
                                    @update:model-value="toggleBlock(block.uuid, $event)"
                                />
                                <Label
                                    :for="'export-' + block.uuid"
                                    class="tw-flex-1 tw-cursor-pointer"
                                >
                                    <div
                                        class="tw-font-medium tw-text-sm"
                                        v-html="block.descriptiveName"
                                    ></div>
                                    <div class="tw-text-xs tw-text-muted-foreground">
                                        {{ block.type }}
                                    </div>
                                </Label>
                            </div>
                        </div>

                        <div
                            v-if="mainBlock.randomizer.active"
                            class="tw-mt-6 tw-pt-6 tw-border-t tw-space-y-4"
                        >
                            <h3 class="tw-text-sm tw-font-medium">
                                {{ $t('ImportExport.RandomizerOptions') }}
                            </h3>
                            <RadioGroup v-model="randomizerExportMode" class="tw-space-y-2">
                                <div class="tw-flex tw-items-center tw-space-x-2">
                                    <RadioGroupItem
                                        :value="ExportRandomizerMode.ORIGINAL"
                                        id="export-mode-original"
                                    />
                                    <Label for="export-mode-original" class="tw-text-sm">{{
                                        $t('ImportExport.ExportOriginal')
                                    }}</Label>
                                </div>
                                <div class="tw-flex tw-items-center tw-space-x-2">
                                    <RadioGroupItem
                                        :value="ExportRandomizerMode.CURRENT"
                                        id="export-mode-current"
                                    />
                                    <Label for="export-mode-current" class="tw-text-sm">{{
                                        $t('ImportExport.ExportCurrent')
                                    }}</Label>
                                </div>
                                <div class="tw-flex tw-items-center tw-space-x-2">
                                    <RadioGroupItem
                                        :value="ExportRandomizerMode.ALL"
                                        id="export-mode-all"
                                    />
                                    <Label for="export-mode-all" class="tw-text-sm">{{
                                        $t('ImportExport.ExportAll')
                                    }}</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>

                    <div class="tw-flex tw-justify-end tw-gap-3 tw-pt-4 tw-border-t">
                        <Button variant="outline" @click="$emit('update:open', false)">{{
                            $t('ImportExport.Cancel')
                        }}</Button>
                        <Button :disabled="selectedBlockUuids.length === 0" @click="handleExport">
                            <Download class="tw-mr-2 tw-h-4 tw-w-4" />
                            {{ $t('ImportExport.RunExport') }} ({{ selectedBlockUuids.length }})
                        </Button>
                    </div>
                </TabsContent>

                <!-- Import Tab -->
                <TabsContent value="import" class="tw-mt-4 tw-space-y-4">
                    <div
                        v-if="!importData"
                        class="tw-min-h-[300px] tw-flex tw-flex-col tw-items-center tw-justify-center tw-border-2 tw-border-dashed tw-rounded-md tw-p-8 tw-transition-colors hover:tw-bg-accent/30"
                        @dragover.prevent
                        @drop.prevent="handleDrop"
                    >
                        <Upload class="tw-h-12 tw-w-12 tw-text-muted-foreground tw-mb-4" />
                        <p class="tw-text-sm tw-text-muted-foreground tw-text-center tw-mb-4">
                            {{ $t('ImportExport.DropZip') }}
                        </p>
                        <input
                            type="file"
                            ref="fileInput"
                            class="tw-hidden"
                            accept=".zip,.codeblocks.zip"
                            @change="handleFileSelect"
                        />
                        <Button variant="secondary" @click="$refs.fileInput.click()">{{
                            $t('ImportExport.ChooseFile')
                        }}</Button>
                    </div>

                    <div v-else class="tw-space-y-4">
                        <div class="tw-max-h-[50vh] tw-overflow-y-auto tw-pr-2 modern-scrollbar">
                            <div class="tw-flex tw-items-center tw-justify-between tw-mb-4">
                                <h3 class="tw-text-sm tw-font-medium">
                                    {{ $t('ImportExport.SelectBlocksImport') }}
                                </h3>
                                <div class="tw-flex tw-items-center tw-gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        @click="selectAllImport(true)"
                                        >{{ $t('ImportExport.SelectAll') }}</Button
                                    >
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        @click="selectAllImport(false)"
                                        >{{ $t('ImportExport.DeselectAll') }}</Button
                                    >
                                </div>
                            </div>

                            <div class="tw-space-y-2">
                                <div
                                    v-for="(block, index) in importData.blocks"
                                    :key="index"
                                    class="tw-flex tw-items-center tw-gap-3 tw-p-2 tw-rounded-md hover:tw-bg-accent/50"
                                >
                                    <Checkbox
                                        :id="'import-' + index"
                                        :model-value="selectedImportIndexes.includes(index)"
                                        @update:model-value="toggleImportBlock(index, $event)"
                                    />
                                    <Label
                                        :for="'import-' + index"
                                        class="tw-flex-1 tw-cursor-pointer"
                                    >
                                        <div class="tw-font-medium tw-text-sm">
                                            {{ block.name || block.type }}
                                        </div>
                                        <div class="tw-text-xs tw-text-muted-foreground">
                                            {{ block.type }}
                                        </div>
                                    </Label>
                                </div>
                            </div>

                            <div class="tw-mt-6 tw-pt-6 tw-border-t">
                                <h3 class="tw-text-sm tw-font-medium tw-mb-4">
                                    {{ $t('ImportExport.Settings') }}
                                </h3>
                                <div class="tw-flex tw-items-center tw-gap-3 tw-mb-4">
                                    <Checkbox
                                        id="import-settings"
                                        v-model:model-value="importSettings"
                                    />
                                    <Label for="import-settings" class="tw-text-sm">{{
                                        $t('ImportExport.IncludeSettings')
                                    }}</Label>
                                </div>

                                <div class="tw-space-y-2">
                                    <Label class="tw-text-xs tw-text-muted-foreground">{{
                                        $t('ImportExport.ImportMode')
                                    }}</Label>
                                    <RadioGroup v-model="importMode" class="tw-flex tw-gap-4">
                                        <div class="tw-flex tw-items-center tw-space-x-2">
                                            <RadioGroupItem value="append" id="mode-append" />
                                            <Label for="mode-append" class="tw-text-sm">{{
                                                $t('ImportExport.Append')
                                            }}</Label>
                                        </div>
                                        <div class="tw-flex tw-items-center tw-space-x-2">
                                            <RadioGroupItem value="prepend" id="mode-prepend" />
                                            <Label for="mode-prepend" class="tw-text-sm">{{
                                                $t('ImportExport.Prepend')
                                            }}</Label>
                                        </div>
                                        <div class="tw-flex tw-items-center tw-space-x-2">
                                            <RadioGroupItem value="override" id="mode-override" />
                                            <Label for="mode-override" class="tw-text-sm">{{
                                                $t('ImportExport.Override')
                                            }}</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            </div>
                        </div>

                        <div class="tw-flex tw-justify-between tw-pt-4 tw-border-t">
                            <Button variant="ghost" @click="importData = null">{{
                                $t('ImportExport.Back')
                            }}</Button>
                            <div class="tw-flex tw-gap-3">
                                <Button variant="outline" @click="$emit('update:open', false)">{{
                                    $t('ImportExport.Cancel')
                                }}</Button>
                                <Button
                                    :disabled="
                                        selectedImportIndexes.length === 0 && !importSettings
                                    "
                                    @click="handleImport"
                                >
                                    {{ $t('ImportExport.RunImport') }}
                                </Button>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </DialogScrollContent>
    </Dialog>
</template>

<script setup lang="ts">
import {
    applyImportToMainBlock,
    exportToZip,
    getImportData,
    ExportRandomizerMode,
} from '@/lib/importExportUtils'
import MainBlock from '@/lib/MainBlock'
import { Button } from '@/shadcn/ui/button'
import { Checkbox } from '@/shadcn/ui/checkbox'
import {
    Dialog,
    DialogDescription,
    DialogHeader,
    DialogScrollContent,
    DialogTitle,
} from '@/shadcn/ui/dialog'
import { Label } from '@/shadcn/ui/label'
import { RadioGroup, RadioGroupItem } from '@/shadcn/ui/radio-group'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shadcn/ui/tabs'
import { Download, Upload } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
    open: boolean
    mainBlock: MainBlock
}>()

const emit = defineEmits(['update:open', 'imported'])

const activeTab = ref('export')
const blocks = computed(() => props.mainBlock?.blocks || [])
const selectedBlockUuids = ref<string[]>([])

const randomizerExportMode = ref<ExportRandomizerMode>(ExportRandomizerMode.ORIGINAL)

const importData = ref<any>(null)
const selectedImportIndexes = ref<number[]>([])
const importSettings = ref(true)
const importMode = ref<'append' | 'prepend' | 'override'>('append')

// Initialize selections when dialog opens or blocks change
watch(
    [() => props.open, blocks],
    ([open, newBlocks]) => {
        if (open && newBlocks.length > 0 && selectedBlockUuids.value.length === 0) {
            selectedBlockUuids.value = newBlocks.map((b) => b.uuid)
        }
    },
    { immediate: true }
)

function selectAll(val: boolean) {
    if (val) {
        selectedBlockUuids.value = blocks.value.map((b) => b.uuid)
    } else {
        selectedBlockUuids.value = []
    }
}

function toggleBlock(uuid: string, checked: boolean | 'indeterminate') {
    const index = selectedBlockUuids.value.indexOf(uuid)
    if (checked === true) {
        if (index === -1) {
            selectedBlockUuids.value.push(uuid)
        }
    } else if (checked === false) {
        if (index !== -1) {
            selectedBlockUuids.value.splice(index, 1)
        }
    }
}

function downloadBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

async function handleExport() {
    if (randomizerExportMode.value === ExportRandomizerMode.ALL) {
        for (let i = 0; i < props.mainBlock.randomizer.sets.length; i++) {
            const blob = await exportToZip(
                props.mainBlock,
                selectedBlockUuids.value,
                { randomizerMode: ExportRandomizerMode.ALL },
                i
            )
            downloadBlob(
                blob,
                `codeblocks_set_${i}_${new Date().toISOString().split('T')[0]}.codeblocks.zip`
            )
        }
    } else {
        const blob = await exportToZip(props.mainBlock, selectedBlockUuids.value, {
            randomizerMode: randomizerExportMode.value,
        })
        downloadBlob(blob, `codeblocks_${new Date().toISOString().split('T')[0]}.codeblocks.zip`)
    }
    emit('update:open', false)
}

function selectAllImport(val: boolean) {
    if (val && importData.value) {
        selectedImportIndexes.value = importData.value.blocks.map((_: any, i: number) => i)
    } else {
        selectedImportIndexes.value = []
    }
}

function toggleImportBlock(index: number, checked: boolean | 'indeterminate') {
    const idx = selectedImportIndexes.value.indexOf(index)
    if (checked === true) {
        if (idx === -1) {
            selectedImportIndexes.value.push(index)
        }
    } else if (checked === false) {
        if (idx !== -1) {
            selectedImportIndexes.value.splice(idx, 1)
        }
    }
}

async function handleFileSelect(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
        await processFile(file)
    }
}

async function handleDrop(e: DragEvent) {
    const file = e.dataTransfer?.files[0]
    if (file) {
        await processFile(file)
    }
}

async function processFile(file: File) {
    try {
        importData.value = await getImportData(file)
        selectedImportIndexes.value = importData.value.blocks.map((_: any, i: number) => i)
    } catch (err) {
        console.error('Import failed', err)
        alert('Failed to read codeblocks zip file.')
    }
}

function handleImport() {
    if (!importData.value) {
        return
    }

    // Filter blocks to import based on selection
    const filteredImportData = {
        ...importData.value,
        blocks: importData.value.blocks.filter((_: any, idx: number) =>
            selectedImportIndexes.value.includes(idx)
        ),
    }

    applyImportToMainBlock(
        filteredImportData,
        props.mainBlock,
        importMode.value,
        importSettings.value
    )

    emit('imported')
    emit('update:open', false)
}
</script>
