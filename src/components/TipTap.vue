<template>
    <div class="row tw-m-0 tw-p-0">
        <div class="col-xs-12 col-md-6 tw-px-sm">        
            <CodeBlock
                :appID="appID"
                :blockID="blockID"
                :block="block"
                :theme="DEFAULT_EDITOR_THEME"
                mode="text/html"
                visibleLines="auto"
                :editMode="editMode"
                :muteReadyState="true"
                class="plain accqstXmlInput noRTEditor tw-mt-5"
            />
        </div>
        <div class="col-xs-12 col-md-6 q-px-sm">
            <div class="q-field__label no-pointer-events ellipsis text-caption wysiwyg">
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

<style lang="stylus" scoped>
.plain
    z-index: 2
    border-radius: 0px !important

.wysiwyg
    z-index: 50
</style>
