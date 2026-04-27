<template>
    <div v-if="editMode">
        <div
            class="tw-flex tw-justify-between tw-w-full tw-flex-nowrap tw-flex-row tw-items-end tw-content-end tw-mb-1"
        >
            <div class="tw-flex tw-items-end">
                <div class="tw-mr-4 inlined-input tw-mb-0 tw-flex">
                    <label for="library-name-input" class="tw-text-sm tw-font-medium tw-mr-2"
                        >{{ $t('LibraryBlock.Name') }}</label
                    >
                    <Input id="library-name-input" v-model="name" size="xs" class="tw-mb-0" />
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

        <div class="tw-space-y-2 tw-mb-2">
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

import { Expand, Maximize, Shrink, AlertTriangle, ZapOff, BookCopy } from 'lucide-vue-next'
import { useSlideTransition } from '@/composables/useSlideTransition'
import { ICodePlaygroundOptions } from './CodePlayground.vue'

interface Props extends EditableBlockProps {
    namePrefix?: string
    eventHub: EventHubType
}

const props = withDefaults(defineProps<Props>(), {
    ...DEFAULT_EDITABLE_BLOCK_PROPS,
    namePrefix: '',
})

const instance = getCurrentInstance()
const globalCodeBlock = globalState.appState

const { onBeforeEnter, onEnter, onAfterEnter, onBeforeLeave, onLeave, onAfterLeave } =
    useSlideTransition()

const emit = defineEmits(['ready'])

const blockStorage: BlockStorageType = useBlockStorage(props.appID)
const block = blockStorage.getBlock(props.blockID)
const { whenBlockIsReady } = useBasicBlockMounting(
    true,
    props,
    blockStorage,
    (block) => emit('ready', block)
)

// Error state
const hasErrors: Ref<boolean> = ref(false)
const errorDialogMessage: Ref<string> = ref('')

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
            b.type === KnownBlockTypes.LIBRARY &&
            b.name === block.value.name
    )
})

const hasModernPlayground = computed(() => {
    return blockStorage.appInfo.value.blocks.some(
        (b) => b.type === KnownBlockTypes.PLAYGROUND && parseInt(b.version) >= 102
    )
})

const visibleLinesNow = computed((): 'auto' | number => {
    if (isExpandedTiny.value) return 2.4
    if (isExpandedLarge.value) return 33.4
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

let needsCodeRebuild: boolean = false

const onCodeChange = () => {
    if (props.editMode) {
        needsCodeRebuild = true
    }
}

function resetBeforeRun(): void {
    if (props.editMode && needsCodeRebuild) {
        if (block.value.obj != null) {
            block.value.obj.rebuild(block.value.actualContent())
            if (block.value.obj.err && block.value.obj.err.length > 0) {
                errorDialogMessage.value = block.value.obj.err.map((e: any) => e.msg).join('\n')
                hasErrors.value = true
            } else {
                hasErrors.value = false
                errorDialogMessage.value = ''
            }
        }
        needsCodeRebuild = false
    }
}

onBeforeMount(() => {
    props.eventHub.on('before-run', resetBeforeRun)
})

onMounted(() => {
    whenBlockIsReady()
})

onBeforeUnmount(() => {
    props.eventHub.off('before-run', resetBeforeRun)
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
