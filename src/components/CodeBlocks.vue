<script lang="ts" setup>
import CodeBlock from '@/components/CodeBlock.vue'
import CodeBlockContainer from '@/components/CodeBlockContainer.vue'
import CodeBlocksSettings from '@/components/CodeBlocksSettings.vue'
import CodePlayground from '@/components/CodePlayground.vue'
import DataBlock from '@/components/DataBlock.vue'
import LibraryBlock from '@/components/LibraryBlock.vue'
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
import { computed, nextTick, ref, toRefs, watch } from 'vue'
import { useStorage, useIntersectionObserver, useResizeObserver } from '@vueuse/core'
import { useCodeBlockEvents } from '@/composables/useCodeBlockEvents'
import { CodeSplit } from '@/composables/useCodeEditor'
import CButton from '@/components/ui/CButton.vue'
import { Alert, AlertDescription, AlertTitle } from '@/shadcn/ui/alert'
import { AlertCircle, CopyPlus, Pin, Play, Square, Trash2 } from 'lucide-vue-next'
import { Button } from '@/shadcn/ui/button'
import { Switch } from '@/shadcn/ui/switch'
import { useSlideTransition } from '@/composables/useSlideTransition'
import { KnownBlockTypes } from '@/lib/ICodeBlocks'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/shadcn/ui/dialog'
import { l } from '@/plugins/i18n'
import { IListItemData } from '@/lib/ICompilerRegistry'

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
    error,
    canRun,
    activeTagSet,
    showGlobalMessages,
    outputElement,
    addonClass,
    backgroundColorClass,
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
    resetOutput,
} = codeBlockSetup(blockStorage, editMode, props.eventHub)

const { onBeforeEnter, onEnter, onAfterEnter, onBeforeLeave, onLeave, onAfterLeave } =
    useSlideTransition()

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

const onEmitASTChange = (v: boolean): void => {
    if (editMode) {
        blockInfo.value.emitAST = v
    }
}

const onExpandAll = (): void => {
    blockInfo.value.blocks.forEach((b) => (b.expanded = true))
    global.value.appState.refreshAllCodeMirrors()
}

