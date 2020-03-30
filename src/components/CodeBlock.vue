<template>
    <div :class="`codeblock block-${typeName}`">
        <codemirror
            ref="codeBox"
            :value="code"
            :options="options"
            :class="`accqstXmlInput noRTEditor ${boxClass}`"
            @ready="onCodeReady"
            @focus="onCodeFocus"
            @input="onCodeChange"
            :name="`${namePrefix}block[${block.parentID}][${block.id}]`"
            :id="`teQ${block.parentID}B${block.id}`"
            :data-question="block.parentID"
        >
        </codemirror>

        <div v-show="hasAlternativeContent" v-if="editMode">
            <div class="q-mt-lg text-subtitle2">{{ $t('CodeBlock.Initial_Content') }}</div>
            <codemirror
                ref="altBox"
                :value="altCode"
                :options="altOptions"
                :class="`accqstXmlInput noRTEditor ${boxClass}`"
                @ready="onAltCodeReady"
                @focus="onAltCodeFocus"
                @input="onAltCodeChange"
                :name="`${namePrefix}alt_block[${block.parentID}][${block.id}]`"
            >
            </codemirror>
        </div>
    </div>
</template>

<script lang="ts">
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
import 'codemirror/mode/clike/clike.js'
import 'codemirror/mode/fortran/fortran.js'
import 'codemirror/mode/javascript/javascript.js'
import 'codemirror/mode/perl/perl.js'
import 'codemirror/mode/python/python.js'
import 'codemirror/mode/r/r.js'
import 'codemirror/mode/ruby/ruby.js'
import '@/lib/glsl/glsl'

//plugins
import 'codemirror/addon/edit/closebrackets.js'

//helper to create tooltips at runtime

import 'reflect-metadata'
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import ErrorTip from './ErrorTip.vue'
import BaseBlock from './BaseBlock.vue'
import { IRandomizerSet } from '@/lib/ICodeBlocks'
import { ICompilerErrorDescription } from '@/lib/ICompilerRegistry'
import { BlockData } from '@/lib/codeBlocksManager'
import { ITagReplaceAction } from '@/plugins/tagger'
const ErrorTipCtor = Vue.extend(ErrorTip)

@Component
export default class CodeBlock extends BaseBlock {
    @Prop({ default: '' }) namePrefix!: string
    @Prop({ default: false }) readonly!: boolean
    @Prop({ default: false }) editMode!: boolean
    @Prop({ default: 'auto' }) visibleLines!: number | 'auto'
    @Prop({ default: 'base16-dark' }) theme!: string
    @Prop({ default: 'text/javascript' }) mode!: string
    @Prop({ default: undefined }) tagSet!: IRandomizerSet
    @Prop({
        required: true,
        validator: function(b) {
            if (b.content === undefined) {
                return false
            }
            if (b.firstLine === undefined) {
                return false
            }
            return true
        }
    })
    block!: BlockData

