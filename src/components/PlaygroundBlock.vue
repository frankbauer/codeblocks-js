<template>
    <div>
        <div class="tw-flex tw-w-full tw-justify-end tw-mb-1">
            <TooltipProvider v-if="canUpgradeToV102">
                <Tooltip :delay-duration="300">
                    <TooltipTrigger as-child>
                        <Button
                            variant="outline"
                            size="xs"
                            class="tw-mr-2 tw-shadow-none"
                            @click="upgradeToV102"
                        >
                            <Wand2 class="tw-w-4 tw-h-4 tw-mr-1" />
                            {{ l('CodePlayground.UpgradeToV102') }}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent class="tw-max-w-xs">
                        <p>{{ l('CodePlayground.UpgradeToV102Tooltip') }}</p>
                        <p class="tw-mt-1 tw-font-semibold tw-text-yellow-400">
                            {{ l('CodePlayground.UpgradeToV102TooltipWarning') }}
                        </p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <div
                class="tw-inline-flex tw-w-fit -tw-space-x-px tw-rounded-md tw-shadow-xs rtl:tw-space-x-reverse"
                v-if="editMode"
            >
                <Button
                    :variant="isExpandedAuto ? 'default' : 'outline'"
                    class="tw-rounded-none tw-rounded-s-md tw-shadow-none focus-visible:tw-z-10"
                    size="xs"
                    @click="setExpandedAuto"
                >
                    <Expand class="tw-w-4 tw-h-4 tw-mr-1" />
                    Auto
                </Button>
                <Button
                    :variant="isExpandedLarge ? 'default' : 'outline'"
                    class="tw-rounded-none tw-shadow-none focus-visible:tw-z-10"
                    size="xs"
                    @click="setExpandedLarge"
                >
                    <Maximize class="tw-w-4 tw-h-4 tw-mr-1" />
                    Large
                </Button>
                <Button
                    :variant="isExpandedTiny ? 'default' : 'outline'"
                    class="tw-rounded-none tw-rounded-e-md tw-shadow-none focus-visible:tw-z-10"
                    size="xs"
                    @click="setExpandedTiny"
                >
                    <Shrink class="tw-w-4 tw-h-4 tw-mr-1" />
                    Small
                </Button>
            </div>
        </div>
        <Transition
            @before-enter="onBeforeEnter"
            @enter="onEnter"
            @after-enter="onAfterEnter"
            @before-leave="onBeforeLeave"
            @leave="onLeave"
            @after-leave="onAfterLeave"
        >
            <CodeBlock
                v-if="editMode"
                :appID="appID"
                :blockID="blockID"
                :block="block"
                :theme="options.theme"
                :mode="options.mode"
                :visibleLines="visibleLinesNow"
                :editMode="editMode"
                :tagSet="tagSet"
                :muteReadyState="true"
                @code-changed-in-edit-mode="onCodeChange"
            />
        </Transition>

        <!-- Error Dialog -->
        <AlertDialog :open="showErrorDialog" @update:open="showErrorDialog = $event">
            <AlertDialogContent class="tw-max-w-2xl">
                <AlertDialogHeader>
                    <AlertDialogTitle class="tw-flex tw-items-center tw-gap-2 tw-text-red-600">
                        <AlertTriangle class="tw-h-5 tw-w-5" />
                        {{ errorDialogTitle }}
                    </AlertDialogTitle>
                    <AlertDialogDescription class="tw-text-left">
                        <div class="tw-space-y-4">
                            <div
                                v-if="errorOutput"
                                class="tw-bg-gray-50 tw-p-3 tw-rounded-md tw-border"
                            >
                                <h4 class="tw-font-semibold tw-text-sm tw-text-gray-700 tw-mb-2">
                                    Output:
                                </h4>
                                <pre
                                    class="tw-text-xs tw-bg-amber-50 tw-p-2 tw-rounded tw-border tw-font-mono tw-overflow-x-auto"
                                    >{{ errorOutput }}</pre
                                >
                            </div>
                            <div
                                class="tw-bg-red-50 tw-p-3 tw-rounded-md tw-border tw-border-red-200"
                            >
                                <h4 class="tw-font-semibold tw-text-sm tw-text-red-700 tw-mb-2">
                                    Error Message:
                                </h4>
                                <p class="tw-text-sm tw-text-red-800 tw-font-medium">
                                    {{ errorDialogMessage }}
                                </p>
                            </div>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction @click="showErrorDialog = false"> Close </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <PlaygroundCanvas
            ref="playgroundCanvasComponent"
            :output="finalOutputObject.initialOutput"
            :obj="block.obj"
            :key="runCount"
            :block="block"
            :eventHub="eventHub"
            :tagSet="tagSet"
            :data-question="block.parentID"
            :runner="emitRun"
            @canvas-change="onCanvasChange"
            @did-init="onDidInit"
        />
    </div>
