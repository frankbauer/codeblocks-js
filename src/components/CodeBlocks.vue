<script lang="ts" setup>
import { toRefs, computed } from 'vue'
import CodeBlockContainer from '@/components/CodeBlockContainer.vue'
import CodeBlocksSettings, { ICodeBlockSettingsOptions } from '@/components/CodeBlocksSettings.vue'
import CodeBlock from '@/components/CodeBlock.vue'
import CodePlayground from '@/components/CodePlayground.vue'
import CodeREPL from '@/components/CodeREPL.vue'
import SimpleText from '@/components/SimpleText.vue'
import DataBlock from '@/components/DataBlock.vue'
import compilerRegistry from '@/lib/CompilerRegistry'
import { CodeOutputTypes } from '@/lib/ICodeBlocks'
import {
    codeBlockSetup,
    CodeBlocksProperties,
    IOnChangeOrder,
    IOnGenerateTemplateInfo,
    IOnPlacementChangeInfo,
    IOnReloadResourcesInfo,
    IOnScriptVersionChangeInfo,
    IOnSetAutoResetInfo,
    IOnThemeChangeInfo,
    IOnTypeChangeInfo,
    IOnVisibleLinesChangeInfo,
} from '@/composables/basicBlocks'
import { type BlockStorageType, useBlockStorage } from '@/storage/blockStorage'
import '@quasar/extras/material-icons/material-icons.css'

const props = defineProps<CodeBlocksProperties>()
const { appID } = toRefs(props)
const blockStorage: BlockStorageType = useBlockStorage(appID.value)
const blockInfo = blockStorage.appInfo
const editMode = blockStorage.appInfo.value.editMode
const {
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
} = codeBlockSetup(blockStorage, editMode, props.eventHub)

// Use handlers conditionally based on edit mode
const onTypeChange = (nfo: IOnTypeChangeInfo): void => {
    if (!editMode) return
    let bl = blockById(nfo.id)
    if (bl === undefined) return
    bl.type = nfo.type
    bl.hidden = nfo.hidden
    bl.static = nfo.static
    bl.hasCode = nfo.hasCode
}

const onVisibleLinesChange = (nfo: IOnVisibleLinesChangeInfo): void => {
    if (!editMode) return
    let bl = blockById(nfo.id)
    if (bl === undefined) return
    if (nfo.visibleLines != 'auto' && isNaN(nfo.visibleLines)) {
        bl.visibleLines = 'auto'
    } else {
        bl.visibleLines = nfo.visibleLines
    }
}

const onPlacementChange = (nfo: IOnPlacementChangeInfo): void => {
    if (editMode) {
        let bl = blockById(nfo.id)
        if (bl === undefined) return
        bl.width = nfo.width
        bl.height = nfo.height
        bl.align = nfo.align
    }
}

const onScriptVersionChange = (nfo: IOnScriptVersionChangeInfo): void => {
    if (editMode) {
        let bl = blockById(nfo.id)
        if (bl === undefined) {
            return
        }
        bl.version = nfo.version
        if (bl.obj) {
            bl.obj.version = nfo.version
        }
    }
}

const onSetAutoReset = (nfo: IOnSetAutoResetInfo): void => {
    if (editMode) {
        let bl = blockById(nfo.id)
        if (bl === undefined) return        
        bl.shouldAutoreset = nfo.shouldAutoreset
    }
}

const onReloadResources = (nfo: IOnReloadResourcesInfo): void => {
    if (editMode) {
        let bl = blockById(nfo.id)
        if (bl === undefined) return        
        bl.shouldReloadResources = nfo.shouldReloadResources
    }
}

const onSetGenerateTemplate = (nfo: IOnGenerateTemplateInfo): void => {
    if (editMode) {
        let bl = blockById(nfo.id)
        if (bl === undefined) return
        bl.generateTemplate = nfo.generateTemplate
    }
}

