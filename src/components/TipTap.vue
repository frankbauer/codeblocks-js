<template>
    <div class="row q-ma-0 q-pa-0">
        <div class="col-xs-12 col-md-6 q-px-sm">
            <q-input
                ref="editBox"
                type="textarea"
                autogrow
                filled
                :name="name"
                label="HTML Source"
                background-color="blue-grey darken-3"
                v-model="text"
                class="plain accqstXmlInput noRTEditor"
            >
            </q-input>
        </div>
        <div class="col-xs-12 col-md-6 q-px-sm">
            <div class="q-field__label no-pointer-events ellipsis text-caption wysiwyg">
                Preview
            </div>
            <div v-html="text" v-highlight="language" v-tagged="scopeUUID"></div>
        </div>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent, onBeforeUnmount, onMounted, ref, Ref } from 'vue'
import { ITagReplaceAction } from '@/plugins/tagger'
import { Vue } from 'vue-property-decorator'
import PlaygroundCanvas from '@/components/PlaygroundCanvas.vue'
import CodeBlock from '@/components/CodeBlock.vue'

export default defineComponent({
    name: 'CodePlayground',
    components: { PlaygroundCanvas, CodeBlock },
    props: {
        value: { type: String, default: '' },
        name: { type: String, default: '' },
        scopeUUID: { type: String, default: '' },
        editMode: { type: Boolean, default: false },
        language: { type: String, default: 'javascript' },
    },
    setup(props, context) {
        //ref-html element
        const editBox: Ref<HTMLElement | null> = ref(null)

        function updatedContent(v: string): void {
            context.emit('input', v)
        }

        function replaceTemplateTags(o: ITagReplaceAction) {
            if (!props.editMode) {
                return
            }
            if (o.scopeUUID != props.scopeUUID) {
                return
            }
            updatedContent(Vue.$tagger.replaceTemplateTagInString(text, o.name, o.newValue))
        }

        const text = computed({
            get: () => props.value,
            set: (v) => updatedContent(v),
        })

        onMounted(() => {
            const eb: any = editBox
            console.log('Found Box', eb)
            //we need this for StudON to make sure tinyMCE is not taking over :D
            eb.value.$el.querySelectorAll('textarea[name]').forEach((el) => {
                el.className = (el.className + ' accqstXmlInput noRTEditor').trim()
            })
            Vue.$tagger.$on('replace-template-tag', replaceTemplateTags)
        })

        onBeforeUnmount(() => {
            Vue.$tagger.$off('replace-template-tag', replaceTemplateTags)
        })

        return {
            text,
        }
    },
})
</script>

<style lang="stylus" scoped>
.plain
    z-index: 2
    border-radius: 0px !important

.wysiwyg
    z-index: 50
</style>
