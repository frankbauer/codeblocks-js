<template>
    <div class="row q-ma-0 q-pa-0">
        <div class="col-xs-12 col-md-6 q-px-sm">
            <q-input ref="editBox" type="textarea" autogrow filled :name="name" label="HTML Source" background-color="blue-grey darken-3" v-model="text" class="plain accqstXmlInput noRTEditor">
            </q-input>
        </div>
        <div class="col-xs-12 col-md-6 q-px-sm">
            <div class="q-field__label no-pointer-events ellipsis text-caption wysiwyg">Preview</div>
            <div v-html="text" v-highlight="language" v-tagged="scopeUUID"></div>
        </div>
    </div>
</template>

<script lang="ts">
import 'reflect-metadata'
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import { ITagReplaceAction } from '../plugins/tagger'
@Component
export default class TipTap extends Vue {
    get text(): string {
        return this.value
    }
    set text(v: string) {
        this.updatedContent(v)
    }

    updatedContent(v: string): void {
        this.$emit('input', v)
    }
    replaceTemplateTags(o: ITagReplaceAction) {
        if (!this.editMode) {
            return
        }
        if (o.scopeUUID != this.scopeUUID) {
            return
        }
        this.updatedContent(Vue.$tagger.replaceTemplateTagInString(this.text, o.name, o.newValue))
    }

    @Prop({ default: '' }) value: string = ''
    @Prop({ default: '' }) name: string = ''
    @Prop({ default: '' }) scopeUUID: string = ''
    @Prop({ default: false }) editMode: boolean = false
    @Prop() langauge!: string

    mounted() {
        const eb: any = this.$refs.editBox
        //we need this for StudON to make sure tinyMCE is not taking over :D
        eb.$el.querySelectorAll('textarea[name]').forEach(el => {
            el.className = (el.className + ' accqstXmlInput noRTEditor').trim()
        })
        Vue.$tagger.$on('replace-template-tag', this.replaceTemplateTags)
    }

    beforeDestroy() {
        Vue.$tagger.$off('replace-template-tag', this.replaceTemplateTags)
    }
}
</script>

<style lang="stylus" scoped>
.plain
    z-index:2
    border-radius:0px !important

.wysiwyg
    z-index:50
</style>
