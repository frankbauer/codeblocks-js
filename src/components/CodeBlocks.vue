<template>
    <div
        :class="`codeblocks ${addonClass}  ${backgroundColorClass} q-mx-sm q-mb-md`"
        :data-question="blockInfo.id"
        :uuid="blockInfo.uuid"
    >
        <CodeBlocksSettings
            v-if="editMode"
            :options="options"
            @compiler-change="onCompilerChange"
            @compiler-version-change="onCompilerVersionChange"
            @run-state-change="onRunStateChange"
            @continuous-compile-change="onContinousCompileStateChange"
            @message-passing-change="onMessagePassingChange"
            @keep-alive-change="onKeepAliveChange"
            @persistent-arguments-change="onPersistentArgumentsChange"
            @language-change="onLanguageChange"
            @character-limit-change="onCharacterLimitChange"
            @timeout-change="onTimeoutChange"
            @worker-libs-change="onWorkerLibChange"
            @dom-libs-change="onDomLibChange"
            @theme-change="onThemeChange"
            @output-parser-change="onOutputParserChange"
        />
        <CodeBlockContainer
            :block="block"
            :editMode="editMode"
            v-for="block in blocks"
            :key="block.id"
            @type-change="onTypeChange"
            @visible-lines-change="onVisibleLinesChange"
            @placement-change="onPlacementChange"
            @script-version-change="onScriptVersionChange"
            @move-up="moveUp"
            @move-down="moveDown"
            @remove-block="removeBlock"
            @auto-reset-change="onSetAutoReset"
            @reload-resources-change="onReloadResources"
            @generate-template-change="onSetGenerateTemplate"
            @change-order="onChangeOrder"
        >
            <CodeBlock
                v-if="block.hasCode"
                :block="block"
                :theme="themeForBlock(block)"
                :mode="mimeType"
                :visibleLines="block.visibleLines"
                :editMode="editMode"
                :readonly="readonly"
                :tagSet="activeTagSet"
                :emitWhenTypingInViewMode="continuousCompile"
                @ready="blockBecameReady"
                @build="run"
                @code-changed-in-view-mode="onViewCodeChange"
            />

            <CodePlayground
                v-else-if="block.type == 'PLAYGROUND'"
                :block="block"
                :editMode="editMode"
                :finalOutputObject="finalOutputObject"
                :theme="themeForBlock(block)"
                :tagSet="activeTagSet"
                @changeOutput="onPlaygroundChangedOutput"
                @ready="blockBecameReady"
                @run="onRunFromPlayground"
                :eventHub="eventHub"
            />

            <SimpleText
                v-else-if="block.type == 'TEXT'"
                v-model="block.content"
                :block="block"
                :previewValue="block.actualContent()"
                :editMode="editMode"
                :name="`block[${block.parentID}][${block.id}]`"
                :scopeUUID="block.scopeUUID"
                :tagSet="activeTagSet"
                :language="language"
                @ready="blockBecameReady"
            />
            <CodeREPL
                v-if="block.type == 'REPL'"
                :block="block"
                :eventHub="eventHub"
                :blockInfo="blockInfo"
                :isReady="isReady"
                :canStop="canStop"
                :showGlobalMessages="showGlobalMessages"
                :globalStateMessage="$compilerState.globalStateMessage"
                @ready="blockBecameReady"
                @run="run"
                @stop="stop"
            />

            <DataBlock
                v-else-if="block.type == 'DATA'"
                :block="block"
                :editMode="editMode"
                :finalOutputObject="finalOutputObject"
                :theme="themeForBlock(block)"
                :tagSet="activeTagSet"
                @ready="blockBecameReady"
                :eventHub="eventHub"
            />
        </CodeBlockContainer>

        <div class="row justify-end" v-if="editMode">
            <div>
                <q-btn @click="addNewBlock" push color="green"
                    >{{ $t('CodeBlocks.AddBlock') }}
                    <q-icon name="library_add" class="q-ml-sm" />
                </q-btn>
            </div>
        </div>

        <div
            :class="`runner ${editMode ? 'q-pt-lg q-mx-lg' : ''}`"
            v-show="!hasREPL"
            v-if="canRun"
            id="runContainer"
            :data-question="blockInfo.id"
        >
            <div class="row runnerState" id="stateBox" :data-question="blockInfo.id">
                <q-btn
                    id="allow_run_button"
                    :loading="!isReady"
                    :disabled="!isReady"
                    color="primary"
                    class="white--text"
                    @click="run"
                    :ripple="{ center: true }"
                    style="border-radius: 0px"
                    :data-question="blockInfo.id"
                >
                    {{ $t('CodeBlocks.run') }}
                    <q-icon right dark name="play_arrow"></q-icon>
                    <q-tooltip :delay="200" v-if="editMode">
                        <span v-html="$t('CodeBlocks.run_hint')"></span>
                    </q-tooltip>
                </q-btn>
                <div class="animated fadeIn"></div>
                <transition
                    appear
                    enter-active-class="animated fadeIn"
                    leave-active-class="animated fadeOut"
                >
                    <div class="q-pl-sm" v-show="canStop">
                        <q-btn
                            id="cancel_button"
                            color="negative"
                            :ripple="{ center: true }"
                            style="border-radius: 0px"
                            :data-question="blockInfo.id"
                            @click="stop"
                        >
                            {{ $t('CodeBlocks.stop') }}
                            <q-icon right dark name="stop"></q-icon>
                        </q-btn>
                    </div>
                </transition>
                <transition
                    appear
                    enter-active-class="animated fadeIn"
                    leave-active-class="animated fadeOut"
                >
                    <div
                        class="globalState col-grow"
                        style="align-self: center"
                        v-show="showGlobalMessages"
                    >
                        <div id="message" v-html="$compilerState.globalStateMessage"></div>
                    </div>
                </transition>
            </div>
            <q-slide-transition>
                <pre
                    :id="`${blockInfo.id}Output`"
                    ref="outputElement"
                    class="output"
                    v-if="hasOutput"
                ><div id='out' v-html='outputHTML'></div></pre>
            </q-slide-transition>
        </div>
    </div>