const onCompilerChange = (v: string): void => {
    if (editMode) {
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
}

const onCompilerVersionChange = (v: string): void => {
    if (editMode) {
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
}

const onRunStateChange = (v: boolean): void => {
    if (editMode) {
        blockInfo.value.runCode = v
    }
}

const onContinousCompileStateChange = (v: boolean): void => {
    if (editMode) {
        blockInfo.value.continuousCompilation = v
    }
}

const onMessagePassingChange = (v: boolean): void => {
    if (editMode) {
        blockInfo.value.messagePassing = v
    }
}

const onKeepAliveChange = (v: boolean): void => {
    if (editMode) {
        blockInfo.value.keepAlive = v
    }
}

const onPersistentArgumentsChange = (v: boolean): void => {
    if (editMode) {
        if (v === false) {
            blockInfo.value.clearDefaultArgs()
        }
        blockInfo.value.persistentArguments = v
    }
}

const onLanguageChange = (v: string): void => {
    if (editMode) {
        blockInfo.value.language = v
    }
}

const onCharacterLimitChange = (v: number): void => {
    if (editMode) {
        blockInfo.value.maxCharacters = v
    }
}

const onTimeoutChange = (v: number): void => {
    if (editMode) {
        blockInfo.value.executionTimeout = v
    }
}

const onWorkerLibChange = (v: string[]): void => {
    if (editMode) {
        blockInfo.value.workerLibs = v
    }
}

const onDomLibChange = (v: string[]): void => {
    if (editMode) {
        blockInfo.value.domLibs = v
    }
}

const onThemeChange = (nfo: IOnThemeChangeInfo): void => {
    if (editMode) {
        console.log('TC', nfo)
        blockInfo.value.solutionTheme = nfo.solution
        blockInfo.value.codeTheme = nfo.code
    }
}

const onOutputParserChange = (v: CodeOutputTypes): void => {
    if (editMode) {
        blockInfo.value.outputParser = v
    }
}

const moveUp = (idx: number): void => {
    if (editMode) {
        blockInfo.value.moveUp(idx)
    }
}

const moveDown = (idx: number): void => {
    if (editMode) {
        blockInfo.value.moveDown(idx)
    }
}

const onChangeOrder = (nfo: IOnChangeOrder): void => {
    if (editMode) {
        let bl = blockById(nfo.id)
        if (bl === undefined) return
        blockInfo.value.changeOrder(nfo.id, nfo.newID)
    }
}

const removeBlock = (idx: number): void => {
    if (editMode) {
        blockInfo.value.removeBlock(idx)
    }
}

const addNewBlock = (): void => {
    if (editMode) {
        blockInfo.value.addNewBlock()
    }
}
</script>

<template>
    <div
        :class="`codeblocks ${addonClass}  ${backgroundColorClass} q-mx-sm q-mb-md`"
        :data-question="blockInfo.id"
        :uuid="blockInfo.uuid"
    >
        <CodeBlocksSettings
            v-if="editMode"
            :options="options"
            :appID="appID"
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
            :appID="appID"
            :blockID="block.uuid"
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
                :appID="appID"
                :blockID="block.uuid"
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
                :appID="appID"
                :blockID="block.uuid"
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
                :appID="appID"
                :blockID="block.uuid"
                :editMode="editMode"
                :name="`block[${block.parentID}][${block.id}]`"
                :scopeUUID="block.scopeUUID"
                :tagSet="activeTagSet"
                :language="language"
                @ready="blockBecameReady"
            />
            <CodeREPL
                v-if="block.type == 'REPL'"
                :appID="appID"
                :blockID="block.uuid"
                :block="block"
                :eventHub="eventHub"
                :blockInfo="blockInfo"
                :isReady="isReady"
                :canStop="canStop"
                :showGlobalMessages="showGlobalMessages"
                :globalStateMessage="global.compilerState.globalStateMessage"
                @ready="blockBecameReady"
                @run="run"
                @stop="stop"
            />

            <DataBlock
                v-else-if="block.type == 'DATA'"
                :appID="appID"
                :blockID="block.uuid"
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
                        <div id="message" v-html="global.compilerState.globalStateMessage"></div>
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
