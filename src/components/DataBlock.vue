<template>
    <div>
        <transition enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
            <q-banner inline-actions class="text-white bg-red q-mb-md" v-if="hasError">
                {{ error }}
                <template v-slot:action>
                    <q-btn flat color="white" label="OK" @click="error = ''" />
                </template>
            </q-banner>
        </transition>
        <div class="row justify-between controlContainer" v-if="editMode">
            <div class="multiDiv">
                <div class="inlined-input q-mr-sm">
                    <q-btn
                        flat
                        round
                        color="primary"
                        icon="info"
                        size="xs"
                        @click="showInfoDialog"
                    ></q-btn>
                </div>
                <div class="q-mr-lg inlined-input noMoreBottomMargin">
                    <q-input label="Name" v-model="name" rounded filled class="noMoreBottomMargin">
                    </q-input>
                </div>
                <div class="inlined-input q-mr-md">
                    <input
                        class="jsonFileUploader"
                        type="file"
                        ref="jsonFileUploader"
                        @change="onUploadJson($event)"
                    />

                    <q-btn
                        color="teal-9"
                        filled
                        label="Load JSON"
                        icon="cloud_upload"
                        @click="openJson"
                    >
                    </q-btn>
                </div>
                <div class="inlined-input q-mr-md">
                    <input
                        class="plainFileUploader"
                        type="file"
                        ref="plainFileUploader"
                        @change="onUploadPlain($event)"
                    />

                    <q-btn
                        color="teal-8"
                        filled
                        label="Add Text Data"
                        icon="post_add"
                        @click="openPlain"
                    >
                    </q-btn>
                </div>
                <div class="inlined-input">
                    <input
                        class="imageFileUploader"
                        type="file"
                        ref="imageFileUploader"
                        @change="onUploadImage($event)"
                    />

                    <q-btn
                        color="teal"
                        filled
                        label="Add Image Data"
                        icon="add_photo_alternate"
                        @click="openImage"
                    >
                    </q-btn>
                </div>
            </div>
            <div class="col-grow"></div>
            <div>
                <q-btn-group rounded class="q-mb-sm" v-if="editMode">
                    <q-btn
                        :color="isExpandedAuto ? 'primary' : 'blue-grey-4'"
                        small
                        label="Auto"
                        icon="video_label"
                        @click="setExpandedAuto"
                    />
                    <q-btn
                        :color="isExpandedLarge ? 'primary' : 'blue-grey-4'"
                        small
                        label="Large"
                        icon="call_to_action"
                        @click="setExpandedLarge"
                    />
                    <q-btn
                        :color="isExpandedTiny ? 'primary' : 'blue-grey-4'"
                        small
                        label="Small"
                        icon="visibility_off"
                        @click="setExpandedTiny"
                    />
                </q-btn-group>
            </div>
        </div>
        <q-slide-transition>
            <codemirror
                ref="codeBox"
                :value="code"
                :options="options"
                :class="`accqstXmlInput noRTEditor codebox`"
                @ready="onCodeReady"
                @focus="onCodeFocus"
                @input="onCodeChange"
                :name="`${namePrefix}block[${block.parentID}][${block.id}]`"
                :id="`teQ${block.parentID}B${block.id}`"
                :data-question="block.parentID"
            ></codemirror>
        </q-slide-transition>
    </div>
</template>

<script lang="ts">
import 'reflect-metadata'

//helper to reset the canvas area if needed
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import BaseBlock from '@/components/BaseBlock.vue'

import { BlockData } from '@/lib/codeBlocksManager'
import { IRandomizerSet, CodeExpansionType } from '@/lib/ICodeBlocks'
import { IScriptOutputObject } from '@/lib/IScriptBlock'
import { ICodePlaygroundOptions } from './CodePlayground.vue'

import codemirror from 'vue-codemirror'
import 'codemirror/lib/codemirror.css'

//themes
import 'codemirror/theme/solarized.css'
import 'codemirror/theme/base16-dark.css'
import 'codemirror/theme/base16-light.css'
import 'codemirror/theme/duotone-dark.css'
import 'codemirror/theme/duotone-light.css'
import 'codemirror/theme/xq-dark.css'
import 'codemirror/theme/xq-light.css'
import 'codemirror/theme/blackboard.css'
import 'codemirror/theme/midnight.css'
import 'codemirror/theme/neo.css'
import 'codemirror/theme/mbo.css'
import 'codemirror/theme/mdn-like.css'

//languages
import 'codemirror/mode/javascript/javascript.js'

@Component({
    components: {},
})
export default class DataBlock extends BaseBlock {
    @Prop({ default: '' }) namePrefix!: string
    @Prop({ required: true }) finalOutputObject!: IScriptOutputObject
    @Prop({ required: true })
    block!: BlockData

