<template>
    <div>
        <div class="row justify-between" style="width: 100%">
            <div class="q-mr-lg">
                <q-input label="Name" v-model="name" rounded filled>
                    <template v-slot:after>
                        <q-btn
                            flat
                            round
                            color="primary"
                            icon="info"
                            size="xs"
                            @click="showInfoDialog"
                        ></q-btn>
                    </template>
                </q-input>
            </div>

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
    set name(newName: string) {}

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
}
</script>

<style lang="sass" scoped>
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
