<template>
    <div :class="`codeblock block-${typeName}`">
        <codemirror
            ref="codeBox"
            :value="code"
            :options="options"
            :class="`accqstXmlInput noRTEditor codebox ${boxClass}`"
            @ready="onCodeReady"
            @focus="onCodeFocus"
            @input="onCodeChangeDefered"
            @input-read="onCodeKeyHandle"
            @keyup="onCodeKeyHandle"
            :name="`${namePrefix}block[${block.parentID}][${block.id}]`"
            :id="`teQ${block.parentID}B${block.id}`"
            :data-question="block.parentID"
            :events="['keyup']"
        >
        </codemirror>

        <div v-show="hasAlternativeContent" v-if="editMode">
            <div class="q-mt-lg text-subtitle2 q-pb-xs">{{ $t('CodeBlock.Initial_Content') }}</div>
            <codemirror
                ref="altBox"
                :value="altCode"
                :options="altOptions"
                :class="`accqstXmlInput noRTEditor ${boxClass}`"
                @ready="onAltCodeReady"
                @focus="onAltCodeFocus"
                @input="onAltCodeChangeDefered"
                :name="`${namePrefix}alt_block[${block.parentID}][${block.id}]`"
            >
            </codemirror>
        </div>
    </div>
</template>

<script lang="ts">
import Vue, {
    defineComponent,
    toRefs,
    ref,
    computed,
    watch,
    onMounted,
    onBeforeUnmount,
    PropType,
    getCurrentInstance,
    Ref,
    nextTick,
} from 'vue'
import ErrorTip from './ErrorTip.vue'
import { IRandomizerSet } from '@/lib/ICodeBlocks'
import { ICompilerErrorDescription } from '@/lib/ICompilerRegistry'
import { BlockData } from '@/lib/codeBlocksManager'
import { ITagReplaceAction, tagger } from '@/plugins/tagger'
import codemirror from 'vue-codemirror'
// import 'codemirror/lib/codemirror.css'
// import 'codemirror/theme/solarized.css'
// import 'codemirror/theme/base16-dark.css'
// import 'codemirror/theme/base16-light.css'
// import 'codemirror/theme/duotone-dark.css'
// import 'codemirror/theme/duotone-light.css'
// import 'codemirror/theme/xq-dark.css'
// import 'codemirror/theme/xq-light.css'
// import 'codemirror/theme/blackboard.css'
// import 'codemirror/theme/midnight.css'
// import 'codemirror/theme/neo.css'
// import 'codemirror/theme/mbo.css'
// import 'codemirror/theme/mdn-like.css'
// import 'codemirror/mode/clike/clike.js'
// import 'codemirror/mode/fortran/fortran.js'
// import 'codemirror/mode/javascript/javascript.js'
// import 'codemirror/mode/perl/perl.js'
// import 'codemirror/mode/python/python.js'
// import 'codemirror/mode/r/r.js'
// import 'codemirror/mode/ruby/ruby.js'
// import '@/lib/glsl/glsl'
// import 'codemirror/addon/edit/closebrackets.js'
import { useBasicBlockMounting } from '@/composables/basicBlock'
import { globalState } from '@/lib/globalState'

