<script lang="ts" setup>
import CodeBlock from '@/components/CodeBlock.vue'
import CodeBlockContainer from '@/components/CodeBlockContainer.vue'
import CodeBlocksSettings from '@/components/CodeBlocksSettings.vue'
import CodePlayground from '@/components/CodePlayground.vue'
import CodeREPL from '@/components/CodeREPL.vue'
import DataBlock from '@/components/DataBlock.vue'
import SimpleText from '@/components/SimpleText.vue'
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
} from '@/composables/basicBlocks'
import compilerRegistry from '@/lib/CompilerRegistry'
import { CodeOutputTypes } from '@/lib/ICodeBlocks'
import { type BlockStorageType, useBlockStorage } from '@/storage/blockStorage'
import '@quasar/extras/material-icons/material-icons.css'
import { computed, ref, toRefs } from 'vue'
import { useCodeBlockEvents } from '@/composables/useCodeBlockEvents'
import { CodeSplit } from '@/composables/useCodeEditor'
import CButton from '@/components/ui/CButton.vue'
import { Play, Square } from 'lucide-vue-next'

const props = defineProps<CodeBlocksProperties>()
const { appID } = toRefs(props)
const blockStorage: BlockStorageType = useBlockStorage(appID.value)
const blockInfo = blockStorage.appInfo
const editMode = blockStorage.appInfo.value.editMode
const {
    outputHTML,
    output,
    sansoutput,
    hasOutput,
    continuousCompile,
    finalOutputObject,
    options,
    blocks,
    language,
    readonly,
    mimeType,
    isReady,
    canRun,
    activeTagSet,
    showGlobalMessages,
    outputElement,
    addonClass,
    backgroundColorClass,
    hasREPL,
    canStop,
    blockBecameReady,
    themeForBlock,
    blockById,
    onPlaygroundChangedOutput,
    stop,
    run,
    onViewCodeChange,
    onRunFinished,
    onRunFromPlayground,
    global,
} = codeBlockSetup(blockStorage, editMode, props.eventHub)

const codeSplit = computed<CodeSplit>(() => {
    const codeSplit: CodeSplit = {
        parts: [],
        partIndex: new Map<string, number>(),
    }
    for (let b of blocks.value) {
        if (b.hasCode) {
            const code: string = editMode ? b.content : b.actualContent()
            codeSplit.parts.push(code)
            codeSplit.partIndex.set(b.uuid, codeSplit.parts.length - 1)
        }
    }
    return codeSplit
})

// Replace the existing event handlers with the composable
const { onTypeChange, onVisibleLinesChange } = useCodeBlockEvents(blockById, editMode)

const blockIndentations = ref<Record<string, number>>({})

const onIndentationChange = (blockId: string, level: number) => {
    blockIndentations.value[blockId] = level
}

const getBaseIndentForBlock = (currentBlock: any): number => {
    const currentIndex = blocks.value.findIndex((b) => b.uuid === currentBlock.uuid)
    if (currentIndex <= 0) {
        return 0
    }

    for (let i = currentIndex - 1; i >= 0; i--) {
        const previousBlock = blocks.value[i]
        if (previousBlock.hasCode) {
            return blockIndentations.value[previousBlock.uuid] || 0
        }
    }

    return 0
}

const onPlacementChange = (nfo: IOnPlacementChangeInfo): void => {
    if (editMode) {
        let bl = blockById(nfo.id)
        if (bl === undefined) {
            return
        }
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
        if (bl === undefined) {
            return
        }
        bl.shouldAutoreset = nfo.shouldAutoreset
    }
}

const onReloadResources = (nfo: IOnReloadResourcesInfo): void => {
    if (editMode) {
        let bl = blockById(nfo.id)
        if (bl === undefined) {
            return
        }
        bl.shouldReloadResources = nfo.shouldReloadResources
    }
}

const onSetGenerateTemplate = (nfo: IOnGenerateTemplateInfo): void => {
    if (editMode) {
        let bl = blockById(nfo.id)
        if (bl === undefined) {
            return
        }
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
        blockInfo.value.uiTheme = nfo.ui
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
        if (bl === undefined) {
            return
        }
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
            :key="block.uuid"
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
                :base-indent="getBaseIndentForBlock(block)"
                :emitWhenTypingInViewMode="continuousCompile"
                :code-split="codeSplit"
                @ready="blockBecameReady"
                @build="run"
                @code-changed-in-view-mode="onViewCodeChange"
                @indentation-change="(level) => onIndentationChange(block.uuid, level)"
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
                <CButton
                    id="allow_run_button"
                    :loading="!isReady"
                    :disabled="!isReady"
                    @click="run"
                    :data-question="blockInfo.id"
                    class="tw-w-[190px] tw-rounded-none"
                    :icon="Play"
                    fill="white"
                >
                    {{ $t('CodeBlocks.run')
                    }}<span v-if="editMode" class="q-ml-xs">[{{ $t('CodeBlocks.run_key') }}]</span>
                </CButton>
                <div class="animated fadeIn"></div>
                <transition
                    appear
                    enter-active-class="animated fadeIn"
                    leave-active-class="animated fadeOut"
                >
                    <div class="q-pl-sm" v-show="canStop">
                        <CButton
                            id="cancel_button"
                            variant="destructive"
                            fill="white"
                            :icon="Square"
                            :data-question="blockInfo.id"
                            class="tw-rounded-none"
                            @click="stop"
                        >
                            {{ $t('CodeBlocks.stop') }}
                        </CButton>
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