    clearTagMarkers() {
        if (this.codemirror === undefined) {
            return
        }

        let allMarks = this.codemirror.getDoc().getAllMarks()
        allMarks.forEach(e => {
            if (
                e.className == Vue.$tagger.className.rnd ||
                e.className == Vue.$tagger.className.templ
            ) {
                e.clear()
            }
        })

        if (this.altcodemirror) {
            allMarks = this.altcodemirror.getDoc().getAllMarks()
            allMarks.forEach(e => {
                if (
                    e.className == Vue.$tagger.className.rnd ||
                    e.className == Vue.$tagger.className.templ
                ) {
                    e.clear()
                }
            })
        }
    }
    clearErrorDisplay() {
        if (this.codemirror === undefined) {
            return
        }
        let allMarks = this.codemirror.getDoc().getAllMarks()
        //console.log("marks", this.block.type, allMarks)
        allMarks.forEach(e => {
            if (e.className == 'red-wave') {
                e.clear()
            }
        })

        this.codemirror.getDoc().clearGutter('diagnostics')
    }
    onCodeReady(editor) {
        //we need this for StudON to make sure tinyMCE is not taking over :D
        this.codemirror.display.input.textarea.className = 'noRTEditor'
        this.codeBox!.$el.querySelectorAll('textarea[name]').forEach(el => {
            el.className = (el.className + ' accqstXmlInput noRTEditor').trim()
            el.id = this.codeBox!.$el.id

            $(el).text(this.block.content)
            el.setAttribute('data-question', `${this.block.parentID}`)
            el.setAttribute('data-blocktype', `${this.iliasTypeNr}`)
            if (this.editMode) {
                el.setAttribute('is-editmode', `${this.editMode}`)
            }
        })
        this.updateDiagnosticDisplay()
        this.onCodeChange(this.block.content)

        this.whenBlockIsReady()
    }
    onAltCodeReady(editor) {
        console.log('READY')
        //we need this for StudON to make sure tinyMCE is not taking over :D
        this.altcodemirror.display.input.textarea.className = 'noRTEditor'
        this.altBox!.$el.querySelectorAll('textarea[name]').forEach(el => {
            el.className = (el.className + ' accqstXmlInput noRTEditor').trim()
        })
        this.$nextTick(() => {
            this.onAltCodeChange(this.block.alternativeContent)
            this.updateTagDisplay()
            this.updateHeight()
        })
    }
    onCodeFocus(editor) {}
    onAltCodeFocus(editor) {}
    onCodeChange(newCode) {
        const tb = this.codeBox.$el.querySelector('textarea[name]') as HTMLTextAreaElement
        tb.value = newCode

        this.block.content = newCode
        this.updateTagDisplay()
        if (this.editMode) {
            this.$emit('code-changed-in-edit-mode', undefined)
        }
    }
    onAltCodeChange(newCode) {
        if (this.altBox !== undefined) {
            const tb = this.altBox.$el.querySelector('textarea[name]') as HTMLTextAreaElement
            tb.value = newCode
        }

        this.block.alternativeContent = newCode
        this.updateTagDisplay()
    }
    updateHeight() {
        if (this.visibleLines === 'auto') {
            if (this.codemirror) {
                this.codemirror.setSize('height', 'auto')
            }
            if (this.altcodemirror) {
                this.altcodemirror.setSize('height', 'auto')
            }
        } else {
            if (this.codemirror) {
                this.codemirror.setSize(null, Math.round(20 * Math.max(1, this.visibleLines)) + 9)
            }
            if (this.altcodemirror) {
                this.altcodemirror.setSize(
                    null,
                    Math.round(20 * Math.max(1, this.visibleLines)) + 9
                )
            }
        }
    }
    replaceTemplateTags(o: ITagReplaceAction) {
        if (!this.editMode) {
            return
        }
        if (o.scopeUUID != this.block.scopeUUID) {
            return
        }
        this.block.content = Vue.$tagger.replaceTemplateTagInString(
            this.block.content,
            o.name,
            o.newValue
        )
    }
    updateTagDisplay() {
        if (!this.editMode) {
            return
        }

        this.clearTagMarkers()
        Vue.$tagger.getMarkers(this.block.content).forEach(m => {
            this.codemirror.getDoc().markText(m.start, m.end, {
                className: Vue.$tagger.className[m.type],
                inclusiveLeft: true,
                inclusiveRight: true,
                title: m.name,
                startStyle: 'tag-mark-start',
                endStyle: 'tag-mark-end'
            })
        })
        this.$nextTick(() => {
            Vue.$tagger.hookClick(this.codeBox.$el, this.block.scopeUUID)
        })

        if (this.altcodemirror) {
            Vue.$tagger.getMarkers(this.block.alternativeContent).forEach(m => {
                this.altcodemirror.getDoc().markText(m.start, m.end, {
                    className: Vue.$tagger.className[m.type],
                    inclusiveLeft: true,
                    inclusiveRight: true,
                    title: m.name,
                    startStyle: 'tag-mark-start',
                    endStyle: 'tag-mark-end'
                })
            })

            this.$nextTick(() => {
                if (this.altBox !== undefined) {
                    Vue.$tagger.hookClick(this.altBox.$el, this.block.scopeUUID)
                }
            })
        }
    }
    updateDiagnosticDisplay() {
        const val = this.errors
        if (val !== undefined) {
            this.clearErrorDisplay()

            const first = this.block.firstLine
            val.forEach(error => {
                if (error.start.column >= 0) {
                    //console.log("squiggle", this.block.type);
                    //put a squigly line as code marker
                    this.codemirror.getDoc().markText(
                        { line: error.start.line - first, ch: error.start.column },
                        { line: error.end.line - first, ch: error.end.column },
                        {
                            className: 'red-wave',
                            inclusiveLeft: true,
                            inclusiveRight: true,
                            title: error.message
                        }
                    )
                }

                //read existing gutter marker or create a new one
                let info = this.codemirror.getDoc().lineInfo(error.start.line - first)
                let element =
                    info && info.gutterMarkers ? info.gutterMarkers['diagnostics'].$component : null
                if (element == null) {
                    //console.log("Gutter", this.block.type, error.start.line, error.message, first);
                    element = document.createElement('span')

                    //place the updated element
                    this.codemirror
                        .getDoc()
                        .setGutterMarker(error.start.line - first, 'diagnostics', element)

                    element.$component = new ErrorTipCtor({
                        propsData: {
                            errors: [],
                            severity: error.severity
                        }
                    }).$mount(element)

                    element = element.$component
                }

                //make sure we use the proper class for the given severity.
                //We allways choose the maximum severity for each marking
                element.severity = Math.max(error.severity, element.severity)

                //Build the hint text
                if (element.errors.indexOf(error) == -1) {
                    element.errors.push(error)
                }
            })
        } else {
            this.clearErrorDisplay()
        }
    }