</template>

<script lang="ts" setup>
import PlaygroundCanvas from '@/components/PlaygroundCanvas.vue'
import { migrateV101ToV102 } from '@/lib/scriptBlocks/migrationV101ToV102'

import CodeBlock from '@/components/CodeBlock.vue'
import { IRandomizerSet, CodeExpansionType } from '@/lib/ICodeBlocks'
import { IScriptOutputObject } from '@/lib/IScriptBlock'
import {
    DEFAULT_EDITABLE_BLOCK_PROPS,
    EditableBlockProps,
    useBasicBlockMounting,
} from '@/composables/basicBlock'
import {
    computed,
    ComputedRef,
    getCurrentInstance,
    onBeforeMount,
    onBeforeUnmount,
    onMounted,
    nextTick,
    Ref,
    ref,
    Transition,
} from 'vue'
import { globalState } from '@/lib/globalState'
import { EventHubType } from '@/composables/globalEvents'
import { l } from '@/plugins/i18n'
import { BlockStorageType, useBlockStorage } from '@/storage/blockStorage'
import { Button } from '@/shadcn/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shadcn/ui/tooltip'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/shadcn/ui/alert-dialog'
import {
    ChevronUp,
    ChevronDown,
    Maximize,
    Expand,
    Shrink,
    AlertTriangle,
    Wand2,
} from 'lucide-vue-next'
import { useSlideTransition } from '@/composables/useSlideTransition'

export interface IPlaygroundBlockOptions {
    mode: string
    theme: string
    lineNumbers: boolean
    line: boolean
    tabSize: number
    indentUnit: number
    autoCloseBrackets: boolean
    readOnly: boolean
    firstLineNumber: number
    gutters: string[]
}

interface Props extends EditableBlockProps {
    finalOutputObject: IScriptOutputObject
    eventHub: EventHubType
    tagSet?: IRandomizerSet | undefined
}

const props = withDefaults(defineProps<Props>(), {
    ...DEFAULT_EDITABLE_BLOCK_PROPS,
    tagSet: undefined,
})

const emit = defineEmits(['changeOutput', 'run', 'ready'])

const instance = getCurrentInstance()
const globalCodeBlock = globalState.appState
const t = instance?.proxy?.$root?.$t

const { onBeforeEnter, onEnter, onAfterEnter, onBeforeLeave, onLeave, onAfterLeave } =
    useSlideTransition()

const blockStorage: BlockStorageType = useBlockStorage(props.appID)
const block = blockStorage.getBlock(props.blockID)
const { whenBlockIsReady, whenBlockIsDestroyed } = useBasicBlockMounting(
    true,
    props,
    blockStorage,
    (block) => emit('ready', block)
)

const lastRun: Ref<Date> = ref(new Date())
const runCount: Ref<number> = ref(0)
const lastAppliedBuildVersion: Ref<number> = ref(block.value.appSettings.buildVersion)
const playgroundCanvasComponent = ref<any>(null)
const canvasElementFromEvent = ref<HTMLElement | undefined>(undefined)

// Error dialog state
const showErrorDialog: Ref<boolean> = ref(false)
const errorDialogTitle: Ref<string> = ref('')
const errorDialogMessage: Ref<string> = ref('')
const errorOutput: Ref<string> = ref('')

const canvas = computed<HTMLElement | undefined>(() => {
    return canvasElementFromEvent.value || playgroundCanvasComponent.value?.canvas
})
const initAndRebuildErrors: Ref<any[]> = ref([])

const originalMode: ComputedRef<Boolean> = computed(() => {
    if (block.value.obj === null) {
        return false
    }
    return block.value.obj.requestsOriginalVersion()
})

const options: ComputedRef<IPlaygroundBlockOptions> = computed((): IPlaygroundBlockOptions => {
    return {
        // codemirror options
        mode: globalCodeBlock?.mimeType('javascript') ?? 'javascript',
        theme: props.theme,
        lineNumbers: true,
        line: true,
        tabSize: 4,
        indentUnit: 4,
        autoCloseBrackets: true,
        readOnly: !props.editMode,
        firstLineNumber: 1,
        gutters: ['diagnostics', 'CodeMirror-linenumbers'],
    }
})

