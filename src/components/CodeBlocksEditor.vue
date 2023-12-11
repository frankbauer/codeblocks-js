<script lang="ts">
import { defineComponent, computed, PropType, toRefs } from 'vue'
import CodeBlocks, {
    IOnTypeChangeInfo,
    IOnVisibleLinesChangeInfo,
    IOnPlacementChangeInfo,
    IOnScriptVersionChangeInfo,
    IOnSetAutoResetInfo,
    IOnThemeChangeInfo,
    IOnGenerateTemplateInfo,
    IOnChangeOrder,
    IOnReloadResourcesInfo,
    codeBlockSetup,
} from '@/components/CodeBlocks.vue'
import { KnownBlockTypes, CodeOutputTypes } from '@/lib/ICodeBlocks'
import { IMainBlock } from '@/lib/codeBlocksManager'
import compilerRegistry from '@/lib/CompilerRegistry'
import CodeBlockContainer from '@/components/CodeBlockContainer.vue'
import CodeBlocksSettings from '@/components/CodeBlocksSettings.vue'
import CodeBlock from '@/components/CodeBlock.vue'
import CodePlayground from '@/components/CodePlayground.vue'
import SimpleText from '@/components/SimpleText.vue'
import CodeREPL from '@/components/CodeREPL.vue'
import DataBlock from '@/components/DataBlock.vue'
import { EventHubType } from '@/composables/globalEvents'

export default defineComponent({
    name: 'CodeBlocksEditor',
    extends: CodeBlocks,
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
        eventHub: { required: true, type: Object as PropType<EventHubType> },
    },
    setup(props, ctx) {
        const { blockInfo } = toRefs(props)
        const editMode = computed((): boolean => {
            return true
        })
        const {
            didInitialize,
            outputHTML,
            output,
            sansoutput,
            didClip,
            _finalOutputObject,
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
        } = codeBlockSetup(blockInfo, editMode, props.eventHub)

        const onTypeChange = (nfo: IOnTypeChangeInfo): void => {
            let bl = blockById(nfo.id)
            if (bl === undefined) {
                return
            }
            bl.type = nfo.type
            bl.hidden = nfo.hidden
            bl.static = nfo.static
            bl.hasCode = nfo.hasCode
        }
        const onVisibleLinesChange = (nfo: IOnVisibleLinesChangeInfo): void => {
            let bl = blockById(nfo.id)
            if (bl === undefined) {
                return
            }
            if (nfo.visibleLines != 'auto' && isNaN(nfo.visibleLines)) {
                bl.visibleLines = 'auto'
            } else {
                bl.visibleLines = nfo.visibleLines
            }
        }
        const onPlacementChange = (nfo: IOnPlacementChangeInfo): void => {
            let bl = blockById(nfo.id)
            if (bl === undefined) {
                return
            }
            bl.width = nfo.width
            bl.height = nfo.height
            bl.align = nfo.align
        }
        const onCompilerChange = (v: string): void => {
            const c = compilerRegistry.getCompiler({ languageType: v })
            if (c !== undefined) {
                console.log('Selected Compiler', c, v, blockInfo.value.compiler)
                blockInfo.value.compiler.languageType = v
                blockInfo.value.compiler.version = c.version
                blockInfo.value.language = c.language
                console.log('PRELOADING')
                c.preload()
            }
        }
        const onCompilerVersionChange = (v: string): void => {
            console.log('Selected Version', v, blockInfo.value.compiler.languageType)
            const c = compilerRegistry.getCompiler({
                languageType: blockInfo.value.compiler.languageType,
                version: v,
            })
            blockInfo.value.compiler.version = v
            if (c !== undefined) {
                blockInfo.value.language = c.language
                console.log('PRELOADING')
                c.preload()
            }
        }
        const onRunStateChange = (v: boolean): void => {
            blockInfo.value.runCode = v
        }
        const onContinousCompileStateChange = (v: boolean): void => {
            blockInfo.value.continuousCompilation = v
        }
        const onMessagePassingChange = (v: boolean): void => {
            blockInfo.value.messagePassing = v
        }
        const onKeepAliveChange = (v: boolean): void => {
            blockInfo.value.keepAlive = v
        }
        const onPersistentArgumentsChange = (v: boolean): void => {
            if (v === false) {
                blockInfo.value.clearDefaultArgs()
            }
            blockInfo.value.persistentArguments = v
        }
        const onLanguageChange = (v: string): void => {
            blockInfo.value.language = v
        }
        const onCharacterLimitChange = (v: number): void => {
            blockInfo.value.maxCharacters = v
        }
        const onTimeoutChange = (v: number): void => {
            blockInfo.value.executionTimeout = v
        }
        const onWorkerLibChange = (v: string[]): void => {
            blockInfo.value.workerLibs = v
        }
        const onDomLibChange = (v: string[]): void => {
            blockInfo.value.domLibs = v
        }
        const onScriptVersionChange = (nfo: IOnScriptVersionChangeInfo): void => {
            let bl = blockById(nfo.id)
            if (bl === undefined) {
                return
            }
            bl.version = nfo.version
            if (bl.obj) {
                bl.obj.version = nfo.version
            }
        }
        const onSetAutoReset = (nfo: IOnSetAutoResetInfo): void => {
            let bl = blockById(nfo.id)
            if (bl === undefined) {
                return
            }
            bl.shouldAutoreset = nfo.shouldAutoreset
        }
        const onReloadResources = (nfo: IOnReloadResourcesInfo): void => {
            let bl = blockById(nfo.id)
            if (bl === undefined) {
                return
            }
            bl.shouldReloadResources = nfo.shouldReloadResources
        }
        const onSetGenerateTemplate = (nfo: IOnGenerateTemplateInfo): void => {
            let bl = blockById(nfo.id)
            if (bl === undefined) {
                return
            }
            bl.generateTemplate = nfo.generateTemplate
        }
        const onThemeChange = (nfo: IOnThemeChangeInfo): void => {
            blockInfo.value.solutionTheme = nfo.solution
            blockInfo.value.codeTheme = nfo.code
        }
        const moveUp = (idx: number): void => {
            blockInfo.value.moveUp(idx)
        }
        const moveDown = (idx: number): void => {
            blockInfo.value.moveDown(idx)
        }
        const onChangeOrder = (nfo: IOnChangeOrder): void => {
            let bl = blockById(nfo.id)
            if (bl === undefined) {
                return
            }
            blockInfo.value.changeOrder(nfo.id, nfo.newID)
        }
        const addNewBlock = (): void => {
            blockInfo.value.addNewBlock()
        }
        const removeBlock = (idx: number): void => {
            blockInfo.value.removeBlock(idx)
        }
        const onOutputParserChange = (v: CodeOutputTypes): void => {
            blockInfo.value.outputParser = v
        }
        return {
            didInitialize,
            outputHTML,
            output,
            sansoutput,
            didClip,
            _finalOutputObject,
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