// const ErrorTipCtor = Vue.extend(ErrorTip)
export default defineComponent({
    name: 'CodeBlock',
    components: {},
    props: {
        muteReadyState: {
            type: Boolean,
            default: false,
        },
        editMode: {
            type: Boolean,
            default: false,
        },
        visibleLines: {
            type: [Number, String] as PropType<number | 'auto'>,
            default: 'auto',
        },
        theme: {
            type: String,
            default: 'base16-dark',
        },
        namePrefix: { default: '', type: String },
        emitWhenTypingInViewMode: { default: false, type: Boolean },
        readonly: { default: false, type: Boolean },
        mode: { default: 'text/javascript', type: String },
        tagSet: { default: undefined, type: Object as PropType<IRandomizerSet> },
        block: {
            type: Object as PropType<BlockData>,
            required: true,
        },
    },
    emits: ['code-changed-in-edit-mode', 'code-changed-in-view-mode', 'build'],
    setup(props, ctx) {
        const instance = getCurrentInstance()
        const q = instance?.proxy?.$root?.$q
        const t = instance?.proxy?.$root?.$t

        const { whenBlockIsReady, whenBlockIsDestroyed } = useBasicBlockMounting(true, props, ctx)

        const {
            namePrefix,
            emitWhenTypingInViewMode,
            readonly,
            editMode,
            visibleLines,
            theme,
            mode,
            tagSet,
            block,
        } = toRefs(props)

        let codeUpdateTimer: any = null
        const codeUpdateStartTime = ref<number>(0)
        let continuousCodeUpdateTimer: any = null
        const codeNeedsTagUpdate = ref<boolean>(true)
        let altCodeUpdateTimer: any = null
        const altCodeUpdateStartTime = ref<number>(0)

        const codeBox: Ref<HTMLElement | null> = ref(null)
        const altBox: Ref<HTMLElement | null> = ref(null)

        const hasAlternativeContent = computed(() => {
            return block.value.hasAlternativeContent && typeName.value == 'block'
        })
        const errors = computed((): ICompilerErrorDescription[] => {
            return block.value.errors
        })
        const randomizerActive = computed(() => {
            return tagSet.value !== undefined
        })
        const boxClass = computed(() => {
            let cl = ''
            if (block.value.hidden && !editMode.value) {
                cl += 'hiddenBox '
            }
            if (block.value.readonly || readonly.value) {
                cl += 'readonlyBox '
            }
            if (block.value.static) {
                cl += 'staticBox '
            }
            return cl
        })
        const iliasTypeNr = computed(() => {
            const t = typeName.value
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
            if (t == 'repl') {
                return 6
            }
            if (t == 'data') {
                return 7
            }
            return -1
        })
        const typeName = computed(() => {
            let s = block.value.type.toLowerCase()
            if (block.value.hidden) {
                s += '-hidden'
            }
            if (block.value.static) {
                s += '-static'
            }
            return s
        })
        const altCode = computed(() => {
            if (block.value.alternativeContent === null) {
                return ''
            }
            return block.value.alternativeContent
        })
        const code = computed(() => {
            if (!editMode.value) {
                return block.value.actualContent()
            }
            return block.value.content
        })
        const options = computed(() => {
            return {
                mode: mode.value,
                theme: theme.value,
                lineNumbers: true,
                line: true,
                tabSize: 4,
                indentUnit: 4,
                autoCloseBrackets: true,
                readOnly:
                    !editMode.value &&
                    (block.value.readonly ||
                        block.value.static ||
                        block.value.hidden ||
                        readonly.value),
                gutters: ['diagnostics', 'CodeMirror-linenumbers'],
            }
        })
        const altOptions = computed(() => {
            return options.value
        })
        const codemirror = computed((): any | undefined => {
            return (codeBox.value as any).codemirror
        })
        const altcodemirror = computed((): any | undefined => {
            if (altBox.value === undefined) {
                return undefined
            }
            return (altBox.value as any).codemirror
        })
        const readyWhenMounted = computed(() => {
            return false
        })
        const clearTagMarkers = () => {
            if (codemirror.value === undefined) {
                return
            }
            let allMarks = codemirror.value.getDoc().getAllMarks()
            allMarks.forEach((e) => {
                if (e.className == tagger.className.rnd || e.className == tagger.className.templ) {
                    e.clear()
                }
            })
            if (altcodemirror.value) {
                allMarks = altcodemirror.value.getDoc().getAllMarks()
                allMarks.forEach((e) => {
                    if (
                        e.className == tagger.className.rnd ||
                        e.className == tagger.className.templ
                    ) {
                        e.clear()
                    }
                })
            }
        }
        const clearErrorDisplay = () => {
            if (codemirror.value === undefined) {
                return
            }
            let allMarks = codemirror.value.getDoc().getAllMarks()
            allMarks.forEach((e) => {
                if (e.className == 'red-wave') {
                    e.clear()
                }
            })
            codemirror.value.getDoc().clearGutter('diagnostics')
        }
        const onCodeReady = (editor) => {
            if (
                codemirror.value &&
                codemirror.value.display &&
                codemirror.value.display.input &&
                codemirror.value.display.input.textarea
            ) {
                codemirror.value.display.input.textarea.className = 'noRTEditor'
            }
            const h = codeBox.value as any
            h!.$el.querySelectorAll('textarea[name]').forEach((el) => {
                el.className = (el.className + ' accqstXmlInput noRTEditor').trim()
                el.id = (codeBox.value as any)!.$el.id
                $(el).text(block.value.content)
                el.setAttribute('data-question', `${block.value.parentID}`)
                el.setAttribute('data-blocktype', `${iliasTypeNr.value}`)
                if (editMode.value) {
                    el.setAttribute('is-editmode', `${editMode.value}`)
                }
            })
            updateDiagnosticDisplay()
            onCodeChange(block.value.content)
            whenBlockIsReady()
        }
        const onAltCodeReady = (editor) => {
            console.d('READY')
            if (
                altcodemirror.value &&
                altcodemirror.value.display &&
                altcodemirror.value.display.input &&
                altcodemirror.value.display.input.textarea
            ) {
                altcodemirror.value.display.input.textarea.className = 'noRTEditor'
            }
            const a = altBox.value as any
            a!.$el.querySelectorAll('textarea[name]').forEach((el) => {
                el.className = (el.className + ' accqstXmlInput noRTEditor').trim()
            })
            nextTick(() => {
                onAltCodeChange(block.value.alternativeContent)
                updateTagDisplay()
                updateHeight()
            })
        }
        const onCodeFocus = (editor) => {}
        const onAltCodeFocus = (editor) => {}
        const onCodeChangeDefered = (newCode) => {
            if (!editMode.value) {
                onCodeChange(newCode)
                return
            }
            const now = new Date().getTime()
            if (codeUpdateTimer !== null) {
                clearTimeout(codeUpdateTimer)
                codeUpdateTimer = null
            } else {
                codeUpdateStartTime.value = now
            }
            const doIt = () => {
                codeUpdateTimer = null
                onCodeChange(newCode)
            }
            if (now - codeUpdateStartTime.value > globalState.VUE_APP_CODE_BLOCK_MAX_TIMEOUT) {
                doIt()
                return
            }
            codeUpdateTimer = setTimeout(() => {
                doIt()
            }, globalState.VUE_APP_CODE_BLOCK_TIMEOUT)
        }
        const onCodeChange = (newCode) => {
            block.value.lineCountHint = codemirror.value.doc.size
            codemirror.value.options.firstLineNumber = block.value.firstLine
            const tb = (codeBox.value as any).$el.querySelector(
                'textarea[name]'
            ) as HTMLTextAreaElement
            tb.value = newCode
            block.value.content = newCode
            updateTagDisplay()
            if (editMode.value) {
                ctx.emit('code-changed-in-edit-mode', undefined)
            } else if (emitWhenTypingInViewMode.value) {
                if (continuousCodeUpdateTimer !== null) {
                    clearTimeout(continuousCodeUpdateTimer)
                    continuousCodeUpdateTimer = null
                }
                continuousCodeUpdateTimer = setTimeout(() => {
                    ctx.emit('code-changed-in-view-mode', undefined)
                }, globalState.VUE_APP_CODE_BLOCK_TIMEOUT)
            }
        }
        const didAddText = (t: string): void => {
            if (
                t.indexOf('!') >= 0 ||
                t.indexOf(':') >= 0 ||
                t.indexOf('+') >= 0 ||
                t.indexOf('{') >= 0 ||
                t.indexOf('}') >= 0 ||
                t.indexOf('\n') >= 0
            ) {
                console.log("TAGGER: '" + t + "' needs update")
                codeNeedsTagUpdate.value = true
            }
        }
        const onCodeKeyHandle = (e, kEvent?: any) => {
            if (kEvent !== undefined) {
                if (kEvent.text !== undefined) {
                    kEvent.text.forEach((t) => {
                        didAddText(t)
                    })
                } else if (kEvent.key !== undefined) {
                    if (kEvent.keyCode === 13) {
                        didAddText('\n')
                    } else {
                        didAddText(kEvent.key)
                    }
                }
            }
        }
        const onAltCodeChangeDefered = (newCode) => {
            const now = new Date().getTime()
            if (altCodeUpdateTimer.value !== null) {
                clearTimeout(altCodeUpdateTimer.value)
                altCodeUpdateTimer.value = null
            } else {
                altCodeUpdateStartTime.value = now
            }
            const doIt = () => {
                altCodeUpdateTimer.value = null
                onAltCodeChange(newCode)
            }
            if (now - altCodeUpdateStartTime.value > globalState.VUE_APP_CODE_BLOCK_MAX_TIMEOUT) {
                doIt()
                return
            }
            altCodeUpdateTimer = setTimeout(() => {
                doIt()
            }, globalState.VUE_APP_CODE_BLOCK_TIMEOUT)
        }
        const onAltCodeChange = (newCode) => {
            if (altBox.value !== undefined && altBox.value !== null) {
                const tb = (altBox.value as any).$el.querySelector(
                    'textarea[name]'
                ) as HTMLTextAreaElement
                tb.value = newCode
            }
            block.value.alternativeContent = newCode
            updateTagDisplay()
        }
        const updateHeight = () => {
            if (visibleLines.value === 'auto' || block.value.static) {
                if (codemirror.value) {
                    codemirror.value.setSize('height', 'auto')
                }
                if (altcodemirror.value) {
                    altcodemirror.value.setSize('height', 'auto')
                }
            } else {
                if (codemirror.value) {
                    codemirror.value.setSize(
                        null,
                        Math.round(20 * Math.max(1, visibleLines.value)) + 9
                    )
                }
                if (altcodemirror.value) {
                    altcodemirror.value.setSize(
                        null,
                        Math.round(20 * Math.max(1, visibleLines.value)) + 9
                    )
                }
            }
        }
        const replaceTemplateTags = (o: ITagReplaceAction) => {
            if (!editMode.value) {
                return
            }
            if (o.scopeUUID != block.value.scopeUUID) {
                return
            }
            block.value.content = tagger.replaceTemplateTagInString(
                block.value.content,
                o.name,
                o.newValue
            )
        }
        const updateTagDisplay = () => {
            if (
                !editMode.value ||
                block.value === undefined ||
                block.value.appSettings === undefined ||
                block.value.appSettings.randomizer === undefined ||
                !block.value.appSettings.randomizer.active ||
                !codeNeedsTagUpdate.value
            ) {
                return
            }
            codeNeedsTagUpdate.value = false
            clearTagMarkers()
            tagger.getMarkers(block.value.content).forEach((m) => {
                codemirror.value.getDoc().markText(m.start, m.end, {
                    className: tagger.className[m.type],
                    inclusiveLeft: true,
                    inclusiveRight: true,
                    title: m.name,
                    startStyle: 'tag-mark-start',
                    endStyle: 'tag-mark-end',
                })
            })
            nextTick(() => {
                tagger.hookClick((codeBox.value as any).$el, block.value.scopeUUID)
            })
            if (altcodemirror.value) {
                tagger.getMarkers(block.value.alternativeContent).forEach((m) => {
                    altcodemirror.value.getDoc().markText(m.start, m.end, {
                        className: tagger.className[m.type],
                        inclusiveLeft: true,
                        inclusiveRight: true,
                        title: m.name,
                        startStyle: 'tag-mark-start',
                        endStyle: 'tag-mark-end',
                    })
                })
                nextTick(() => {
                    if (altBox.value !== undefined && altBox.value !== null) {
                        tagger.hookClick((altBox.value as any).$el, block.value.scopeUUID)
                    }
                })
            }
        }
        const updateDiagnosticDisplay = () => {
            const val = errors.value
            if (val !== undefined) {
                clearErrorDisplay()
                const first = block.value.firstLine
                val.forEach((error) => {
                    if (error.start.column >= 0) {
                        codemirror.value.getDoc().markText(
                            { line: error.start.line - first, ch: error.start.column },
                            { line: error.end.line - first, ch: error.end.column },
                            {
                                className: 'red-wave',
                                inclusiveLeft: true,
                                inclusiveRight: true,
                                title: error.message,
                            }
                        )
                    }
                    let info = codemirror.value.getDoc().lineInfo(error.start.line - first)
                    let element =
                        info && info.gutterMarkers
                            ? info.gutterMarkers['diagnostics'].$component
                            : null
                    if (element == null) {
                        element = document.createElement('span')
                        codemirror.value
                            .getDoc()
                            .setGutterMarker(error.start.line - first, 'diagnostics', element)
                        // element.$component = new ErrorTipCtor({
                        //     propsData: {
                        //         errors: [],
                        //         severity: error.severity,
                        //     },
                        // }).$mount(element)
                        // element = element.$component
                    }
                    element.severity = Math.max(error.severity, element.severity)
                    if (element.errors.indexOf(error) == -1) {
                        element.errors.push(error)
                    }
                })
            } else {
                clearErrorDisplay()
            }
        }
        const onFirstLineChanged = (val) => {
            if (codemirror.value) {
                if (codemirror.value.options.firstLineNumber != block.value.firstLine) {
                    codemirror.value.options.firstLineNumber = block.value.firstLine
                    codemirror.value.refresh()
                }
            }
        }
        const onVisibleLinesChanged = (val) => {
            updateHeight()
        }
        const onErrorsChanged = (val) => {
            updateDiagnosticDisplay()
        }

        const firstLine = computed(() => {
            return block.value.firstLine
        })

        watch(firstLine, onFirstLineChanged)
        watch(visibleLines, onVisibleLinesChanged)
        watch(errors, onErrorsChanged)
        ;(() => {
            console.d('ReadyWhenMounted in CodeBlock', readyWhenMounted.value)
        })()
        onMounted(() => {
            updateHeight()
            if (editMode.value && codemirror.value) {
                console.d('Attach')
                const buildIt = () => {
                    console.log('EMIT')
                    ctx.emit('build')
                }
                codemirror.value.addKeyMap({
                    'Cmd-B': function (cMirror) {
                        buildIt()
                    },
                    'Ctrl-B': function (cMirror) {
                        buildIt()
                    },
                })
                codemirror.value.addKeyMap({
                    Tab: function (cMirror) {
                        cMirror.execCommand('insertSoftTab')
                    },
                })
            }
            tagger.onReplaceTemplateTag(replaceTemplateTags)
            codeNeedsTagUpdate.value = true
            updateTagDisplay()
        })
        onBeforeUnmount(() => {
            tagger.offReplaceTemplateTag(replaceTemplateTags)
        })
        return {
            codeUpdateTimer,
            codeUpdateStartTime,
            continuousCodeUpdateTimer,
            codeNeedsTagUpdate,
            altCodeUpdateTimer,
            altCodeUpdateStartTime,
            codeBox,
            altBox,
            hasAlternativeContent,
            errors,
            randomizerActive,
            boxClass,
            iliasTypeNr,
            typeName,
            altCode,
            code,
            options,
            altOptions,
            codemirror,
            altcodemirror,
            readyWhenMounted,
            clearTagMarkers,
            clearErrorDisplay,
            onCodeReady,
            onAltCodeReady,
            onCodeFocus,
            onAltCodeFocus,
            onCodeChangeDefered,
            onCodeChange,
            didAddText,
            onCodeKeyHandle,
            onAltCodeChangeDefered,
            onAltCodeChange,
            updateHeight,
            replaceTemplateTags,
            updateTagDisplay,
            updateDiagnosticDisplay,
            onFirstLineChanged,
            onVisibleLinesChanged,
            onErrorsChanged,
        }
    },
})
</script>
<style scoped lang="sass">
.hiddenBox
    display: none !important

.staticBox
    opacity: 0.8
    filter: grayscale(20%)
</style>
