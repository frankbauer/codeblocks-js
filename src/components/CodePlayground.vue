<template>
    <div>
        <PlaygroundCanvas
            ref="playgroundContainer"
            :output="finalOutputObject.initialOutput"
            :obj="block.obj"
            :key="runCount"
            :block="block"
            :eventHub="eventHub"
            :tagSet="tagSet"
            :data-question="block.parentID"
            @canvas-change="onCanvasChange"
            @did-init="onDidInit"
        />
        <div class="row justify-end">
            <q-btn
                icon
                color="secondary"
                small
                flat
                round
                style="margin-right:-9px; margin-bottom:-10px"
                v-if="editMode"
                @click="toggleExpanded"
            >
                <q-icon :name="block.codeExpanded ? 'expand_less' : 'expand_more'" size="24" />
            </q-btn>
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
import PlaygroundCanvas from '@/components/PlaygroundCanvas.vue'
import BaseBlock from '@/components/BaseBlock.vue'
const PlaygroundCanvasCtor = Vue.extend(PlaygroundCanvas)

import CodeBlock from '@/components/CodeBlock.vue'
import { BlockData } from '@/lib/codeBlocksManager'
import { IRandomizerSet } from '@/lib/ICodeBlocks'
import { IScriptOutputObject } from '@/lib/IScriptBlock'

export interface ICodePlaygroundOptions {
    mode: string
    theme: string
    lineNumbers: boolean
    line: boolean
    tabSize: number
    indentUnit: number
    autoCloseBrackets: boolean
    readOnly: boolean
    firstLineNumber: number
    gutters: string[]
}

@Component({
    components: { PlaygroundCanvas, CodeBlock }
})
export default class CodePlayground extends BaseBlock {
    @Prop({ required: true }) finalOutputObject!: IScriptOutputObject
    @Prop({
        required: true,
        validator: function(b) {
            if (!b.obj) {
                return false
            }
            return true
        }
    })
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
            gutters: ['diagnostics', 'CodeMirror-linenumbers']
        }
    }
    get visibleLinesNow(): 'auto' | string {
        if (!this.block.codeExpanded) {
            return '5.2'
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

    toggleExpanded(): void {
        this.block.codeExpanded = !this.block.codeExpanded
        if (this.block.codeExpanded) {
            this.$CodeBlock.refreshAllCodeMirrors()
        }
    }
    updateErrors(): boolean {
        this.block.errors = []
        if (this.block.obj === null) {
            return false
        }

        this.block.obj.err = this.block.obj.err.concat(this.initAndRebuildErrors)
        this.block.obj.err.forEach(e => {
            let err = {
                start: { line: e.line, column: e.column },
                end: { line: e.line, column: e.column + 1 },
                message: e.msg,
                severity: Vue.$SEVERITY_ERROR
            }
            if (e.line === undefined) {
                err.start = { line: 1, column: -1 }
                err.end = { line: 1, column: -1 }
            } else if (e.column === undefined) {
                err.start = { line: e.line, column: -1 }
                err.end = { line: e.line, column: -1 }
            }
            this.block.errors.push(err)
        })

        if (this.block.obj.err.length > 0 && this.editMode) {
            this.needsCodeRebuild = true
            return true
        } else {
            return false
        }
    }
    resetBeforeRun(): void {
        const rebuildCode = this.editMode && (this.needsCodeRebuild || this.tagSet !== undefined)
        let reInitCode = rebuildCode
        let onNextTick = false
        if (this.block && this.block.obj) {
            if (this.block.shouldAutoreset || rebuildCode) {
                if (this.canvas !== undefined) {
                    console.log(
                        'Will Re-Initialize',
                        this.canvas,
                        $(this.canvas).css('background-color')
                    )
                } else {
                    console.log('Will Re-Initialize', 'Without Canvas')
                }
                this.lastRun = new Date()
                this.runCount++
                reInitCode = true
                onNextTick = true
            } else {
                const self = this
                this.$nextTick(() => {
                    //console.log("Will Reset", this.canvas, $(this.canvas).css('background-color'));
                    if (self.block.obj !== null && self.canvas !== undefined) {
                        self.block.obj.reset($(self.canvas))
                    }
                    self.updateErrors()
                })
            }
        }

        if (rebuildCode) {
            this.initAndRebuildErrors = []

            if (this.block.obj != null) {
                this.block.obj.rebuild(this.block.actualContent())
                if (this.updateErrors()) {
                    this.initAndRebuildErrors = this.block.obj.err
                    this.block.obj.invalidate()
                    return
                }
            }

            reInitCode = true
        }

        if (reInitCode) {
            this.initAndRebuildErrors = []
            let doInit = () => {
                if (this.block.obj !== null && this.canvas !== undefined) {
                    this.block.obj.init(
                        $(this.canvas) as JQuery<HTMLElement>,
                        $(this.block.scopeSelector) as JQuery<HTMLElement>
                    )
                    if (this.updateErrors()) {
                        this.initAndRebuildErrors = this.block.obj.err
                        this.block.obj.invalidate()
                        return false
                    }
                    return true
                } else {
                    return false
                }
            }
            if (onNextTick) {
                this.$nextTick(doInit)
            } else {
                if (!doInit()) {
                    return
                }
            }
        }
    }
    onCanvasChange(can) {
        this.canvas = can
        if (this.editMode) {
            this.updateErrors()
        }
        //console.log("Changed Canvas", can, $(can).css('background-color'));
    }
    onCodeChange(newCode: string): void {
        if (this.editMode) {
            this.needsCodeRebuild = true
        }
    }
    onDidInit(): void {
        this.updateErrors()
    }

    @Watch('finalOutputObject')
    onFinalOutputObject(val) {
        const initialOutput = val.output

        if (this.block.obj !== null) {
            this.block.obj.err = []
            try {
                if (val.parseError != null) {
                    if (
                        !this.block.obj.onParseError(initialOutput, val.parseError) &&
                        this.editMode
                    ) {
                        let jStr = initialOutput
                        if (val.parseError.parsedString !== undefined) {
                            jStr = val.parseError.parsedString
                        }
                        jStr = jStr.replace(/</g, '&lt;')

                        this.$q
                            .dialog({
                                title: this.$l('CodePlayground.InvalidJson'),
                                message:
                                    '<span class="text-caption jsonErrTitle">' +
                                    this.$t('CodePlayground.Output') +
                                    '</span><div class="jsonErrObj">' +
                                    jStr +
                                    '</div>\n<span class="text-caption jsonErrTitle">' +
                                    this.$t('CodePlayground.Message') +
                                    '</span><div class="jsonErr">' +
                                    val.parseError +
                                    '</div>',
                                html: true
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
                    if (this.updateErrors()) {
                        return
                    }
                }

                const self = this
                this.$nextTick(() => {
                    if (self.block.obj !== null && self.canvas !== undefined) {
                        let result = self.block.obj.update(val, $(self.canvas))
                        if (self.updateErrors()) {
                            return
                        }

                        //construct a split output object
                        if (result === undefined && val.processedOutput.type != 'text') {
                            if (!self.originalMode) {
                                result = val.processedOutput.text
                            }
                        }

                        if (self.originalMode) {
                            if (typeof result !== 'string') {
                                result = ''
                            }
                        }

                        if (result !== undefined) {
                            self.$emit('changeOutput', result)
                        }
                    }
                })
            } catch (e) {
                console.error(e)
            }
            if (this.block.obj.err.length > 0) {
                if (this.editMode) {
                    this.updateErrors()
                } else {
                    console.error(this.block.obj.err)
                }
            }
        }
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
