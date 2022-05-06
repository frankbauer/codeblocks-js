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
        <div class="row justify-between controlContainer">
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
                <div class="inlined-input">
                    <input
                        class="fileUploader"
                        type="file"
                        ref="fileUploader"
                        @change="onUpload($event)"
                    />

                    <q-btn
                        color="teal"
                        filled
                        label="Add Image Data"
                        icon="cloud_upload"
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
            <CodeBlock
                v-if="editMode"
                :block="block"
                :theme="options.theme"
                :mode="options.mode"
                :visibleLines="visibleLinesNow"
                :editMode="this.editMode"
                :muteReadyState="true"
                @code-changed-in-edit-mode="onCodeChange"
            />
        </q-slide-transition>
    </div>
</template>

<script lang="ts">
import 'reflect-metadata'
import codemirror from 'vue-codemirror'
import 'codemirror/lib/codemirror.css'

//helper to reset the canvas area if needed
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import BaseBlock from '@/components/BaseBlock.vue'

import CodeBlock from '@/components/CodeBlock.vue'
import { BlockData } from '@/lib/codeBlocksManager'
import { IRandomizerSet, CodeExpansionType } from '@/lib/ICodeBlocks'
import { IScriptOutputObject } from '@/lib/IScriptBlock'
import { ICodePlaygroundOptions } from './CodePlayground.vue'

@Component({
    components: { CodeBlock },
})
export default class DataBlock extends BaseBlock {
    @Prop({ required: true }) finalOutputObject!: IScriptOutputObject
    @Prop({ required: true })
    block!: BlockData

    @Prop({ default: false }) editMode!: boolean
    @Prop({ default: 'auto' }) visibleLines!: 'auto' | string
    @Prop({ default: 'base16-dark' }) theme!: string
    @Prop({ required: true }) eventHub!: Vue
    @Prop() tagSet?: IRandomizerSet

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

    get name(): string {
        return this.block.name
    }
    set name(newName: string) {
        this.block.name = newName
    }

    get visibleLinesNow(): 'auto' | string {
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
    }
    beforeDestroy() {
        this.eventHub.$off('before-run', this.resetBeforeRun)
        this.eventHub.$off('render-diagnostics', this.updateErrors)
    }
    isPreparingRun: boolean = false
    lastRun: Date = new Date()
    runCount: number = 0
    canvas: HTMLElement | undefined = undefined
    needsCodeRebuild: boolean = false
    initAndRebuildErrors: any[] = []

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
    }
    updateErrors(): boolean {
        return false
    }
    resetBeforeRun(): void {}

    onCodeChange(newCode: string): void {
        if (this.editMode) {
            this.needsCodeRebuild = true
        }
    }
    onDidInit(): void {
        this.updateErrors()
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

    openImage(): void {
        const uploader: any = this.$refs['fileUploader']
        uploader.click()
    }
    error: string = ''
    get hasError(): boolean {
        return this.error !== ''
    }

    onUpload(event): void {
        const uploader: any = this.$refs['fileUploader']
        console.log('Selected Files: ', uploader.files.length)
        if (uploader.files === undefined || uploader.files.length < 1) {
            return
        }

        const files = uploader.files
        for (let i = 0; i < files.length; i++) {
            const fl = files[i]
            //console.log(fl)
            if (!fl.type.startsWith('image/')) {
                this.error = `Uploads of type '${fl.type}' are not allowed.`
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
                this.addImageURL(fl.name, fr.result)
            }
            fr.onerror = (e) => {
                console.error(fr.error)
                this.error = fr.error === undefined || fr.error === null ? '' : fr.error.message
            }
            fr.readAsDataURL(fl)
        }
        uploader.value = ''
    }

    addImageURL(fileName, img) {
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
        json[name] = img
        this.block.content = JSON.stringify(json, undefined, 4)
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
.fileUploader
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