const visibleLinesNow: ComputedRef<number | 'auto'> = computed(() => {
    if (block.value.codeExpanded == CodeExpansionType.TINY) {
        return 2.4
    } else if (block.value.codeExpanded == CodeExpansionType.LARGE) {
        return 33.4
    }
    return 'auto'
})

const isExpandedLarge: ComputedRef<Boolean> = computed(() => {
    return block.value.codeExpanded == CodeExpansionType.LARGE
})

const isExpandedTiny: ComputedRef<Boolean> = computed(() => {
    return block.value.codeExpanded == CodeExpansionType.TINY
})

const isExpandedAuto: ComputedRef<Boolean> = computed(() => {
    return block.value.codeExpanded == CodeExpansionType.AUTO
})

function setExpanded(val: CodeExpansionType): void {
    block.value.codeExpanded = val

    if (block.value.codeExpanded != CodeExpansionType.TINY) {
        globalCodeBlock?.refreshAllCodeMirrors()
    }
}

const canUpgradeToV102: ComputedRef<boolean> = computed(
    () => props.editMode && parseInt(block.value.version) === 101
)

function upgradeToV102(): void {
    if (!canUpgradeToV102.value) {
        return
    }
    block.value.content = migrateV101ToV102(block.value.content)
    block.value.version = '102'
    ;(block.value as any).recreateScriptObject?.()
    block.value.needsCodeRebuild = true
}

function setExpandedLarge(): void {
    setExpanded(CodeExpansionType.LARGE)
}

function setExpandedTiny(): void {
    setExpanded(CodeExpansionType.TINY)
}

function setExpandedAuto(): void {
    setExpanded(CodeExpansionType.AUTO)
}

function updateErrors(): boolean {
    block.value.errors = []
    if (block.value.obj === null) {
        return false
    }

    block.value.obj.err = block.value.obj.err.concat(initAndRebuildErrors.value)
    block.value.obj.err.forEach((e) => {
        let err = {
            start: { line: e.line, column: e.column },
            end: { line: e.line, column: e.column + 1 },
            message: e.msg,
            severity: globalState.SEVERITY_ERROR,
        }
        if (e.line === undefined) {
            err.start = { line: 1, column: -1 }
            err.end = { line: 1, column: -1 }
        } else if (e.column === undefined) {
            err.start = { line: e.line, column: -1 }
            err.end = { line: e.line, column: -1 }
        }
        block.value.errors.push(err)
    })

    if (block.value.obj.err.length > 0 && props.editMode) {
        block.value.needsCodeRebuild = true
        return true
    } else {
        return false
    }
}

function resetBeforeRun(): void {
    const rebuildCode = block.value.appSettings.buildVersion !== lastAppliedBuildVersion.value
    let reInitCode = rebuildCode
    let onNextTick = false
    if (block.value && block.value.obj) {
        if (block.value.shouldAutoreset || rebuildCode) {
            if (canvas.value !== undefined) {
                console.log('Will Re-Initialize', canvas.value, $(canvas.value))
            } else {
                console.log('Will Re-Initialize', 'Without Canvas')
            }
            lastRun.value = new Date()
            lastAppliedBuildVersion.value = block.value.appSettings.buildVersion
            canvasElementFromEvent.value = undefined // Clear stale element
            runCount.value++
            reInitCode = true
            onNextTick = true
        } else {
            nextTick(() => {
                //console.log("Will Reset", this.canvas, $(this.canvas).css('background-color'));
                if (block.value.obj !== null && canvas.value !== undefined) {
                    block.value.obj.reset($(canvas.value))
                }
                updateErrors()
            })
        }
    }

    if (reInitCode) {
        initAndRebuildErrors.value = []
        let doInit = () => {
            console.i('!!! DO INIT !!!')
            if (block.value.obj !== null) {
                if (canvas.value === undefined) {
                    console.i(
                        'Canvas not available for doInit, skipping (will be handled by mount)'
                    )
                    return true
                }
                console.i('DATA: CanvasElement', canvas.value)
                const jCanvas: any = $(canvas.value as HTMLElement)
                const scope: any = block.value.scope
                if (block.value.shouldReloadResources) {
                    block.value.obj.resetResources()
                }

                block.value.obj.resetBlockData(block.value.appSettings.blocks)
                block.value.obj.setupDOM(
                    jCanvas as JQuery<HTMLElement>,
                    scope as JQuery<HTMLElement>
                )
                block.value.obj.init(
                    jCanvas as JQuery<HTMLElement>,
                    scope as JQuery<HTMLElement>,
                    emitRun
                )
                if (updateErrors()) {
                    initAndRebuildErrors.value = block.value.obj.err
                    block.value.obj.invalidate()
                    return false
                }
                return true
            } else {
                return false
            }
        }
        if (onNextTick) {
            nextTick(doInit)
        } else {
            if (!doInit()) {
                return
            }
        }
    }
}

