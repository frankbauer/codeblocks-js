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
                :block="block"
                :theme="options.theme"
                :mode="options.mode"
                :visibleLines="visibleLinesNow"
                :editMode="this.editMode"
                :muteReadyState="true"
                @code-changed-in-edit-mode="onCodeChange"
            />
        </q-slide-transition>
    </div>
</template>

<script lang="ts">
//helper to reset the canvas area if needed
import Vue from 'vue'
import PlaygroundCanvas from '@/components/PlaygroundCanvas.vue'
//const PlaygroundCanvasCtor = Vue.extend(PlaygroundCanvas)

import CodeBlock from '@/components/CodeBlock.vue'
import { BlockData } from '@/lib/codeBlocksManager'
import { IRandomizerSet, CodeExpansionType } from '@/lib/ICodeBlocks'
import { IScriptOutputObject } from '@/lib/IScriptBlock'
import { useBasicBlockMounting, useEditableBlockProps } from '@/composables/basicBlock'
import {
    computed,
    ComputedRef,
    defineComponent,
    getCurrentInstance,
    onBeforeMount,
    onBeforeUnmount,
    onMounted,
    PropType,
    nextTick,
    Ref,
    ref,
} from 'vue'
import { globalState } from '@/lib/globalState'
import { EventHubType } from '@/composables/globalEvents'
import { l } from '@/plugins/i18n'

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

const { editableBlockProps } = useEditableBlockProps()
export default defineComponent({
    name: 'CodePlayground',
    components: { PlaygroundCanvas, CodeBlock },
    props: {
        muteReadyState: {
            type: Boolean,
            default: false,
        },
        block: {
            type: Object as PropType<BlockData>,
            required: true,
        },
        editMode: {
            type: Boolean,
            default: false,
        },
        visibleLines: {
            type: [Number, String] as PropType<number | 'auto'>,
            default: 'auto',
        },
        theme: {
            type: String,
            default: 'base16-dark',
        },
        finalOutputObject: {
            type: Object as PropType<IScriptOutputObject>,
            required: true,
        },
        eventHub: {
            type: Object as PropType<EventHubType>,
            required: true,
        },
        tagSet: {
            type: Object as PropType<IRandomizerSet>,
            required: false,
        },
    },
    emits: ['changeOutput', 'run', 'ready'],
    setup(props, context) {
        const instance = getCurrentInstance()
        const globalCodeBlock = globalState.appState
        const q = instance?.proxy?.$root?.$q
        const t = instance?.proxy?.$root?.$t

        const lastRun: Ref<Date> = ref(new Date())
        const runCount: Ref<number> = ref(0)
        const canvas: Ref<HTMLElement | undefined> = ref(undefined)
        let needsCodeRebuild: boolean = false
        const initAndRebuildErrors: Ref<any[]> = ref([])

        const originalMode: ComputedRef<Boolean> = computed(() => {
            if (props.block.obj === null) {
                return false
            }
            return props.block.obj.requestsOriginalVersion()
        })

        const options: ComputedRef<ICodePlaygroundOptions> = computed(
            (): ICodePlaygroundOptions => {
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
            }
        )

        const visibleLinesNow: ComputedRef<number | 'auto'> = computed(() => {
            if (props.block.codeExpanded == CodeExpansionType.TINY) {
                return 2.4
            } else if (props.block.codeExpanded == CodeExpansionType.LARGE) {
                return 33.4
            }
            return 'auto'
        })

        const isExpandedLarge: ComputedRef<Boolean> = computed(() => {
            return props.block.codeExpanded == CodeExpansionType.LARGE
        })

        const isExpandedTiny: ComputedRef<Boolean> = computed(() => {
            return props.block.codeExpanded == CodeExpansionType.TINY
        })

        const isExpandedAuto: ComputedRef<Boolean> = computed(() => {
            return props.block.codeExpanded == CodeExpansionType.AUTO
        })

        function setExpanded(val: CodeExpansionType): void {
            props.block.codeExpanded = val

            if (props.block.codeExpanded != CodeExpansionType.TINY) {
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
            props.block.errors = []
            if (props.block.obj === null) {
                return false
            }

            props.block.obj.err = props.block.obj.err.concat(initAndRebuildErrors.value)
            props.block.obj.err.forEach((e) => {
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
                props.block.errors.push(err)
            })

            if (props.block.obj.err.length > 0 && props.editMode) {
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
            if (props.block && props.block.obj) {
                if (props.block.shouldAutoreset || rebuildCode) {
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
                        if (props.block.obj !== null && canvas.value !== undefined) {
                            props.block.obj.reset($(canvas.value))
                        }
                        updateErrors()
                    })
                }
            }

            if (rebuildCode) {
                initAndRebuildErrors.value = []

                if (props.block.obj != null) {
                    props.block.obj.rebuild(props.block.actualContent())
                    if (updateErrors()) {
                        initAndRebuildErrors.value = props.block.obj.err
                        props.block.obj.invalidate()
                        return
                    }
                }

                reInitCode = true
            }

            if (reInitCode) {
                initAndRebuildErrors.value = []
                let doInit = () => {
                    console.i('!!! DO INIT !!!')
                    if (props.block.obj !== null) {
                        const jCanvas: any = $(canvas.value as HTMLElement)
                        const scope: any = props.block.scope
                        if (props.block.shouldReloadResources) {
                            props.block.obj.resetResources()
                        }

                        props.block.obj.resetBlockData(props.block.appSettings.blocks)
                        props.block.obj.setupDOM(
                            jCanvas as JQuery<HTMLElement>,
                            scope as JQuery<HTMLElement>
                        )
                        props.block.obj.init(
                            jCanvas as JQuery<HTMLElement>,
                            scope as JQuery<HTMLElement>,
                            emitRun
                        )
                        if (updateErrors()) {
                            initAndRebuildErrors.value = props.block.obj.err
                            props.block.obj.invalidate()
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

            console.d('onFinalOutputObject', val, props.block.obj)
            if (props.block.obj !== null) {
                props.block.obj.err = []
                try {
                    if (val.parseError != null) {
                        if (
                            !props.block.obj.onParseError(initialOutput, val.parseError) &&
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
                        console.d('Ticked', props.block.obj, canvas.value)
                        if (props.block.obj !== null && canvas.value !== undefined) {
                            let result = props.block.obj.update(val, $(canvas.value))
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
                                context.emit('changeOutput', result)
                            }
                        }
                    })
                } catch (e) {
                    console.error(e)
                }
                if (props.block.obj.err.length > 0) {
                    if (props.editMode) {
                        updateErrors()
                    } else {
                        console.error(props.block.obj.err)
                    }
                }
            }
        }

        function emitRun() {
            context.emit('run', props.block)
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

        const { whenBlockIsReady, whenBlockIsDestroyed } = useBasicBlockMounting(
            true,
            props,
            context
        )

        onBeforeMount(() => {
            props.eventHub.on('before-run', resetBeforeRun)
            props.eventHub.on('render-diagnostics', updateErrors)
        })

        onMounted(() => {
            const hasErrors = props.block && props.block.obj && props.block.obj.err.length > 0
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

        return {
            originalMode,
            options,
            visibleLinesNow,
            isExpandedLarge,
            setExpandedLarge,
            isExpandedTiny,
            setExpandedTiny,
            isExpandedAuto,
            setExpandedAuto,
            runCount,
            emitRun,
            onCanvasChange,
            onDidInit,
            onCodeChange,
            whenBlockIsReady,
            whenBlockIsDestroyed,
            onFinalOutputObject,
            resetBeforeRun,
        }
    },
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
@import '../styles/quasar.variables.styl'
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