    get codeBox(): Vue {
        return this.$refs.codeBox as Vue
    }

    get altBox(): Vue | undefined {
        return this.$refs.altBox as Vue
    }

    get hasAlternativeContent() {
        return this.block.hasAlternativeContent && this.typeName == 'block'
    }
    get errors(): ICompilerErrorDescription[] {
        return this.block.errors
    }
    get randomizerActive() {
        return this.tagSet !== undefined
    }
    get boxClass() {
        let cl = ''
        if (this.block.hidden && !this.editMode) {
            cl += 'hiddenBox '
        }
        if (this.block.readonly || this.readonly) {
            cl += 'readonlyBox '
        }
        if (this.block.static) {
            cl += 'staticBox '
        }
        return cl
    }
    get iliasTypeNr() {
        const t = this.typeName
        if (t == 'text') {
            return 0
        }
        if (t == 'block-static') {
            return 1
        }
        if (t == 'block') {
            return 2
        }
        if (t == 'block-hidden') {
            return 3
        }
        if (t == 'playground') {
            return 4
        }
        if (t == 'blockly') {
            return 5
        }
        return -1
    }
    get typeName() {
        let s = this.block.type.toLowerCase()
        if (this.block.hidden) {
            s += '-hidden'
        }
        if (this.block.static) {
            s += '-static'
        }
        return s
    }
    get altCode() {
        return this.block.alternativeContent
    }
    get code() {
        if (!this.editMode) {
            return this.block.actualContent()
        }
        return this.block.content
    }
    get options() {
        return {
            // codemirror options
            mode: this.mode,
            theme: this.theme,
            lineNumbers: true,
            line: true,
            tabSize: 4,
            indentUnit: 4,
            autoCloseBrackets: true,
            readOnly:
                !this.editMode &&
                (this.block.readonly || this.block.static || this.block.hidden || this.readonly),
            firstLineNumber: this.block.firstLine,
            gutters: ['diagnostics', 'CodeMirror-linenumbers']
        }
    }
    get altOptions() {
        let o = { ...this.options }
        o.firstLineNumber = 1
        return o
    }
    get codemirror(): any | undefined {
        return (this.codeBox as any).codemirror
    }
    get altcodemirror(): any | undefined {
        if (this.altBox === undefined) {
            return undefined
        }
        return (this.altBox as any).codemirror
    }
    get readyWhenMounted() {
        return false
    }
    @Watch('visibleLines')
    onVisibleLinesChanged(val) {
        this.updateHeight()
    }
    @Watch('errors')
    onErrorsChanged(val) {
        this.updateDiagnosticDisplay()
    }

    created() {
        console.log('[DEBUG] ReadyWhenMounted in CodeBlock', this.readyWhenMounted)
        //this.$options.readyWhenMounted = false;
    }
    mounted() {
        this.updateHeight()

        if (this.editMode && this.codemirror) {
            console.log('Attach')
            const buildIt = () => {
                console.log('EMIT')
                this.$emit('build')
            }

            this.codemirror.addKeyMap({
                'Cmd-B': function(cMirror) {
                    buildIt()
                },
                'Ctrl-B': function(cMirror) {
                    buildIt()
                }
            })

            this.codemirror.addKeyMap({
                Tab: function(cMirror) {
                    cMirror.execCommand('insertSoftTab')
                }
            })
        }

        Vue.$tagger.$on('replace-template-tag', this.replaceTemplateTags)
        this.updateTagDisplay()
    }
    beforeDestroy() {
        Vue.$tagger.$off('replace-template-tag', this.replaceTemplateTags)
    }
}
</script>
<style scoped lang="sass">
.hiddenBox
    display: none !important
.staticBox
    opacity: 0.8
    filter: grayscale(20%)
</style>