</template>

<script lang="ts">
import Vue, {
    defineComponent,
    toRefs,
    ref,
    computed,
    onMounted,
    onBeforeUnmount,
    PropType,
    Ref,
    nextTick,
    ComputedRef,
    UnwrapRef,
} from 'vue'
import CodeBlockContainer from '@/components/CodeBlockContainer.vue'
import CodeBlocksSettings, { ICodeBlockSettingsOptions } from '@/components/CodeBlocksSettings.vue'
import CodeBlock from '@/components/CodeBlock.vue'
import CodePlayground from '@/components/CodePlayground.vue'
import CodeREPL from '@/components/CodeREPL.vue'
import SimpleText from '@/components/SimpleText.vue'
import DataBlock from '@/components/DataBlock.vue'
import { BlockData, IMainBlock } from '@/lib/codeBlocksManager'
import { IScriptOutputObject, IProcessedScriptOutput } from '@/lib/IScriptBlock'
import {
    ICompilerID,
    ICompilerErrorDescription,
    ICompileAndRunArguments,
} from '@/lib/ICompilerRegistry'
import {
    CodeOutputTypes,
    IRandomizerSet,
    KnownBlockTypes,
    IBlockDataPlayground,
} from '@/lib/ICodeBlocks'
import compilerRegistry from '@/lib/CompilerRegistry'
import { globalState } from '@/lib/globalState'

