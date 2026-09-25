<template>
    <div :class="containerClass">
        <div :class="editorPaneClass">
            <CodeBlock
                :appID="appID"
                :blockID="blockID"
                :block="block"
                :theme="DEFAULT_EDITOR_THEME"
                :mode="'text/html'"
                :visibleLines="'auto'"
                :editMode="editMode"
                :readonly="readonly"
                :muteReadyState="true"
                class="plain accqstXmlInput noRTEditor tw-mt-5"
            />
        </div>
        <div :class="previewPaneClass">
            <div
                class="tw-text-sm tw-font-medium tw-pointer-events-none tw-truncate tw-z-50 tw-text-muted-foreground"
            >
                Preview
            </div>
            <div v-html="preview" v-highlight="language" v-tagged="scopeUUID"></div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { ITagReplaceAction, tagger } from '@/plugins/tagger'
import CodeBlock from './CodeBlock.vue'
import { DEFAULT_EDITOR_THEME } from '@/plugins/codemirror/editorThemes'
import { BlockData } from '@/lib/codeBlocksManager'

interface Props {
    value: string
    name: string
    scopeUUID: string
    editMode: boolean
    readonly?: boolean
    language: string
    appID: number
    blockID: string
    block: BlockData | null
    layout?: 'auto' | 'vertical' | 'horizontal'
}

const props = withDefaults(defineProps<Props>(), {
    value: '',
    name: '',
    scopeUUID: '',
    editMode: false,
    readonly: false,
    language: 'javascript',
    appID: 0,
    blockID: '',
    block: null,
    layout: 'auto',
})

// 'vertical' = editor/preview side by side, 'horizontal' = editor/preview stacked top/bottom,
// 'auto' = side by side once there is enough width, stacked otherwise (current default behaviour).
const containerClass = computed(() => {
    if (props.layout === 'vertical') {
        return 'tw-flex tw-flex-row'
    }
    if (props.layout === 'horizontal') {
        return 'tw-flex tw-flex-col'
    }
    return 'tw-flex tw-flex-col md:tw-flex-row'
})
const editorPaneClass = computed(() => {
    if (props.layout === 'vertical') {
        return 'tw-w-1/2 tw-min-w-0'
    }
    if (props.layout === 'horizontal') {
        return 'tw-w-full tw-min-w-0'
    }
    return 'tw-w-full md:tw-w-1/2 tw-min-w-0'
})
const previewPaneClass = computed(() => {
    if (props.layout === 'vertical') {
        return 'tw-w-1/2 tw-min-w-0 tw-pl-4'
    }
    if (props.layout === 'horizontal') {
        return 'tw-w-full tw-min-w-0 tw-pl-0'
    }
    return 'tw-w-full md:tw-w-1/2 tw-min-w-0 tw-pl-0 md:tw-pl-4'
})

function replaceTemplateTags(o: ITagReplaceAction) {
    if (!props.editMode) {
        return
    }
    if (o.scopeUUID != props.scopeUUID || props.block === null) {
        return
    }
    props.block.content = tagger.replaceTemplateTagInString(props.block.content, o.name, o.newValue)
}

const preview = computed(() => props.block?.content || props.value)

onMounted(() => {
    tagger.onReplaceTemplateTag(replaceTemplateTags)
})

onBeforeUnmount(() => {
    tagger.offReplaceTemplateTag(replaceTemplateTags)
})
</script>
