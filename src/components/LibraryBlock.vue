<template>
    <div v-if="editMode">
        <div
            class="tw-flex tw-justify-between tw-w-full tw-flex-nowrap tw-flex-row tw-items-center tw-content-center tw-mb-1"
        >
            <div class="tw-flex tw-items-center tw-flex-1">
                <div class="tw-ml-0 tw-transition-opacity tw-duration-250 group-hover:tw-opacity-0">
                    <TagIcon class="tw-w-4 tw-h-4 tw-text-muted-foreground tw-mr-1" />
                </div>
                <div class="tw-mr-4 inlined-input tw-mb-0 tw-flex">
                    <TooltipProvider>
                        <Tooltip :delay-duration="300">
                            <TooltipTrigger as-child>
                                <Input
                                    id="library-name-input"
                                    v-model="name"
                                    size="xs"
                                    class="tw-mb-0 tw-bg-white tw-pl-3"
                                    :placeholder="$t('LibraryBlock.Name')"
                                />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{{ $t('LibraryBlock.UsageTooltip', { name: name }) }}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>

            <div
                class="tw-inline-flex tw-w-fit -tw-space-x-px tw-rounded-md tw-shadow-xs rtl:tw-space-x-reverse"
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

        <div>
            <Alert
                v-if="hasDuplicateName"
                variant="destructive"
                class="tw-bg-orange-50 tw-border-orange-200 tw-py-2 tw-mb-2"
            >
                <div class="tw-flex tw-gap-2 tw-items-center">
                    <BookCopy class="tw-h-12 tw-w-12 tw-text-orange-500" />
                    <div class="tw-flex-1">
                        <AlertTitle class="tw-text-xs tw-font-medium tw-mb-0 tw-text-orange-600">
                            {{ $t('LibraryBlock.DuplicateNameTitle') }}
                        </AlertTitle>
                        <AlertDescription class="tw-text-xs tw-mt-1 tw-text-orange-500">
                            {{ $t('LibraryBlock.DuplicateNameMessage', { name: name }) }}
                        </AlertDescription>
                    </div>
                </div>
            </Alert>

            <Alert
                v-if="!hasModernPlayground"
                variant="destructive"
                class="tw-bg-orange-50 tw-border-orange-200 tw-py-2 tw-mb-2"
            >
                <div class="tw-flex tw-gap-2 tw-items-center">
                    <ZapOff class="tw-h-12 tw-w-12 tw-text-orange-500" />
                    <div class="tw-flex-1">
                        <AlertTitle class="tw-text-xs tw-font-medium tw-mb-0 tw-text-orange-600">
                            {{ $t('LibraryBlock.InactiveTitle') }}
                        </AlertTitle>
                        <AlertDescription class="tw-text-xs tw-mt-1 tw-text-orange-500">
                            {{
                                $t('LibraryBlock.InactiveMessage', {
                                    version: $t('CodeBlockContainer.ScriptVersion_3'),
                                })
                            }}
                        </AlertDescription>
                    </div>
                </div>
            </Alert>

            <Alert
                v-if="hasErrors"
                variant="destructive"
                class="tw-bg-red-50 tw-border-red-200 tw-py-2 tw-mb-2"
            >
                <div class="tw-flex tw-gap-2 tw-items-center">
                    <AlertTriangle class="tw-h-12 tw-w-12 tw-text-red-500" />
                    <div class="tw-flex-1">
                        <AlertTitle class="tw-text-xs tw-font-medium tw-mb-0 tw-text-red-600">
                            {{ $t('LibraryBlock.ErrorTitle') }}
                        </AlertTitle>
                        <AlertDescription class="tw-text-xs tw-mt-1 tw-text-red-500">
                            <pre class="tw-whitespace-pre-wrap tw-font-mono tw-text-[10px]">{{
                                errorDialogMessage
                            }}</pre>
                        </AlertDescription>
                    </div>
                </div>
            </Alert>
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
    </div>
</template>

<script lang="ts" setup>
import CodeBlock from '@/components/CodeBlock.vue'
import {
    ref,
    computed,
    onMounted,
    onBeforeUnmount,
    getCurrentInstance,
    ComputedRef,
    onBeforeMount,
    Ref,
} from 'vue'
import { CodeExpansionType, KnownBlockTypes } from '@/lib/ICodeBlocks'

import {
    DEFAULT_EDITABLE_BLOCK_PROPS,
    EditableBlockProps,
    useBasicBlockMounting,
} from '@/composables/basicBlock'
import { globalState } from '@/lib/globalState'
import { EventHubType } from '@/composables/globalEvents'
import { BlockStorageType, useBlockStorage } from '@/storage/blockStorage'
import { l } from '@/plugins/i18n'