function formatOutput(result) {
    const regex =
        /^@(bold|italic|em)?(red|green|blue|cyan|magenta|yellow|orange|gray|#[\da-f]{6}|#[\da-f]{8}):(.*)/gim
    return result
        .split('\n')
        .map((line, nr) => {
            let m
            if ((m = regex.exec(result)) !== null) {
                let style = ''
                if (m[2] === 'gray') {
                    style = 'style="color:silver"'
                } else if (m[2] !== undefined) {
                    style = `style="color:${m[2]}"`
                }
                if (m[1] === 'bold') {
                    line = `<b ${style}>${m[3]}</b>`
                } else if (m[1] === 'italic' || m[1] === 'em') {
                    line = `<em ${style}>${m[3]}</em>`
                } else {
                    line = `<span ${style}>${m[3]}</span>`
                }
            }
            return line
        })
        .join('\n')
}

export interface IOnTypeChangeInfo {
    type: KnownBlockTypes
    hidden: boolean
    static: boolean
    id: number
    hasCode: boolean
}

export interface IOnVisibleLinesChangeInfo {
    visibleLines: 'auto' | number
    id: number
}

export interface IOnPlacementChangeInfo extends IBlockDataPlayground {
    id: number
}

export interface IOnScriptVersionChangeInfo {
    version: string
    id: number
}

export interface IOnSetAutoResetInfo {
    shouldAutoreset: boolean
    id: number
}

export interface IOnReloadResourcesInfo {
    shouldReloadResources: boolean
    id: number
}

export interface IOnGenerateTemplateInfo {
    generateTemplate: boolean
    id: number
}

export interface IOnThemeChangeInfo {
    solution: string
    code: string
}

export interface IOnChangeOrder {
    id: number
    newID: number
}

export function codeBlockSetup(blockInfo: Ref<IMainBlock>, editMode: ComputedRef<boolean>) {
    const didInitialize = ref<boolean>(false)
    const outputHTML = ref<string>('')
    let output = ref<string>('')
    const sansoutput = ref<string>('')
    const didClip = ref<boolean>(false)
    const eventHub = ref<Vue>(new Vue())
    const _finalOutputObject = ref<IScriptOutputObject | null>(null)
    const didRunOnce = ref<boolean>(false)
    const triggerRecompileWhenFinished = ref<boolean>(false)
    const continuousCodeUpdateTimer = ref<number | null>(null)
    const continuousCompile = computed((): boolean => {
        if (editMode.value) {
            return false
        }
        const cmp = compilerRegistry.getCompiler(compiler.value)
        if (cmp) {
            return cmp.allowsContinousCompilation
        }
        return false
    })
    const finalOutputObject = computed((): IScriptOutputObject => {
        if (_finalOutputObject.value === null || _finalOutputObject.value === undefined) {
            return {
                initialOutput: '',
                output: '',
                processedOutput: {
                    type: 'text',
                    text: '',
                    json: undefined,
                },
                sansoutput: '',
                outputElement: $(outputElement.value as any) as any,
            }
        }
        return _finalOutputObject.value
    })
    const options = computed((): ICodeBlockSettingsOptions => {
        return {
            language: language.value,
            compiler: compiler.value,
            executionTimeout: executionTimeout.value,
            maxCharacters: maxCharacters.value,
            runCode: runCode.value,
            domLibs: domLibraries.value,
            workerLibs: workerLibraries.value,
            id: blockInfo.value.id,
            codeTheme: codeTheme.value,
            solutionTheme: solutionTheme.value,
            outputParser: outputParser.value,
            randomizer: blockInfo.value.randomizer,
            continuousCompilation: blockInfo.value.continuousCompilation,
            persistentArguments: blockInfo.value.persistentArguments,
            messagePassing: blockInfo.value.messagePassing,
            keepAlive: blockInfo.value.keepAlive,
        }
    })
    const blocks = computed(() => {
        return blockInfo.value.blocks
    })

    // const blocks = blockInfo.value.blocks
    const language = computed((): string => {
        return blockInfo.value.language
    })
    const blockid = computed((): number => {
        return blockInfo.value.id
    })
    const executionTimeout = computed((): number => {
        return blockInfo.value.executionTimeout
    })
    const maxCharacters = computed((): number => {
        return blockInfo.value.maxCharacters
    })
    const compiler = computed((): ICompilerID => {
        return blockInfo.value.compiler
    })
    const runCode = computed((): boolean => {
        return blockInfo.value.runCode
    })
    const domLibraries = computed((): string[] => {
        return blockInfo.value.domLibs
    })
    const workerLibraries = computed((): string[] => {
        return blockInfo.value.workerLibs
    })
    const solutionTheme = computed((): string => {
        return blockInfo.value.solutionTheme
    })
    const codeTheme = computed((): string => {
        return blockInfo.value.codeTheme
    })
    const readonly = computed((): boolean => {
        return blockInfo.value.readonly
    })
    const outputParser = computed((): CodeOutputTypes => {
        return blockInfo.value.outputParser
    })
    const hasOutput = computed((): boolean => {
        return outputHTML.value !== undefined && outputHTML.value != ''
    })
    const mimeType = computed((): string => {
        return globalState.codeBlocks.mimeType(language.value)
    })
    const isReady = computed((): boolean => {
        let cmp = compilerRegistry.getCompiler(compiler.value)
        if (!cmp) {
            return false
        }
        return (
            didInitialize.value &&
            cmp.isReady &&
            !cmp.isRunning &&
            !globalState.compilerState.runButtonForceHide
        )
    })
    const canRun = computed((): boolean => {
        let cmp = compilerRegistry.getCompiler(compiler.value)
        if (!cmp) {
            return false
        }
        return cmp.canRun && runCode.value
    })
    const randomizerActive = computed((): boolean => {
        return blockInfo.value.randomizer.active
    })
    const activeTagSet = computed((): IRandomizerSet | undefined => {
        if (!randomizerActive.value) {
            return undefined
        }
        return tagSet(blockInfo.value.randomizer.previewIndex)
    })
    const completeSource = computed((): string => {
        return blocks.value
            .filter((b) => b.hasCode)
            .map((b) => b.actualContent())
            .reduce((p, c) => {
                return p + '\n' + c
            }, '')
    })
    const showGlobalMessages = computed((): boolean => {
        return !globalState.compilerState.globalStateHidden
    })
    const playgrounds = computed(() => {
        return blocks.value.filter((b) => b.type == 'PLAYGROUND')
    })
    const dataBlocks = computed(() => {
        return blocks.value.filter((b) => b.type == 'DATA')
    })
    const outputElement: Ref<HTMLElement | null> = ref(null)
    const addonClass = computed((): string => {
        let cl = ''
        if (editMode.value) {
            cl += 'editmode '
        }
        if (readonly.value) {
            cl += 'block-readonly '
        }
        return cl
    })
    const backgroundColorClass = computed((): string => {
        return editMode.value ? 'blue-grey darken-4' : ''
    })
    const hasREPL = computed((): boolean => {
        return blocks.value.filter((bl) => bl.type === KnownBlockTypes.REPL).length > 0
    })
    const canStop = computed((): boolean => {
        return !isReady.value && didRunOnce.value
    })
    const blockBecameReady = (): void => {
        let readyCount = blockInfo.value.blocks.map((b) => b.readyCount).reduce((p, c) => p + c, 0)
        if (readyCount == blockInfo.value.blocks.length) {
            nextTick(() => {
                eventHub.value.$emit('all-mounted', {})
            })
        }
        console.d('Ready', readyCount, blockInfo.value.blocks.length)
    }
    const tagSet = (nr: number): IRandomizerSet => {
        return blockInfo.value.randomizer.sets[nr]
    }
    const themeForBlock = (bl: BlockData): string => {
        return bl.themeForCodeBlock
    }
    const blockById = (id: number): UnwrapRef<BlockData> | undefined => {
        return blocks.value.find((block) => block.id == id)
    }

    const onPlaygroundChangedOutput = (newOutput: string | undefined): void => {
        if (newOutput === undefined) {
            return
        }
        if (output.value != newOutput) {
            output = ref(newOutput.replaceAllPoly('<', '&lt;').replaceAllPoly('>', '&gt;'))
            if (maxCharacters.value > 0 && output.value.length > maxCharacters.value) {
                outputHTML.value = formatOutput(output.value.substr(0, maxCharacters.value))
                outputHTML.value += globalState.codeBlocks.format_info(
                    'Info: Output too long. Removed all following Characters. \n<b>...</b>\n\n'
                )
            } else {
                outputHTML.value = formatOutput(output.value)
            }
            outputHTML.value += sansoutput.value
        }
    }
    const resetOutput = (): void => {
        output.value = ''
        sansoutput.value = ''
        didClip.value = false
        outputHTML.value = ''
    }
    const log = (text: string): void => {
        output.value += text
        text = text.replaceAllPoly('<', '&lt;').replaceAllPoly('>', '&gt;')
        if (!didClip.value) {
            let formatedText
            if (maxCharacters.value > 0 && output.value.length > maxCharacters.value) {
                formatedText = globalState.codeBlocks.format_info(
                    'Info: Output too long. Removed all following Characters. \n<b>...</b>\n\n'
                )
                didClip.value = true
            } else {
                formatedText = formatOutput(text)
            }
            outputHTML.value += formatedText
            eventHub.value.$emit('console-log', formatedText)
        }
    }
    const logError = (text: string): void => {
        text = text.replaceAllPoly('<', '&lt;').replaceAllPoly('>', '&gt;')
        eventHub.value.$emit('console-err', text)
        text = globalState.codeBlocks.format_error(text)
        sansoutput.value += text
        outputHTML.value += text
    }
    const logInfo = (text: string): void => {
        text = text.replaceAllPoly('<', '&lt;').replaceAllPoly('>', '&gt;')
        eventHub.value.$emit('console-nfo', text)
        text = globalState.codeBlocks.format_info(text)
        sansoutput.value += text
        outputHTML.value += text
    }
    const processDiagnostics = (error: ICompilerErrorDescription) => {
        const line = error.start.line
        blocks.value.forEach((block) => {
            if (!block.hasCode) {
                return
            }
            const first = block.firstLine
            const last = block.nextLine - 1
            if (error.start.line >= first && error.start.line <= last) {
                block.errors.push(error)
            }
        })
    }
    const clearDiagnostics = (): void => {
        blocks.value.forEach((block) => (block.errors = []))
        eventHub.value.$emit('render-diagnostics', {})
    }
    const loadLibraries = (whenLoaded: () => void): void => {
        compilerRegistry.loadLibraries(domLibraries.value, whenLoaded)
    }
    const finishedExecution = (
        output: string,
        infoErrorOutput: string,
        resultData?: object | any[]
    ): void => {
        let parseError: any = undefined
        let processed: IProcessedScriptOutput = {
            type: 'text',
            json: undefined,
            text: output,
        }
        if (output !== undefined && playgrounds.value.length > 0) {
            try {
                processed = globalState.codeBlocks.processMixedOutput(
                    output,
                    outputParser.value,
                    undefined,
                    resultData
                )
            } catch (e) {
                parseError = e
            }
        }
        _finalOutputObject.value = {
            initialOutput: output,
            output: output,
            processedOutput: processed,
            sansoutput: sansoutput.value,
            parseError: parseError,
            outputElement: $(outputElement) as any,
        }
        eventHub.value.$emit('output-updated', _finalOutputObject.value)
        onRunFinished()
    }
    const stop = (): void => {
        const cmp = compilerRegistry.getCompiler(compiler.value)
        if (cmp === undefined || cmp.stop === undefined) {
            return
        }
        cmp.stop()
    }
    const run = (): boolean => {
        const cmp = compilerRegistry.getCompiler(compiler.value)
        if (cmp === undefined) {
            return false
        }
        globalState.compilerState.setAllRunButtons(false)
        resetOutput()
        eventHub.value.$emit('clicked-run')
        clearDiagnostics()
        loadLibraries(() => {
            eventHub.value.$emit('before-run', {})
            console.d('compileAndRun')
            didRunOnce.value = true
            nextTick(() => {
                nextTick(() => {
                    let _args: object | string[] = {}
                    if (cmp.acceptsJSONArgument) {
                        _args = blockInfo.value.initArgsForLanguage()
                        blocks.value.forEach((bl) => {
                            if (bl.obj) {
                                console.i('!!! ADD ARGUMENTS TO !!!')
                                bl.obj.addArgumentsTo(_args)
                            }
                        })
                    }
                    const runOptions: ICompileAndRunArguments = {
                        max_ms: executionTimeout.value,
                        log_callback: log,
                        info_callback: logInfo,
                        err_callback: logError,
                        compileFailedCallback: processDiagnostics,
                        finishedExecutionCB: (
                            success = true,
                            overrideOutput = undefined,
                            returnState = undefined
                        ) => {
                            console.i('returnState:', returnState, _args)
                            if (!success) {
                                globalState.compilerState.hideGlobalState()
                                globalState.compilerState.setAllRunButtons(true)
                                return undefined
                            }
                            let res = finishedExecution(
                                overrideOutput ? overrideOutput.value : output.value,
                                sansoutput.value,
                                runOptions.resultData
                            )
                            if (returnState !== undefined) {
                                if (blockInfo.value.persistentArguments) {
                                    console.i('Store Default State', returnState)
                                    blockInfo.value.storeDefaultArgs(returnState)
                                } else {
                                    blockInfo.value.clearDefaultArgs()
                                }
                            }
                            globalState.compilerState.hideGlobalState()
                            globalState.compilerState.setAllRunButtons(true)
                            return res
                        },
                        args: _args,
                        didReceiveMessage: (cmd, data) => {
                            console.i('MESSAGE - Received', cmd)
                            blocks.value.forEach((bl) => {
                                if (bl.obj) {
                                    bl.obj.didReceiveMessage(cmd, data)
                                }
                            })
                        },
                        postMessageFunction: null,
                        dequeuePostponedMessages: () => {},
                        allowMessagePassing:
                            cmp.allowsMessagePassing && options.value.messagePassing,
                        keepAlive:
                            cmp.allowsMessagePassing &&
                            options.value.messagePassing &&
                            options.value.keepAlive,
                        withREPL:
                            cmp.allowsMessagePassing &&
                            options.value.messagePassing &&
                            options.value.keepAlive &&
                            hasREPL.value,
                        beforeStartHandler: () => {
                            blocks.value.forEach((bl) => {
                                console.d('MESSAGE - Before Start')
                                if (bl.obj) {
                                    bl.obj.beforeStart()
                                }
                            })
                        },
                        whenFinishedHandler: (args: object | string[]) => {
                            blocks.value.forEach((bl) => {
                                console.d('MESSAGE - When Finished')
                                if (bl.obj) {
                                    bl.obj.whenFinished(args, runOptions.resultData)
                                }
                            })
                        },
                        resultData: undefined,
                    }
                    if (runOptions.keepAlive) {
                        blocks.value.forEach((bl) => {
                            if (bl.obj) {
                                bl.obj.runConfig = runOptions
                            }
                        })
                    }
                    cmp.compileAndRun('' + blockid.value, completeSource.value, self, runOptions)
                })
            })
        })
        return true
    }
    const onkey = (event) => {
        if (
            editMode.value &&
            (event.ctrlKey || event.metaKey) &&
            (event.key === 'w' || event.key === 'j')
        ) {
            run()
            event.preventDefault()
            return false
        }
    }

    const onViewCodeChange = (forceRun: boolean = false) => {
        if (!forceRun && !blockInfo.value.continuousCompilation) {
            return
        }
        if (continuousCodeUpdateTimer.value !== null) {
            clearTimeout(continuousCodeUpdateTimer.value)
            continuousCodeUpdateTimer.value = null
        }
        continuousCodeUpdateTimer.value = setTimeout(() => {
            const cmp = compilerRegistry.getCompiler(compiler.value)
            console.d('Continuous Compile - ', cmp)
            if (cmp && cmp.allowsContinousCompilation) {
                if (!cmp.isRunning && cmp.isReady) {
                    console.d('Continuous Compile - ', 'RUN')
                    run()
                } else {
                    console.d('Continuous Compile - ', 'DEFER')
                    triggerRecompileWhenFinished.value = true
                }
            }
        }, process.env.VUE_APP_CONTINOUS_COMPILE_TIMEOUT)
    }
    const onRunFinished = () => {
        didRunOnce.value = false
        if (triggerRecompileWhenFinished.value) {
            console.d('Continuous Compile - ', 'RE-RUN')
            triggerRecompileWhenFinished.value = false
            onViewCodeChange()
        }
    }
    const onRunFromPlayground = () => {
        const cmp = compilerRegistry.getCompiler(compiler.value)
        if (cmp && cmp.canRun && !editMode.value && cmp.allowsContinousCompilation) {
            onViewCodeChange(true)
        }
    }
    onMounted(() => {
        let cmp = compilerRegistry.getCompiler(compiler.value)
        if (cmp) {
            cmp.preload()
        }

        loadLibraries(() => {
            eventHub.value.$emit('initialized-libraries', {})
        })
        didInitialize.value = true
        if (editMode.value) {
            window.addEventListener('keydown', onkey, false)
        }
    })
    onBeforeUnmount(() => {
        window.removeEventListener('keydown', onkey)
    })
    return {
        didInitialize,
        outputHTML,
        output,
        sansoutput,
        didClip,
        _finalOutputObject,
        eventHub,
        didRunOnce,
        triggerRecompileWhenFinished,
        continuousCodeUpdateTimer,
        continuousCompile,
        finalOutputObject,
        options,
        blocks,
        language,
        blockid,
        executionTimeout,
        maxCharacters,
        compiler,
        runCode,
        domLibraries,
        workerLibraries,
        solutionTheme,
        codeTheme,
        readonly,
        outputParser,
        hasOutput,
        mimeType,
        isReady,
        canRun,
        randomizerActive,
        activeTagSet,
        completeSource,
        showGlobalMessages,
        playgrounds,
        dataBlocks,
        outputElement,
        addonClass,
        backgroundColorClass,
        hasREPL,
        canStop,
        blockBecameReady,
        tagSet,
        themeForBlock,
        blockById,
        onPlaygroundChangedOutput,
        resetOutput,
        log,
        logError,
        logInfo,
        processDiagnostics,
        clearDiagnostics,
        loadLibraries,
        finishedExecution,
        stop,
        run,
        onkey,
        onViewCodeChange,
        onRunFinished,
        onRunFromPlayground,
    }
}

export default defineComponent({
    name: 'CodeBlocks',
    components: {
        CodeBlockContainer,
        CodeBlocksSettings,
        CodeBlock,
        CodePlayground,
        SimpleText,
        CodeREPL,
        DataBlock,
    },
    props: {
        blockInfo: { required: true, type: Object as PropType<IMainBlock> },
    },
    setup(props, ctx) {
        const { blockInfo } = toRefs(props)
        const editMode = computed((): boolean => {
            return false
        })
        const {
            didInitialize,
            outputHTML,
            output,
            sansoutput,
            didClip,
            _finalOutputObject,
            eventHub,
            didRunOnce,
            triggerRecompileWhenFinished,
            continuousCodeUpdateTimer,
            continuousCompile,
            finalOutputObject,
            options,
            blocks,
            language,
            blockid,
            executionTimeout,
            maxCharacters,
            compiler,
            runCode,
            domLibraries,
            workerLibraries,
            solutionTheme,
            codeTheme,
            readonly,
            outputParser,
            hasOutput,
            mimeType,
            isReady,
            canRun,
            randomizerActive,
            activeTagSet,
            completeSource,
            showGlobalMessages,
            playgrounds,
            dataBlocks,
            outputElement,
            addonClass,
            backgroundColorClass,
            hasREPL,
            canStop,
            blockBecameReady,
            tagSet,
            themeForBlock,
            blockById,
            onPlaygroundChangedOutput,
            resetOutput,
            log,
            logError,
            logInfo,
            processDiagnostics,
            clearDiagnostics,
            loadLibraries,
            finishedExecution,
            stop,
            run,
            onkey,
            onViewCodeChange,
            onRunFinished,
            onRunFromPlayground,
        } = codeBlockSetup(blockInfo, editMode)
        const onTypeChange = (nfo: IOnTypeChangeInfo): void => {}
        const onVisibleLinesChange = (nfo: IOnVisibleLinesChangeInfo): void => {}
        const onPlacementChange = (nfo: IOnPlacementChangeInfo): void => {}
        const onScriptVersionChange = (nfo: IOnScriptVersionChangeInfo): void => {}
        const onSetAutoReset = (nfo: IOnSetAutoResetInfo): void => {}
        const onReloadResources = (nfo: IOnReloadResourcesInfo): void => {}
        const onSetGenerateTemplate = (nfo: IOnGenerateTemplateInfo): void => {}
        const onCompilerChange = (v: string): void => {}
        const onCompilerVersionChange = (v: string): void => {}
        const onRunStateChange = (v: boolean): void => {}
        const onContinousCompileStateChange = (v: boolean): void => {}
        const onMessagePassingChange = (v: boolean): void => {}
        const onKeepAliveChange = (v: boolean): void => {}
        const onPersistentArgumentsChange = (v: boolean): void => {}
        const onLanguageChange = (v: string): void => {}
        const onCharacterLimitChange = (v: number): void => {}
        const onTimeoutChange = (v: number): void => {}
        const onWorkerLibChange = (v: string[]): void => {}
        const onDomLibChange = (v: string[]): void => {}
        const onThemeChange = (nfo: IOnThemeChangeInfo): void => {}
        const onOutputParserChange = (v: CodeOutputTypes): void => {}
        const moveUp = (idx: number): void => {}
        const moveDown = (idx: number): void => {}
        const onChangeOrder = (nfo: IOnChangeOrder): void => {}
        const removeBlock = (idx: number): void => {}
        const addNewBlock = (): void => {}
        return {
            didInitialize,
            outputHTML,
            output,
            sansoutput,
            didClip,
            _finalOutputObject,
            eventHub,
            didRunOnce,
            triggerRecompileWhenFinished,
            continuousCodeUpdateTimer,
            continuousCompile,
            finalOutputObject,
            options,
            blocks,
            language,
            blockid,
            executionTimeout,
            maxCharacters,
            compiler,
            runCode,
            domLibraries,
            workerLibraries,
            solutionTheme,
            codeTheme,
            readonly,
            outputParser,
            editMode,
            hasOutput,
            mimeType,
            isReady,
            canRun,
            randomizerActive,
            activeTagSet,
            completeSource,
            showGlobalMessages,
            playgrounds,
            dataBlocks,
            outputElement,
            addonClass,
            backgroundColorClass,
            hasREPL,
            canStop,
            blockBecameReady,
            tagSet,
            themeForBlock,
            blockById,
            onPlaygroundChangedOutput,
            resetOutput,
            log,
            logError,
            logInfo,
            processDiagnostics,
            clearDiagnostics,
            loadLibraries,
            finishedExecution,
            stop,
            run,
            onkey,
            onViewCodeChange,
            onRunFinished,
            onRunFromPlayground,
            onTypeChange,
            onVisibleLinesChange,
            onPlacementChange,
            onScriptVersionChange,
            onSetAutoReset,
            onReloadResources,
            onSetGenerateTemplate,
            onCompilerChange,
            onCompilerVersionChange,
            onRunStateChange,
            onContinousCompileStateChange,
            onMessagePassingChange,
            onKeepAliveChange,
            onPersistentArgumentsChange,
            onLanguageChange,
            onCharacterLimitChange,
            onTimeoutChange,
            onWorkerLibChange,
            onDomLibChange,
            onThemeChange,
            onOutputParserChange,
            moveUp,
            moveDown,
            onChangeOrder,
            removeBlock,
            addNewBlock,
        }
    },
})
</script>

<style lang="sass">

div.codeblocks.editmode
    box-shadow: 3px 3px 6px rgba(0, 0, 0, 0.1)
    border-radius: 5px
    background-repeat: repeat
    background-image: linear-gradient(45deg, #ffffff 25%, #ebf2f5 25%, #ebf2f5 50%, #ffffff 50%, #ffffff 75%, #ebf2f5 75%, #ebf2f5 100%)
    background-size: 56.57px 56.57px

div.codeblocks
    height: fit-content
    margin: 4px
    padding: 8px

    .block
        padding: 0px
        margin: 0px

div.runner
    margin: 8px 0px !important

    .runnerState
        margin: 0px !important
        padding: 0px !important

        button
            margin: 0px !important

        .globalState
            margin-left: 10px
            color: gray
            padding-left: 4px
            padding-right: 4px
            vertical-align: middle

    .output
        display: block
        font-family: monospace
        border: 1px solid #ccc
        border-radius: 0px
        background-color: #f5f5f5
        margin: 0 0 10px
        padding: 9.5px
        line-height: 1.42857143
        color: #333333
        white-space: pre-wrap
        word-break: break-all
        word-wrap: break-word
</style>
