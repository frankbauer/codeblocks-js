`
<template>
    <div :class="`codeblock block-${typeName}`">
        <textarea
            ref="codeBoxRaw"
            style="display: none"
            readonly
            v-model="block.content"
            :name="`${namePrefix}block[${block.parentID}][${block.id}]`"
            :id="`teQ${block.parentID}B${block.id}`"
            :data-question="block.parentID"
            :data-blocktype="iliasTypeNr"
            :is-editmode="editMode"
            class="accqstXmlInput noRTEditor"
        />

        <code-mirror
            ref="codeBox"
            v-model="code"
            :class="`accqstXmlInput noRTEditor codebox ${boxClass}`"
            :name="`${namePrefix}block[${block.parentID}][${block.id}]`"
            :id="`teQ${block.parentID}B${block.id}`"
            :data-question="block.parentID"
            :theme="block.themeForCodeBlock"
            :language="mode"
            :first-line="block.firstLine"
            :read-only="editorReadOnly"
            :errors="block.errors"
            :max-lines="totalLines"
            @update:model-value="onCodeChangeDefered"
            @focus="onCodeFocus"
            @ready="onCodeReady"
        />

        <div v-if="editMode && hasAlternativeContent">
            <div class="q-mt-lg text-subtitle2 q-pb-xs">{{ $t('CodeBlock.Initial_Content') }}</div>
            <textarea
                ref="altBoxRaw"
                style="display: block"
                readonly
                v-model="block.alternativeContent"
                :name="`${namePrefix}alt_block[${block.parentID}][${block.id}]`"
                class="accqstXmlInput noRTEditor"
            />
            <code-mirror
                ref="altBox"
                v-model="altCode"
                :class="`accqstXmlInput noRTEditor ${boxClass}`"
                :name="`${namePrefix}alt_block[${block.parentID}][${block.id}]`"
                :theme="block.themeForCodeBlock"
                :language="mode"
                :read-only="editorReadOnly"
                @update:model-value="onAltCodeChangeDefered"
                @ready="onAltCodeReady"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import CodeMirror from '@/components/CodeMirror.vue'
import {
    DEFAULT_EDITABLE_BLOCK_PROPS,
    type EditableBlockProps,
    useBasicBlockMounting,
} from '@/composables/basicBlock'
import type { IRandomizerSet } from '@/lib/ICodeBlocks'
import type { BlockData } from '@/lib/codeBlocksManager'
import { globalState } from '@/lib/globalState'
import { type ITagReplaceAction, tagger } from '@/plugins/tagger'
import { type BlockStorageType, useBlockStorage } from '@/storage/blockStorage'
import { StateEffect } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import {
    computed,
    getCurrentInstance,
    nextTick,
    onBeforeUnmount,
    onMounted,
    ref,
    toRefs,
    watch
} from 'vue'

// Props definition
interface Props extends EditableBlockProps {
    namePrefix?: string
    emitWhenTypingInViewMode?: boolean
    readonly?: boolean
    mode?: string
    tagSet?: IRandomizerSet | undefined
}

const props = withDefaults(defineProps<Props>(), {
    ...DEFAULT_EDITABLE_BLOCK_PROPS,
    namePrefix: '',
    emitWhenTypingInViewMode: false,
    readonly: false,
    mode: 'text/javascript',
    tagSet: undefined,
})

// Emits
const emit = defineEmits<{
    (e: 'code-changed-in-edit-mode'): void
    (e: 'code-changed-in-view-mode'): void
    (e: 'build'): void
    (e: 'ready', block: BlockData): void
}>()

// Vue instance
const instance = getCurrentInstance()
const t = instance?.proxy?.$root?.$t

// Block storage and mounting
const blockStorage: BlockStorageType = useBlockStorage(props.appID)
const block = blockStorage.getBlock(props.blockID)
const { whenBlockIsReady, whenBlockIsDestroyed } = useBasicBlockMounting(
    true,
    props,
    blockStorage,
    (block) => emit('ready', block)
)

// Destructure props
const { namePrefix, emitWhenTypingInViewMode, readonly, editMode, visibleLines, mode, tagSet } =
    toRefs(props)

// Refs
const codeBox = ref<InstanceType<typeof CodeMirror> | null>(null)
const altBox = ref<InstanceType<typeof CodeMirror> | null>(null)
const codeBoxRaw = ref<HTMLTextAreaElement | null>(null)
const altBoxRaw = ref<HTMLTextAreaElement | null>(null)

// Update timers
let codeUpdateTimer: ReturnType<typeof setTimeout> | null = null
let altCodeUpdateTimer: ReturnType<typeof setTimeout> | null = null
let continuousCodeUpdateTimer: ReturnType<typeof setTimeout> | null = null
const codeUpdateStartTime = ref<number>(0)
const altCodeUpdateStartTime = ref<number>(0)
const codeNeedsTagUpdate = ref<boolean>(true)

// Computed properties
const totalLines = computed(() => blockStorage.appInfo.value.totalLines())

const hasAlternativeContent = computed(
    () => block.value.hasAlternativeContent && typeName.value === 'block'
)

const boxClass = computed(() => {
    const classes: string[] = []
    if (block.value.hidden && !editMode.value) {
        classes.push('hiddenBox')
    }
    if (block.value.readonly || readonly.value) {
        classes.push('readonlyBox')
    }
    if (block.value.static) {
        classes.push('staticBox')
    }
    return classes.join(' ')
})

const typeName = computed(() => {
    let type = block.value.type.toLowerCase()
    if (block.value.hidden) {
        type += '-hidden'
    }
    if (block.value.static) {
        type += '-static'
    }
    return type
})

const iliasTypeNr = computed(() => {
    const types = {
        text: 0,
        'block-static': 1,
        block: 2,
        'block-hidden': 3,
        playground: 4,
        blockly: 5,
        repl: 6,
        data: 7,
    }
    return types[typeName.value] ?? -1
})

const editorReadOnly = computed(
    () =>
        !editMode.value &&
        (block.value.readonly || block.value.static || block.value.hidden || readonly.value)
)

const code = computed({
    get: () => (editMode.value ? block.value.content : block.value.actualContent()),
    set: (newCode) => (block.value.content = newCode),
})

const altCode = computed({
    get: () => block.value.alternativeContent ?? '',
    set: (newCode) => {
        block.value.alternativeContent = newCode
    }
})

// Methods
function posToOffset(view: EditorView, pos: { line: number; ch: number }): number {
    return view.state.doc.line(pos.line + 1).from + pos.ch
}

function updateTagDisplay() {
    if (
        !editMode.value ||
        !block.value?.appSettings?.randomizer?.active ||
        !codeNeedsTagUpdate.value
    ) {
        return
    }

    codeNeedsTagUpdate.value = false

    if (codeBox.value?.view) {
        const markers = tagger.getMarkers(block.value.content)
        const markerEffects = markers.map(m => 
            StateEffect.define<{
                from: number;
                to: number;
                className: string;
                title: string;
            }>().of({
                from: posToOffset(codeBox.value!.view!, m.start),
                to: posToOffset(codeBox.value!.view!, m.end),
                className: tagger.className[m.type],
                title: m.name
            })
        )
        
        codeBox.value.view.dispatch({
            effects: markerEffects
        })

        nextTick(() => {
            if (codeBox.value?.view) {
                tagger.hookClick(codeBox.value.view.dom, block.value.scopeUUID)
            }
        })
    }

    if (altBox.value?.view) {
        const markers = tagger.getMarkers(block.value.alternativeContent ?? '')
        const markerEffects = markers.map(m => 
            StateEffect.define<{
                from: number;
                to: number;
                className: string;
                title: string;
            }>().of({
                from: posToOffset(altBox.value!.view!, m.start),
                to: posToOffset(altBox.value!.view!, m.end),
                className: tagger.className[m.type],
                title: m.name
            })
        )

        altBox.value.view.dispatch({
            effects: markerEffects
        })

        nextTick(() => {
            if (altBox.value?.view) {
                tagger.hookClick(altBox.value.view.dom, block.value.scopeUUID)
            }
        })
    }
}

function onCodeChangeDefered(newCode: string) {
    if (!editMode.value) {
        onCodeChange(newCode)
        return
    }

    const now = Date.now()

    if (codeUpdateTimer) {
        clearTimeout(codeUpdateTimer)
    } else {
        codeUpdateStartTime.value = now
    }

    if (now - codeUpdateStartTime.value > globalState.VUE_APP_CODE_BLOCK_MAX_TIMEOUT) {
        onCodeChange(newCode)
        return
    }

    codeUpdateTimer = setTimeout(() => {
        codeUpdateTimer = null
        onCodeChange(newCode)
    }, globalState.VUE_APP_CODE_BLOCK_TIMEOUT)
}

function onCodeChange(newCode: string) {
    if (!codeBox.value) {
        return
    }

    block.value.lineCountHint = codeBox.value.lineCount()
    block.value.content = newCode
    updateTagDisplay()

    if (editMode.value) {
        emit('code-changed-in-edit-mode')
    } else if (emitWhenTypingInViewMode.value) {
        if (continuousCodeUpdateTimer) {
            clearTimeout(continuousCodeUpdateTimer)
        }
        continuousCodeUpdateTimer = setTimeout(() => {
            emit('code-changed-in-view-mode')
        }, globalState.VUE_APP_CODE_BLOCK_TIMEOUT)
    }
}

function onAltCodeChangeDefered(newCode: string) {
    const now = Date.now()

    if (altCodeUpdateTimer) {
        clearTimeout(altCodeUpdateTimer)
    } else {
        altCodeUpdateStartTime.value = now
    }

    if (now - altCodeUpdateStartTime.value > globalState.VUE_APP_CODE_BLOCK_MAX_TIMEOUT) {
        onAltCodeChange(newCode)
        return
    }

    altCodeUpdateTimer = setTimeout(() => {
        altCodeUpdateTimer = null
        onAltCodeChange(newCode)
    }, globalState.VUE_APP_CODE_BLOCK_TIMEOUT)
}

function onAltCodeChange(newCode: string) {
    if (altBoxRaw.value) {
        altBoxRaw.value.value = newCode
    }
    block.value.alternativeContent = newCode
    updateTagDisplay()
}

function onCodeReady({ view, container }: { view: EditorView; container: HTMLElement }) {
    if (!container) {
        return
    }

    const textareas = container.querySelectorAll('textarea[name]')
    textareas.forEach((el) => {
        if (el instanceof HTMLTextAreaElement) {
            el.className = 'accqstXmlInput noRTEditor'
            el.id = container.id
            el.value = block.value.content
            el.setAttribute('data-question', `${block.value.parentID}`)
            el.setAttribute('data-blocktype', `${iliasTypeNr.value}`)
            if (editMode.value) {
                el.setAttribute('is-editmode', `${editMode.value}`)
            }
        }
    })

    onCodeChange(block.value.content)
    whenBlockIsReady()
}

function onAltCodeReady() {
    nextTick(() => {
        onAltCodeChange(block.value.alternativeContent ?? '')
        updateTagDisplay()
    })
}

function onCodeFocus() {
    // Handle focus if needed
}

function replaceTemplateTags(action: ITagReplaceAction) {
    if (!editMode.value || action.scopeUUID !== block.value.scopeUUID) {
        return
    }

    block.value.content = tagger.replaceTemplateTagInString(
        block.value.content,
        action.name,
        action.newValue
    )
}

// Lifecycle hooks
onMounted(() => {
    if (editMode.value && codeBox.value?.view) {
        const buildHandler = () => emit('build')

        // Add keybindings for build command
        // codeBox.value.view.dispatch({
        //     effects: [
        //         { key: 'Cmd-B', run: buildHandler },
        //         { key: 'Ctrl-B', run: buildHandler },
        //     ],
        // })
    }

    tagger.onReplaceTemplateTag(replaceTemplateTags)
    codeNeedsTagUpdate.value = true
    updateTagDisplay()
})

onBeforeUnmount(() => {
    tagger.offReplaceTemplateTag(replaceTemplateTags)

    if (codeUpdateTimer) {
        clearTimeout(codeUpdateTimer)
    }
    if (altCodeUpdateTimer) {
        clearTimeout(altCodeUpdateTimer)
    }
    if (continuousCodeUpdateTimer) {
        clearTimeout(continuousCodeUpdateTimer)
    }
})

// Watch
watch(
    () => visibleLines.value,
    () => {
        if (!codeBox.value?.view) {
            return
        }

        const height =
            visibleLines.value === 'auto' || block.value.static
                ? 'auto'
                : `${Math.round(20 * Math.max(1, visibleLines.value)) + 9}px`

        codeBox.value.view.dom.style.height = height
        if (altBox.value?.view) {
            altBox.value.view.dom.style.height = height
        }
    }
)

// Expose
defineExpose({
    view: computed(() => codeBox.value?.view),
    lineCount: () => codeBox.value?.lineCount() ?? 0,
})
</script>

<style scoped lang="sass">
.hiddenBox
    display: none !important

.staticBox
    opacity: 0.8
    filter: grayscale(20%)

.codeblock
    width: 100%
</style>
`