function onFinalOutputObject(val) {
    const initialOutput = val.output

    console.d('onFinalOutputObject', val, block.value.obj)
    if (block.value.obj !== null) {
        block.value.obj.err = []
        try {
            if (val.parseError != null) {
                if (
                    !block.value.obj.onParseError(initialOutput, val.parseError) &&
                    props.editMode
                ) {
                    let jStr = initialOutput
                    if (val.parseError.parsedString !== undefined) {
                        jStr = val.parseError.parsedString
                    }
                    jStr = jStr.replace(/</g, '&lt;')

                    if (l != undefined) {
                        // Show error dialog instead of alert
                        errorDialogTitle.value = l('CodePlayground.InvalidJson')
                        errorOutput.value = jStr
                        errorDialogMessage.value = val.parseError.toString()
                        showErrorDialog.value = true
                    }
                }
                if (updateErrors()) {
                    return
                }
            }

            nextTick(() => {
                console.d('Ticked', block.value.obj, canvas.value)
                if (block.value.obj !== null && canvas.value !== undefined) {
                    console.log('DATA: update - CanvasElement', canvas.value)
                    let result = block.value.obj.update(val, $(canvas.value))
                    if (updateErrors()) {
                        return
                    }

                    //construct a split output object
                    if (result === undefined && val.processedOutput.type != 'text') {
                        if (!originalMode.value) {
                            result = val.processedOutput.text
                        }
                    }

                    if (originalMode.value) {
                        if (typeof result !== 'string') {
                            result = ''
                        }
                    }

                    if (result !== undefined) {
                        emit('changeOutput', result)
                    }
                }
            })
        } catch (e) {
            console.error(e)
        }
        if (block.value.obj.err.length > 0) {
            if (props.editMode) {
                updateErrors()
            } else {
                console.error(block.value.obj.err)
            }
        }
    }
}

function emitRun() {
    emit('run', block.value)
}

function onCanvasChange(can) {
    if (!can) {
        return
    }
    console.log('DATA: old Canvas', canvas.value)
    canvasElementFromEvent.value = can.value !== undefined ? can.value : can
    if (props.editMode) {
        updateErrors()
    }
    console.log('DATA: Changed Canvas', can, canvas.value)
}

function onCodeChange(): void {
    if (props.editMode) {
        block.value.needsCodeRebuild = true
    }
}

function onDidInit(): void {
    updateErrors()
}

onBeforeMount(() => {
    props.eventHub.on('before-run', resetBeforeRun)
    props.eventHub.on('render-diagnostics', updateErrors)
})

onMounted(() => {
    const hasErrors = block.value && block.value.obj && block.value.obj.err.length > 0
    if (hasErrors) {
        updateErrors()
    }
    props.eventHub.on('output-updated', onFinalOutputObject)
})

onBeforeUnmount(() => {
    props.eventHub.off('before-run', resetBeforeRun)
    props.eventHub.off('render-diagnostics', updateErrors)
    props.eventHub.off('output-updated', onFinalOutputObject)
})
</script>

<style lang="sass" scoped>
.playgroundedit
    border-radius: 5px

.hiddenBlock
    display: none !important

.hiddenBlock
    opacity: 0
    visibility: hidden
</style>
<style lang="stylus">
.jsonErrObj, .jsonErr
    margin-left: 16px
    font-weight: bold

.jsonErrObj
    padding-left: 4px
    padding-right: 4px
    font-family: monospace
    margin-bottom: 20px
    background-color: #fff3c4

.jsonErr
    font-weight: bold
    color: #bf360c

.jsonErrTitle
    padding-left: 8px
    text-transform: uppercase
</style>
