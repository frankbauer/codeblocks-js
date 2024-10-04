import {
    CodeOutputTypes,
    IBlockDataPlayground,
    IRandomizerSet,
    KnownBlockTypes,
} from '@/lib/ICodeBlocks'
import {
    computed,
    ComputedRef,
    nextTick,
    onBeforeUnmount,
    onMounted,
    ref,
    Ref,
    UnwrapRef,
} from 'vue'
import { BlockData, IMainBlock } from '@/lib/codeBlocksManager'
import { EventHubType } from '@/composables/globalEvents'
import { IProcessedScriptOutput, IScriptOutputObject } from '@/lib/IScriptBlock'
import { globalState } from '@/lib/globalState'
import compilerRegistry from '@/lib/CompilerRegistry'
import {
    ICompileAndRunArguments,
    ICompilerErrorDescription,
    ICompilerID,
} from '@/lib/ICompilerRegistry'
import { ICodeBlockSettingsOptions } from '@/components/CodeBlocksSettings.vue'
import { BlockStorageType } from '@/storage/blockStorage'

export interface CodeBlocksProperties {
    eventHub: EventHubType
    appID: number
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

export function codeBlockSetup(
    blockStorage: BlockStorageType,
    editMode: ComputedRef<boolean>,
    eventHub: EventHubType
) {
    const blockInfo = blockStorage.appInfo
    const didInitialize = ref<boolean>(false)
    const outputHTML = ref<string>('')
    let output = ref<string>('')
    const sansoutput = ref<string>('')
    const didClip = ref<boolean>(false)
    const _finalOutputObject = ref<IScriptOutputObject | null>(null)
    const didRunOnce = ref<boolean>(false)
    const triggerRecompileWhenFinished = ref<boolean>(false)
    let continuousCodeUpdateTimer: any = null
    const global = computed(() => {
        return globalState
    })
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
        return blockInfo.value.blocks as BlockData[]
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
        return globalState.appState.mimeType(language.value)
    })
    const isReady = computed((): boolean => {
        const cmp = compilerRegistry.getCompiler(compiler.value)
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
        const cmp = compilerRegistry.getCompiler(compiler.value)
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
        const readyCount = blockInfo.value.blocks
            .map((b) => b.readyCount)
            .reduce((p, c) => p + c, 0)
        if (readyCount == blockInfo.value.blocks.length) {
            nextTick(() => {
                eventHub.emit('all-mounted', {})
            })
        }
        console.d('Ready', readyCount, blockInfo.value.blocks.length)
    }
    const tagSet = (nr: number): IRandomizerSet => {
        return blockInfo.value.randomizer.sets[nr]
    }
    const themeForBlock = (bl: UnwrapRef<BlockData>): string => {
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
                outputHTML.value += globalState.appState.format_info(
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
                formatedText = globalState.appState.format_info(
                    'Info: Output too long. Removed all following Characters. \n<b>...</b>\n\n'
                )
                didClip.value = true
            } else {
                formatedText = formatOutput(text)
            }
            outputHTML.value += formatedText
            eventHub.emit('console-log', formatedText)
        }
    }
    const logError = (text: string): void => {
        text = text.replaceAllPoly('<', '&lt;').replaceAllPoly('>', '&gt;')
        eventHub.emit('console-err', text)
        text = globalState.appState.format_error(text)
        sansoutput.value += text
        outputHTML.value += text
    }
    const logInfo = (text: string): void => {
        text = text.replaceAllPoly('<', '&lt;').replaceAllPoly('>', '&gt;')
        eventHub.emit('console-nfo', text)
        text = globalState.appState.format_info(text)
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
        eventHub.emit('render-diagnostics', {})
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
                processed = globalState.appState.processMixedOutput(
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
        eventHub.emit('output-updated', _finalOutputObject.value)
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
        eventHub.emit('clicked-run')
        clearDiagnostics()
        loadLibraries(() => {
            eventHub.emit('before-run', {})
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
                            const res = finishedExecution(
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
                    cmp.compileAndRun(
                        '' + blockid.value,
                        completeSource.value,
                        {
                            workerLibraries: workerLibraries.value,
                            $compilerRegistry: compilerRegistry,
                            blocks: blocks.value,
                        },
                        runOptions
                    )
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
        if (continuousCodeUpdateTimer !== null) {
            clearTimeout(continuousCodeUpdateTimer)
            continuousCodeUpdateTimer = null
        }
        continuousCodeUpdateTimer = setTimeout(() => {
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
        }, globalState.VUE_APP_CONTINOUS_COMPILE_TIMEOUT)
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
        const cmp = compilerRegistry.getCompiler(compiler.value)
        if (cmp) {
            cmp.preload()
        }

        loadLibraries(() => {
            eventHub.emit('initialized-libraries', {})
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
        global,
    }
}