    @Prop({ default: false }) editMode!: boolean
    @Prop({ default: 'base16-dark' }) theme!: string
    @Prop({ required: true }) eventHub!: Vue
    @Prop() tagSet?: IRandomizerSet

    get codeBox(): Vue {
        return this.$refs.codeBox as Vue
    }
    get codemirror(): any | undefined {
        return (this.codeBox as any).codemirror
    }

    get originalMode(): boolean {
        if (this.block.obj === null) {
            return false
        }
        return this.block.obj.requestsOriginalVersion()
    }

    get options(): ICodePlaygroundOptions {
        return {
            // codemirror options
            mode: this.$CodeBlock.mimeType('javascript'),
            theme: this.theme,
            lineNumbers: true,
            line: true,
            tabSize: 4,
            indentUnit: 4,
            autoCloseBrackets: true,
            readOnly: !this.editMode,
            firstLineNumber: 1,
            gutters: ['diagnostics', 'CodeMirror-linenumbers'],
        }
    }

    get code() {
        if (!this.editMode) {
            return this.block.actualContent()
        }
        return this.block.content
    }

    get name(): string {
        return this.block.name
    }
    set name(newName: string) {
        this.block.name = newName
    }

    get visibleLines(): 'auto' | string {
        if (this.block.codeExpanded == CodeExpansionType.TINY) {
            return '2.4'
        } else if (this.block.codeExpanded == CodeExpansionType.LARGE) {
            return '33.4'
        }
        return 'auto'
    }
    created() {
        this.eventHub.$on('before-run', this.resetBeforeRun)
        this.eventHub.$on('render-diagnostics', this.updateErrors)
    }
    mounted() {
        const hasErrors = this.block && this.block.obj && this.block.obj.err.length > 0
        if (hasErrors) {
            this.updateErrors()
        }
        this.updateHeight()
    }
    beforeDestroy() {
        this.eventHub.$off('before-run', this.resetBeforeRun)
        this.eventHub.$off('render-diagnostics', this.updateErrors)
    }

    needsCodeRebuild: boolean = false

    get isExpandedLarge(): boolean {
        return this.block.codeExpanded == CodeExpansionType.LARGE
    }
    get isExpandedTiny(): boolean {
        return this.block.codeExpanded == CodeExpansionType.TINY
    }
    get isExpandedAuto(): boolean {
        return this.block.codeExpanded == CodeExpansionType.AUTO
    }
    setExpandedLarge(): void {
        this.setExpanded(CodeExpansionType.LARGE)
    }
    setExpandedTiny(): void {
        this.setExpanded(CodeExpansionType.TINY)
    }
    setExpandedAuto(): void {
        this.setExpanded(CodeExpansionType.AUTO)
    }
    setExpanded(val: CodeExpansionType): void {
        this.block.codeExpanded = val

        if (this.block.codeExpanded != CodeExpansionType.TINY) {
            this.$CodeBlock.refreshAllCodeMirrors()
        }
        this.updateHeight()
    }
    updateErrors(): boolean {
        return false
    }
    resetBeforeRun(): void {}

    onCodeChange(newCode) {
        //copy the content to the actual textbox processed by StudON
        const tb = this.codeBox.$el.querySelector('textarea[name]') as HTMLTextAreaElement
        tb.value = newCode

        //copy code to the block structure
        this.block.content = newCode

        if (this.editMode) {
            this.needsCodeRebuild = true
        }
    }

    onCodeFocus(editor) {}
    onDidInit(): void {
        this.updateErrors()
    }
    onCodeReady(editor) {
        //we need this for StudON to make sure tinyMCE is not taking over :D
        if (
            this.codemirror &&
            this.codemirror.display &&
            this.codemirror.display.input &&
            this.codemirror.display.input.textarea
        ) {
            this.codemirror.display.input.textarea.className = 'noRTEditor'
        }
        this.codeBox!.$el.querySelectorAll('textarea[name]').forEach((el) => {
            el.className = (el.className + ' accqstXmlInput noRTEditor').trim()
            el.id = this.codeBox!.$el.id

            $(el).text(this.block.content)
            el.setAttribute('data-question', `${this.block.parentID}`)

            if (this.editMode) {
                el.setAttribute('is-editmode', `${this.editMode}`)
            }
        })
        this.onCodeChange(this.block.content)

        this.whenBlockIsReady()
    }
    updateHeight() {
        if (this.visibleLines === 'auto') {
            if (this.codemirror) {
                this.codemirror.setSize('height', 'auto')
            }
        } else {
            if (this.codemirror) {
                this.codemirror.setSize(null, Math.round(20 * Math.max(1, +this.visibleLines)) + 9)
            }
        }
    }

    showInfoDialog(): void {
        this.$q
            .dialog({
                title: this.$l('DataBlock.InfoCaption'),
                message: this.$l('DataBlock.Info').replace('{NAME}', this.name),
                html: true,
                style: 'width:75%',
            })
            .onOk(() => {
                // console.log('OK')
            })
            .onCancel(() => {
                // console.log('Cancel')
            })
            .onDismiss(() => {
                // console.log('I am triggered on both OK and Cancel')
            })
    }

