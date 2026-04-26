<template>
    <div class="tw-flex">
        <div class="tw-w-full tw-md:tw-w-1/2">
            <CodeBlock
                :appID="appID"
                :blockID="blockID"
                :block="block"
                :theme="DEFAULT_EDITOR_THEME"
                :mode="'text/html'"
                :visibleLines="'auto'"
                :editMode="editMode"
                :muteReadyState="true"
                class="plain accqstXmlInput noRTEditor tw-mt-5"
            />
        </div>
        <div class="tw-w-full tw-md:tw-w-1/2 tw-pl-4">
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

interface Props {
    value: string
    name: string
    scopeUUID: string
    editMode: boolean
    language: string
    appID: number
    blockID: string
    block: any // Assuming block type from blockStorage
}

const props = withDefaults(defineProps<Props>(), {
    value: '',
    name: '',
    scopeUUID: '',
    editMode: false,
    language: 'javascript',
    appID: 0,
    blockID: '',
    block: null,
})

function replaceTemplateTags(o: ITagReplaceAction) {
    if (!props.editMode) {
        return
    }
    if (o.scopeUUID != props.scopeUUID) {
        return
    }
    props.block.value.content = tagger.replaceTemplateTagInString(
        props.block.value.content,
        o.name,
        o.newValue
    )
}

const preview = computed(() => props.block?.value?.content || props.value)

onMounted(() => {
    tagger.onReplaceTemplateTag(replaceTemplateTags)
})

onBeforeUnmount(() => {
    tagger.offReplaceTemplateTag(replaceTemplateTags)
})
</script>