const onCollapseAll = (): void => {
    blockInfo.value.blocks.forEach((b) => (b.expanded = false))
    global.value.appState.refreshAllCodeMirrors()
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

const addDialogOpen = ref(false)
const pendingInsertPosition = ref<number | null>(null)

const blockTypeChoices = computed((): IListItemData[] => [
    { label: l('CodeBlockContainer.Canvas'), value: KnownBlockTypes.PLAYGROUND },
    { label: l('CodeBlockContainer.Library'), value: KnownBlockTypes.LIBRARY },
    { label: l('CodeBlockContainer.DataBlock'), value: KnownBlockTypes.DATA },
    { label: l('CodeBlockContainer.Text'), value: KnownBlockTypes.TEXT },
    { label: l('CodeBlockContainer.Hidden'), value: KnownBlockTypes.BLOCKHIDDEN },
    { label: l('CodeBlockContainer.Static'), value: KnownBlockTypes.BLOCKSTATIC },
    { label: l('CodeBlockContainer.Block'), value: KnownBlockTypes.BLOCK },
])

const addNewBlock = (): void => {
    if (editMode) {
        pendingInsertPosition.value = null
        addDialogOpen.value = true
    }
}

const onAddAbove = (payload: { type: KnownBlockTypes; id: number }): void => {
    if (editMode) {
        blockInfo.value.insertBlockAt(payload.id, payload.type)
    }
}

const onAddBelow = (payload: { type: KnownBlockTypes; id: number }): void => {
    if (editMode) {
        blockInfo.value.insertBlockAt(payload.id + 1, payload.type)
    }
}

const isRunnerSticky = useStorage('codeblocks:runner-sticky', false)
const isStuck = ref(false)
const stickySentinelRef = ref<HTMLElement | null>(null)

useIntersectionObserver(
    stickySentinelRef,
    ([entry]) => {
        if (!isRunnerSticky.value) {
            isStuck.value = false
            return
        }
        // Sentinel is below the viewport when runner is stuck
        isStuck.value = !entry.isIntersecting && entry.boundingClientRect.top > 0
    },
    { threshold: 0 }
)

watch(isRunnerSticky, (val) => {
    if (!val) {
        isStuck.value = false
    }
})

const confirmAddBlock = (type: KnownBlockTypes): void => {
    if (!editMode) {
        return
    }
    if (pendingInsertPosition.value !== null) {
        blockInfo.value.insertBlockAt(pendingInsertPosition.value, type)
    } else {
        blockInfo.value.addNewBlock(type)
    }
    addDialogOpen.value = false
}

// --- Stale Output Caching ---
const cachedOutputHTML = ref('')
const isShowingStale = ref(false)
const justUpdated = ref(false)

// 1. Wrap the main run function to catch the state BEFORE it wipes
const handleRun = () => {
    if (hasOutput.value) {
        cachedOutputHTML.value = outputHTML.value
        isShowingStale.value = true
    }
    run()
}

// 2. Wrap the playground run just in case it shares the same output box
const handlePlaygroundRun = (...args: Parameters<typeof onRunFromPlayground>) => {
    if (hasOutput.value) {
        cachedOutputHTML.value = outputHTML.value
        isShowingStale.value = true
    }
    onRunFromPlayground(...args)
}

// 3. We only need the watcher to know when to LIFT the blur
watch(isReady, (ready) => {
    if (ready) {
        isShowingStale.value = false

        // Trigger a flash effect when new output arrives
        if (hasOutput.value) {
            justUpdated.value = true
            setTimeout(() => {
                justUpdated.value = false
            }, 800) // Match this to the CSS animation duration
        }
    }
})

// --- Runner Context-Aware Scroll Fix ---
const runnerRef = ref<HTMLElement | null>(null)
const contentEndRef = ref<HTMLElement | null>(null)

const getScrollParent = (node: HTMLElement | null): HTMLElement | Window => {
    if (!node) {
        return window
    }
    let parent = node.parentElement
    while (parent) {
        const style = window.getComputedStyle(parent)
        if (/(auto|scroll)/.test(style.overflowY)) {
            return parent
        }
        parent = parent.parentElement
    }
    return window
}

let previousRunnerHeight = 0
let wasAtBottom = false

// Snapshot the scroll state right as the run begins
watch(isReady, (ready) => {
    if (!ready && contentEndRef.value) {
        const rect = contentEndRef.value.getBoundingClientRect()
        const scroller = getScrollParent(runnerRef.value)
        // Check if the bottom of the code is currently in the viewport (with a 50px buffer for safety)
        if (scroller === window) {
            wasAtBottom = rect.top <= window.innerHeight + 50
        } else {
            const scrollerRect = (scroller as HTMLElement).getBoundingClientRect()
            wasAtBottom = rect.top <= scrollerRect.bottom + 50
        }
    }
})

useResizeObserver(runnerRef, (entries) => {
    const entry = entries[0]
    if (!entry) {
        return
    }

    const currentHeight = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height
    const delta = currentHeight - previousRunnerHeight

    // Ignore initial setup
    if (previousRunnerHeight === 0) {
        previousRunnerHeight = currentHeight
        return
    }

    previousRunnerHeight = currentHeight

    // We only need to auto-scroll if the panel is expanding.
    // If it shrinks (clearing output), let it collapse naturally.
    if (delta <= 0 || !contentEndRef.value) {
        return
    }

    const scroller = getScrollParent(runnerRef.value)
    const rect = contentEndRef.value.getBoundingClientRect()

    let isBottomVisible = false
    if (scroller === window) {
        isBottomVisible = rect.top <= window.innerHeight + 50
    } else {
        const scrollerRect = (scroller as HTMLElement).getBoundingClientRect()
        isBottomVisible = rect.top <= scrollerRect.bottom + 50
    }

    // Only apply the scroll compensation if they are actively looking at the bottom,
    // OR if they were looking at the bottom right before clicking run.
    if (isBottomVisible || wasAtBottom) {
        if (scroller === window) {
            window.scrollBy({ top: delta, behavior: 'auto' })
        } else {
            ;(scroller as HTMLElement).scrollTop += delta
        }
    }
})
</script>

<template>
    <div
        :class="`codeblocks ${addonClass}  ${backgroundColorClass} tw-mx-2 tw-mb-4`"
        :data-question="blockInfo.id"
        :uuid="blockInfo.uuid"
    >
        <Alert variant="destructive" v-if="error" class="tw-mb-4">
            <AlertCircle class="tw-h-4 tw-w-4" />
            <AlertTitle>{{ $t('CodeBlocks.error') }}</AlertTitle>
            <AlertDescription>
                {{ error }}
            </AlertDescription>
        </Alert>
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
            @emit-ast-change="onEmitASTChange"
            @expand-all="onExpandAll"
            @collapse-all="onCollapseAll"
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
            @add-above="onAddAbove"
            @add-below="onAddBelow"
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
                :code-split="codeSplit"
                @ready="blockBecameReady"
                @build="handleRun"
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
                @run="handlePlaygroundRun"
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
            <LibraryBlock
                v-else-if="block.type == 'LIBRARY'"
                :appID="appID"
                :blockID="block.uuid"
                :editMode="editMode"
                :theme="themeForBlock(block)"
                @ready="blockBecameReady"
                :eventHub="eventHub"
            />
        </CodeBlockContainer>

        <div class="tw-flex tw-justify-center tw-mt-2 tw-mb-4" v-if="editMode">
            <Button @click="addNewBlock">
                {{ $t('CodeBlocks.AddBlock') }}
                <CopyPlus class="tw-ml-2 tw-h-4 tw-w-4" />
            </Button>
        </div>

        <Dialog v-model:open="addDialogOpen">
            <DialogContent class="tw-max-w-sm">
                <DialogHeader>
                    <DialogTitle>{{ $t('CodeBlocks.SelectBlockType') }}</DialogTitle>
                    <DialogDescription>{{
                        $t('CodeBlocks.SelectBlockTypeDesc')
                    }}</DialogDescription>
                </DialogHeader>
                <div class="tw-flex tw-flex-col tw-gap-2 tw-py-2">
                    <Button
                        v-for="choice in blockTypeChoices"
                        :key="choice.value"
                        variant="outline"
                        class="tw-justify-start"
                        @click="confirmAddBlock(choice.value)"
                        >{{ choice.label }}</Button
                    >
                </div>
            </DialogContent>
        </Dialog>

        <div
            ref="contentEndRef"
            class="tw-h-px tw-w-full tw-pointer-events-none"
            aria-hidden="true"
        />

        <div
            ref="runnerRef"
            :class="`runner tw-mt-4 ${editMode ? 'tw-pt-4 tw-mx-8' : ''} ${
                isRunnerSticky ? 'runner--sticky' : ''
            } ${isStuck ? 'runner--stuck' : ''}`"
            v-if="canRun"
            id="runContainer"
            :data-question="blockInfo.id"
        >
            <div
                class="runnerState tw-flex tw-items-center tw-gap-2"
                id="stateBox"
                :data-question="blockInfo.id"
            >
                <CButton
                    id="allow_run_button"
                    :loading="!isReady"
                    :disabled="!isReady"
                    @click="handleRun"
                    :data-question="blockInfo.id"
                    class="tw-w-[190px] tw-rounded-none tw-shrink-0"
                    :icon="Play"
                    fill="white"
                >
                    {{ $t('CodeBlocks.run')
                    }}<span v-if="editMode" class="tw-ml-1">[{{ $t('CodeBlocks.run_key') }}]</span>
                </CButton>
                <transition
                    appear
                    enter-active-class="animated fadeIn"
                    leave-active-class="animated fadeOut"
                >
                    <CButton
                        v-show="canStop"
                        id="cancel_button"
                        variant="destructive"
                        fill="white"
                        :icon="Square"
                        :data-question="blockInfo.id"
                        class="tw-rounded-none tw-shrink-0"
                        @click="stop"
                    >
                        {{ $t('CodeBlocks.stop') }}
                    </CButton>
                </transition>
                <transition
                    appear
                    enter-active-class="animated fadeIn"
                    leave-active-class="animated fadeOut"
                >
                    <div class="globalState tw-grow tw-truncate" v-show="showGlobalMessages">
                        <div id="message" v-html="global.compilerState.globalStateMessage"></div>
                    </div>
                </transition>
                <div
                    class="tw-ml-auto tw-flex tw-items-center tw-gap-1 tw-shrink-0"
                    id="makeRunStick"
                >
                    <button
                        v-if="hasOutput"
                        class="tw-flex tw-items-center tw-justify-center tw-rounded tw-p-1 tw-text-muted-foreground tw-transition-colors hover:tw-text-destructive hover:tw-bg-destructive/10"
                        :title="$t('CodeBlocks.clear_output')"
                        @click="resetOutput"
                    >
                        <Trash2 class="tw-h-4 tw-w-4" />
                    </button>
                    <Switch
                        v-model="isRunnerSticky"
                        class="stickySwitch"
                        :title="
                            isRunnerSticky
                                ? $t('CodeBlocks.unpin_runner')
                                : $t('CodeBlocks.pin_runner')
                        "
                    >
                        <template #thumb>
                            <Pin
                                class="tw-h-2.5 tw-w-2.5 tw-transition-colors"
                                :class="
                                    isRunnerSticky ? 'tw-text-primary' : 'tw-text-muted-foreground'
                                "
                            />
                        </template>
                    </Switch>
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
                <pre
                    :id="`${blockInfo.id}Output`"
                    ref="outputElement"
                    :class="[
                        'output tw-transition-all tw-duration-300',
                        { 'is-flashing': justUpdated && !isShowingStale },
                    ]"
                    v-if="hasOutput || isShowingStale"
                ><div id='out' v-html='isShowingStale ? cachedOutputHTML : outputHTML' :class="[
                'outtext',
                { 'tw-opacity-40 tw-pointer-events-none tw-select-none tw-blur-sm': isShowingStale },            
          ]"></div></pre>
            </Transition>
        </div>
        <div ref="stickySentinelRef" class="tw-h-px tw-pointer-events-none" aria-hidden="true" />
    </div>
</template>

<style lang="sass">

div.codeblocks.editmode
    box-shadow: 3px 3px 6px rgba(0, 0, 0, 0.1)
    border-radius: 5px
    // background-repeat: repeat
    // background-image: linear-gradient(45deg, #ffffff 25%, #ebf2f5 25%, #ebf2f5 50%, #ffffff 50%, #ffffff 75%, #ebf2f5 75%, #ebf2f5 100%)
    // background-size: 56.57px 56.57px

div.codeblocks
    height: fit-content
    margin: 4px
    padding: 8px

    .block
        padding: 0px
        margin: 0px

div.runner
    margin-bottom: 8px

    &.runner--sticky
        position: sticky
        bottom: 0
        z-index: 50
        background: transparent
        border-radius: var(--radius, 6px) var(--radius, 6px) var(--radius, 6px) var(--radius, 6px)
        transition: border-radius 0.3s ease
        backdrop-filter: blur(16px) brightness(0.95) saturate(1.2)
        border: 1px solid rgba(255,255,255,0.8)
        padding: 6px 8px 6px
        margin: 0 !important

        &.runner--stuck
            border-radius: var(--radius, 6px) var(--radius, 6px) 0 0
            border-bottom: none
        .output
            max-height: 35vh
            overflow-y: auto
            margin-bottom: 0

    .stickySwitch
        span[data-state]
            display: flex !important
            align-items: center
            justify-content: center

    .runnerState
        margin: 0px !important
        padding: 0px !important

        button
            margin: 0px !important

        .globalState
            color: gray
            padding-left: 4px
            padding-right: 4px
            font-size: 0.875rem

    .output
        display: block
        font-family: monospace
        border: 1px solid #ccc
        border-radius: 0px
        background-color: white
        margin: 6px 0 0
        line-height: 1.42857143
        color: #333333
        white-space: pre-wrap
        word-break: break-all
        word-wrap: break-word
        .outtext
            padding: 9.5px

// Add this anywhere in your style block
@keyframes output-update-flash
    0%
        background-color: rgba(59, 130, 246, 0.1)
    100%
        background-color: white // Your standard output background color

@keyframes output-update-text-flash
    0%
        opacity: 0.1
        filter: brightness(1000%) contrast(650%)
    100%
        opacity: 1
        filter: brightness(100%)

.output.is-flashing
    animation: output-update-flash 0.4s ease-out
    .outtext
        animation: output-update-text-flash 0.4s ease-out
</style>