import { Button } from '@/shadcn/ui/button'
import { Input } from '@/shadcn/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/shadcn/ui/alert'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shadcn/ui/tooltip'

import { Expand, Maximize, Shrink, AlertTriangle, ZapOff, BookCopy, TagIcon } from 'lucide-vue-next'
import { useSlideTransition } from '@/composables/useSlideTransition'
import { IPlaygroundBlockOptions } from './PlaygroundBlock.vue'

interface Props extends EditableBlockProps {
    namePrefix?: string
    eventHub: EventHubType
    tagSet?: IRandomizerSet | undefined
}

const props = withDefaults(defineProps<Props>(), {
    ...DEFAULT_EDITABLE_BLOCK_PROPS,
    namePrefix: '',
    tagSet: undefined,
})

const instance = getCurrentInstance()
const globalCodeBlock = globalState.appState

const { onBeforeEnter, onEnter, onAfterEnter, onBeforeLeave, onLeave, onAfterLeave } =
    useSlideTransition()

const emit = defineEmits(['ready'])

const blockStorage: BlockStorageType = useBlockStorage(props.appID)
const block = blockStorage.getBlock(props.blockID)
const { whenBlockIsReady } = useBasicBlockMounting(true, props, blockStorage, (block) =>
    emit('ready', block)
)

// Error state
const hasErrors: Ref<boolean> = ref(false)
const errorDialogMessage: Ref<string> = ref('')

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

const name = computed({
    get(): string {
        return block.value.name
    },
    set(newName: string) {
        block.value.name = newName
        if (block.value.obj && 'name' in block.value.obj) {
            ;(block.value.obj as any).name = newName
        }
    },
})

const hasDuplicateName = computed(() => {
    return blockStorage.appInfo.value.blocks.some(
        (b) =>
            b.uuid !== block.value.uuid &&
            (b.type === KnownBlockTypes.LIBRARY || b.type === KnownBlockTypes.DATA) &&
            b.name === block.value.name
    )
})

const hasModernPlayground = computed(() => {
    return blockStorage.appInfo.value.blocks.some(
        (b) => b.type === KnownBlockTypes.PLAYGROUND && parseInt(b.version) >= 102
    )
})

const visibleLinesNow = computed((): 'auto' | number => {
    if (isExpandedTiny.value) {
        return 2.4
    }
    if (isExpandedLarge.value) {
        return 33.4
    }
    return 'auto'
})
const isExpandedLarge = computed(() => block.value.codeExpanded === CodeExpansionType.LARGE)
const isExpandedTiny = computed(() => block.value.codeExpanded === CodeExpansionType.TINY)
const isExpandedAuto = computed(() => block.value.codeExpanded === CodeExpansionType.AUTO)

const setExpandedLarge = () => setExpanded(CodeExpansionType.LARGE)
const setExpandedTiny = () => setExpanded(CodeExpansionType.TINY)
const setExpandedAuto = () => setExpanded(CodeExpansionType.AUTO)

const setExpanded = (val: CodeExpansionType): void => {
    block.value.codeExpanded = val
    if (block.value.codeExpanded !== CodeExpansionType.TINY) {
        globalCodeBlock?.refreshAllCodeMirrors()
    }
}

function updateErrors(): boolean {
    block.value.errors = []
    if (block.value.obj === null) {
        hasErrors.value = false
        errorDialogMessage.value = ''
        return false
    }

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

    hasErrors.value = block.value.obj.err.length > 0
    if (hasErrors.value) {
        errorDialogMessage.value = block.value.obj.err.map((e) => e.msg).join('\n')
        block.value.needsCodeRebuild = true
        return true
    } else {
        errorDialogMessage.value = ''
        return false
    }
}

const onCodeChange = () => {
    if (props.editMode) {
        block.value.needsCodeRebuild = true
    }
}

onBeforeMount(() => {
    props.eventHub.on('render-diagnostics', updateErrors)
})

onMounted(() => {
    whenBlockIsReady()
    if (block.value && block.value.obj && block.value.obj.err.length > 0) {
        updateErrors()
    }
})

onBeforeUnmount(() => {
    props.eventHub.off('render-diagnostics', updateErrors)
})
</script>

<style lang="sass" scoped>
.inlined-input
    display: inline-block

.slide-enter-active, .slide-leave-active
    transition: all 0.3s

.slide-enter-from, .slide-leave-to
    transform: translateX(-10px)
    opacity: 0
</style>