    error: string = ''
    get hasError(): boolean {
        return this.error !== ''
    }

    onUpload(
        uploader: any,
        validateFileType: (type: string) => boolean,
        processor: (fl: File, fr: FileReader) => void,
        action: (name: string, content: string | ArrayBuffer | null) => void
    ): void {
        if (uploader.files === undefined || uploader.files.length < 1) {
            return
        }

        const files = uploader.files
        for (let i = 0; i < files.length; i++) {
            const fl = files[i]
            let type: string = fl.type
            if (fl.type == '') {
                const ext = fl.name.split('.').pop()

                const knownTextExtensions = ['obj', 'mat', 'vsh', 'fsh', 'ply']
                if (knownTextExtensions.indexOf(ext) === 0) {
                    type = 'text/' + ext
                }
                console.log(ext, type)
            }
            //console.log(fl)
            if (!validateFileType(type)) {
                this.error = `Uploads of type '${type}' are not allowed.`
                console.error(this.error)
                break
            }

            if (fl.size > 500 * 1025) {
                this.error = `Maximum allowed upload size are 500kB.`
                console.error(this.error)
                break
            }
            const fr = new FileReader()
            fr.onload = () => {
                action(fl.name, fr.result)
            }
            fr.onerror = (e) => {
                console.error(fr.error)
                this.error = fr.error === undefined || fr.error === null ? '' : fr.error.message
            }
            processor(fl, fr)
        }
        uploader.value = ''
    }

    openImage(): void {
        const uploader: any = this.$refs['imageFileUploader']
        uploader.click()
    }
    openPlain(): void {
        const uploader: any = this.$refs['plainFileUploader']
        uploader.click()
    }
    openJson(): void {
        const uploader: any = this.$refs['jsonFileUploader']
        uploader.click()
    }

    onUploadImage(event): void {
        const uploader: any = this.$refs['imageFileUploader']
        this.onUpload(
            uploader,
            (type) => type.startsWith('image/'),
            (fl, fr) => fr.readAsDataURL(fl),
            (fileName, content) => this.addImageURL(fileName, content)
        )
    }

    onUploadPlain(event): void {
        const uploader: any = this.$refs['plainFileUploader']
        this.onUpload(
            uploader,
            (type) => type.startsWith('text/'),
            (fl, fr) => fr.readAsText(fl),
            (fileName, content) => this.loadPlain(fileName, content)
        )
    }

    onUploadJson(event): void {
        const uploader: any = this.$refs['jsonFileUploader']
        this.onUpload(
            uploader,
            (type) => type.trim() === 'application/json' || type.trim() === 'text/json',
            (fl, fr) => fr.readAsText(fl),
            (fileName, content) => this.loadJson(fileName, content)
        )
    }

    loadJson(fileName, txt) {
        this.block.content = txt
    }

    loadPlain(fileName, txt) {
        this.addToContent(fileName, txt)
    }
    addImageURL(fileName, img) {
        this.addToContent(fileName, img)
    }

    addToContent(fileName: string, data: string) {
        let json = {}
        try {
            json = JSON.parse(this.block.content)
        } catch (e) {
            console.error(e)
        }
        let i = -1
        let name
        do {
            i++
            if (i == 0) {
                name = fileName
            } else {
                name = `${fileName}_${i}`
            }
        } while (json[name] !== undefined)
        json[name] = data
        this.block.content = JSON.stringify(json, undefined, 2)
    }
    get images(): any {
        return []
    }

    set images(val: any) {
        console.log('IMAGES:' + val)
    }
}
</script>

<style lang="sass" scoped>
.noMoreBottomMargin
    margin-bottom: 0px!important
.controlContainer
    display: flex
    justify-content: space-between
    width: 100%
    flex-wrap: nowrap
    flex-direction: row
    align-content: flex-end
    align-items: flex-end
.multiDiv
    display: flex
    align-items: flex-end
.imageFileUploader
    display: none!important
.plainFileUploader
    display: none!important
.jsonFileUploader
    display: none!important
.inlined-input
    display: inline-block
.playgroundedit
    border-radius: 5px
.hiddenBlock
    display: none !important

.hiddenBlock
    opacity: 0
    visibility: hidden
</style>
<style lang="stylus">
@import '../styles/quasar.variables.styl'
.jsonErrObj, .jsonErr
    margin-left: 16px
    font-weight: bold
.jsonErrObj
    padding-left: 4px
    padding-right: 4px
    font-family: monospace
    margin-bottom: 20px
    background-color:$amber-2
.jsonErr
    font-weight: bold
    color: $deep-orange-14
.jsonErrTitle
    padding-left: 8px
    text-transform: uppercase
</style>
