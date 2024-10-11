<template>
    <div>
        <PlaygroundCanvas
            ref="canvas"
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
        <div class="row justify-end">
            <q-btn-group rounded class="q-mb-sm" v-if="editMode">
                <q-btn
                    :color="isExpandedAuto ? 'primary' : 'blue-grey-4'"
                    small
                    size="sm"
                    label="Auto"
                    icon="video_label"
                    @click="setExpandedAuto"
                />
                <q-btn
                    :color="isExpandedLarge ? 'primary' : 'blue-grey-4'"
                    small
                    size="sm"
                    label="Large"
                    icon="call_to_action"
                    @click="setExpandedLarge"
                />
                <q-btn
                    :color="isExpandedTiny ? 'primary' : 'blue-grey-4'"
                    small
                    size="sm"
                    label="Small"
                    icon="visibility_off"
                    @click="setExpandedTiny"
                />
            </q-btn-group>
        </div>
        <q-slide-transition>
            <CodeBlock
                v-if="editMode"
                :appID="appID"
                :blockID="blockID"
                :block="block"
                :theme="options.theme"
                :mode="options.mode"
                :visibleLines="visibleLinesNow"
                :editMode="editMode"
                :muteReadyState="true"
                @code-changed-in-edit-mode="onCodeChange"
            />
        </q-slide-transition>
    </div>
</template>

<script lang="ts" setup>
import PlaygroundCanvas from '@/components/PlaygroundCanvas.vue'

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
} from 'vue'
import { globalState } from '@/lib/globalState'
import { EventHubType } from '@/composables/globalEvents'
import { l } from '@/plugins/i18n'
import { BlockStorageType, useBlockStorage } from '@/storage/blockStorage'
import { useQuasar } from 'quasar'

export interface ICodePlaygroundOptions {
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
const q = useQuasar()
const t = instance?.proxy?.$root?.$t

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
const canvas: Ref<HTMLElement | undefined> = ref(undefined)
let needsCodeRebuild: boolean = false
const initAndRebuildErrors: Ref<any[]> = ref([])

const originalMode: ComputedRef<Boolean> = computed(() => {
    if (block.value.obj === null) {
        return false
    }
    return block.value.obj.requestsOriginalVersion()
})

const options: ComputedRef<ICodePlaygroundOptions> = computed((): ICodePlaygroundOptions => {
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
        needsCodeRebuild = true
        return true
    } else {
        return false
    }
}

function resetBeforeRun(): void {
    const rebuildCode = props.editMode && (needsCodeRebuild || props.tagSet !== undefined)
    let reInitCode = rebuildCode
    let onNextTick = false
    if (block.value && block.value.obj) {
        if (block.value.shouldAutoreset || rebuildCode) {
            if (canvas.value !== undefined) {
                console.log('Will Re-Initialize', canvas.value, $(canvas))
            } else {
                console.log('Will Re-Initialize', 'Without Canvas')
            }
            lastRun.value = new Date()
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

    if (rebuildCode) {
        initAndRebuildErrors.value = []

        if (block.value.obj != null) {
            block.value.obj.rebuild(block.value.actualContent())
            if (updateErrors()) {
                initAndRebuildErrors.value = block.value.obj.err
                block.value.obj.invalidate()
                return
            }
        }

        reInitCode = true
    }

    if (reInitCode) {
        initAndRebuildErrors.value = []
        let doInit = () => {
            console.i('!!! DO INIT !!!')
            if (block.value.obj !== null) {
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

                    if (q !== undefined && t != undefined) {
                        q.dialog({
                            title: l('CodePlayground.InvalidJson'),
                            message:
                                '<span class="text-caption jsonErrTitle">' +
                                t('CodePlayground.Output') +
                                '</span><div class="jsonErrObj">' +
                                jStr +
                                '</div>\n<span class="text-caption jsonErrTitle">' +
                                t('CodePlayground.Message') +
                                '</span><div class="jsonErr">' +
                                val.parseError +
                                '</div>',
                            html: true,
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
                }
                if (updateErrors()) {
                    return
                }
            }

            nextTick(() => {
                console.d('Ticked', block.value.obj, canvas.value)
                if (block.value.obj !== null && canvas.value !== undefined) {
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
    canvas.value = can
    if (props.editMode) {
        updateErrors()
    }
    //console.log("Changed Canvas", can, $(can).css('background-color'));
}

function onCodeChange(newCode: string): void {
    if (props.editMode) {
        needsCodeRebuild = true
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
//@import '../styles/quasar.variables.styl'
.jsonErrObj, .jsonErr
    margin-left: 16px
    font-weight: bold

.jsonErrObj
    padding-left: 4px
    padding-right: 4px
    font-family: monospace
    margin-bottom: 20px
    background-color: $amber-2

.jsonErr
    font-weight: bold
    color: $deep-orange-14

.jsonErrTitle
    padding-left: 8px
    text-transform: uppercase
</style>
