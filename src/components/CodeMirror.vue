<template>
  <div class="code-editor">
    <textarea
      style="display: none"
      readonly
      v-model="code"
      :name="name"
      :data-question="dataQuestion"
      class="accqstXmlInput noRTEditor"
    ></textarea>
    <div
      :class="mainClass"
      :name="name"
      :data-question="dataQuestion"
      ref="editorElement"
    ></div>
  </div>
</template>

<script setup lang="ts">
import ErrorTip from '@/components/ErrorTip.vue'
import { indentWithTab } from '@codemirror/commands'
import { cpp } from '@codemirror/lang-cpp'
import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { java } from '@codemirror/lang-java'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { python } from '@codemirror/lang-python'
import {
    autocompletion,
    CompletionContext,
    completionKeymap,
    CompletionResult,
} from '@codemirror/autocomplete'
import { IndentContext, indentService, indentUnit } from '@codemirror/language'
import {
    ChangeSpec,
    Compartment,
    EditorSelection,
    EditorState,
    type Extension,
    type Line,
    RangeSetBuilder,
    StateEffect,
    StateField,
    type Transaction,
} from '@codemirror/state'
import {
    Decoration,
    DecorationSet,
    gutter,
    GutterMarker,
    hoverTooltip,
    keymap,
    lineNumbers,
    ViewUpdate,
} from '@codemirror/view'
import { EditorView, minimalSetup } from 'codemirror'
import {
    computed,
    ComputedRef,
    createApp,
    nextTick,
    onBeforeUnmount,
    onMounted,
    Ref,
    ref,
    shallowRef,
    toRefs,
    watch,
} from 'vue'

import { IRandomizerSet } from '@/lib/ICodeBlocks'
import { ErrorSeverity, ICompilerErrorDescription } from '@/lib/ICompilerRegistry'
import {
    createTagCompletions,
    createTagMarkField,
    createTagTooltip,
    markTags,
} from '@/plugins/tagHighlighter'
import { basicDarkTheme } from 'cm6-theme-basic-dark'
import { basicLightTheme } from 'cm6-theme-basic-light'
import { solarizedDarkTheme } from 'cm6-theme-solarized-dark'
import { solarizedLightTheme } from 'cm6-theme-solarized-light'
import { getSimpleIndentation } from '@/plugins/codemirror/codeIndentation'
import { CodeSplitSegment } from '@/composables/useCodeEditor'
import { createJavaCompletions } from '@/plugins/javaCompletions'
import { createHighlightStyle } from '@/plugins/codemirror/highlightStyles'
import { getUITheme, UITheme, UIThemeType } from '@/lib/uiTheme'
import { DEFAULT_EDITOR_THEME, EditorTheme, EditorThemes } from '@/plugins/codemirror/editorThemes'
import { createDOMEventHandlers } from '@/plugins/codemirror/keyHandling'
import { createErrorHoverTooltip, ErrorRange } from '@/plugins/codemirror/errorHoverTooltip'

// Add proper typing for the props
interface Props {
    modelValue?: string // Add this to properly type v-model
    name: string
    dataQuestion?: string | number
    theme?: EditorTheme
    language?: string
    firstLine?: number
    readOnly?: boolean
    errors?: ICompilerErrorDescription[]
    maxLines?: number
    tagSet?: IRandomizerSet | undefined
    baseIndent?: number
    codeSplitSegment?: CodeSplitSegment
}

// Fix emit types to match expected usage
const emit = defineEmits<{
    'update:modelValue': [string]
    focus: [boolean]
    update: [ViewUpdate]
    change: [EditorState]
    ready: [{ view: EditorView; state: EditorState; container: HTMLElement }]
}>()

const props = withDefaults(defineProps<Props>(), {
    dataQuestion: '',
    theme: () => DEFAULT_EDITOR_THEME,
    language: 'text/javascript',
    firstLine: 1,
    readOnly: false,
    errors: () => [],
    maxLines: 1,
    tagSet: undefined,
    baseIndent: 0,
    codeSplitSegment: undefined,
})
const {
    name,
    dataQuestion,
    theme,
    language,
    firstLine,
    readOnly,
    errors,
    maxLines,
    tagSet,
    baseIndent,
    codeSplitSegment,
} = toRefs(props)

// Replace code.value with proper v-model handling
const code = defineModel<string>('modelValue')
const editorElement = ref<HTMLElement | null>(null)
const editorView = shallowRef<EditorView | null>(new EditorView())

const mainClass = computed(() => {
    return {
        ...editorTheme.value.cssClasses,
        accqstXmlInput: true,
        noRTEditor: true,
        over10: maxLines.value >= 10,
        over100: maxLines.value >= 100,
        over1000: maxLines.value >= 1000,
        over10000: maxLines.value >= 10000,
    }
})

const editorTheme = computed<EditorTheme>(() => {
    return theme.value
})

const editorLanguage = computed(() => {
    switch (language.value) {
        case 'text/css':
            return css()
        case 'text/html':
            return html()
        case 'text/json':
            return json()
        case 'text/python':
            return python()
        case 'text/x-java':
            return java()
        case 'text/java':
            return java()
        case 'text/cpp':
            return cpp()
        default:
            return javascript()
    }
})

const languageCompartment = new Compartment()
const languageAutoCompleteCompartment = new Compartment()
const themeCompartment = new Compartment()
const highlighterCompartment = new Compartment()
const readOnlyCompartment = new Compartment()
const lineNumbersCompartment = new Compartment()
const indentationCompartment = new Compartment()

const tagMarkField = createTagMarkField(tagSet)
const tagTooltip = createTagTooltip(tagMarkField, tagSet)

const getBaseIndent = (): number => {
    return 0 //baseIndent.value
}

const getIndentationInSource = (docString: string, pos: number): number => {
    if (codeSplitSegment.value === undefined) {
        return 0
    }

    const newCode =
        codeSplitSegment.value.before +
        (docString === '' ? '' : docString + '\n') +
        codeSplitSegment.value.after

    const newState = EditorState.create({
        doc: newCode,
        extensions: [
            EditorState.tabSize.of(4),
            indentUnit.of('    '),
            languageCompartment.of(editorLanguage.value),
        ],
    })

    const newPos = pos + codeSplitSegment.value.offset
    const defaultIndent = getSimpleIndentation(newState, newPos, getBaseIndent) ?? getBaseIndent()
    // console.log(
    //     'DEBUG indent (segment)',
    //     defaultIndent,
    //     newState.doc.lineAt(newPos).text,
    //     newPos,
    //     codeSplitSegment.value
    // )
    return defaultIndent
}

const getIndentationAt = (context: IndentContext, pos: number): number => {
    if (codeSplitSegment.value) {
        return getIndentationInSource(context.state.doc.toString(), pos)
    }
    const defaultIndent = getSimpleIndentation(context, pos, getBaseIndent) ?? getBaseIndent()
    //console.log('DEBUG indent', defaultIndent, context.state.doc.lineAt(pos))
    return defaultIndent
}

const createIndentService = (): Extension => {
    return indentationCompartment.of(
        indentService.of((context, pos) => {
            //console.log('DEBUG indent service -- from main')
            return getIndentationAt(context, pos)
        })
    )
}

function combinedCompletions(tagSet: Ref<IRandomizerSet | undefined>) {
    const tagCompletions = createTagCompletions(tagSet)

    return (context: CompletionContext): CompletionResult | null => {
        let res: CompletionResult | null = null
        if (tagCompletions) {
            res = tagCompletions(context)
        }
        if (res === null) {
            if (language.value === 'text/java' || language.value === 'text/x-java') {
                return createJavaCompletions(context)
            }
        }
        return res
    }
}

const extensions: ComputedRef<Extension[]> = computed(() => {
    return [
        minimalSetup,
        // Combined update listener for focus, updates and tags
        EditorView.updateListener.of((update: ViewUpdate): void => {
            // Handle focus and update events
            emit('focus', editorView.value?.hasFocus ?? false)
            if (!update.changes.empty && update.docChanged) {
                emit('update', update)
                // Handle tag updates when document changes
                markTags(update.view, tagSet)
            }
        }),
        EditorState.allowMultipleSelections.of(true),
        readOnlyCompartment.of(EditorState.readOnly.of(readOnly.value)),
        EditorView.editable.of(true),
        EditorState.tabSize.of(4),
        indentUnit.of('    '),
        themeCompartment.of(editorTheme.value.editorTheme),
        languageCompartment.of(editorLanguage.value),
        lineNumbersCompartment.of(
            lineNumbers({
                formatNumber: (n, state) => lineNr(n),
            })
        ),
        createDOMEventHandlers(getIndentationInSource),
        keymap.of([indentWithTab]),
        highlighterCompartment.of(editorTheme.value.highlightStyle),
        languageAutoCompleteCompartment.of(
            editorLanguage.value.language.data.of({
                autocomplete: combinedCompletions(tagSet),
            })
        ),
        autocompletion({
            activateOnTyping: true,
        }),
        keymap.of([...completionKeymap]),
        tagMarkField,
        tagTooltip,
        underlineField,
        createErrorHoverTooltip(errorRanges),
        errorGutter,
        createIndentService(),
    ] as Extension[]
})

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
    if (editorElement.value === null) {
        console.error('Editor Element is not found.')
        return
    }

    editorView.value = new EditorView({
        parent: editorElement.value,
        state: EditorState.create({ doc: code.value, extensions: extensions.value }),
        dispatch: (tr: Transaction) => {
            if (editorView.value === null) {
                return
            }
            editorView.value.update([tr])
            if (tr.changes.empty || !tr.docChanged) {
                // if not change value, no fire emit event
                return
            }

            code.value = tr.state.doc.toString() ?? ''
            emit('change', tr.state)
        },
    })

    nextTick(() => {
        if (editorView.value === null || editorElement.value === null) {
            return
        }

        // Initialize error underlining
        underlineErrors()

        // Initialize tag marks
        markTags(editorView.value, tagSet)

        emit('ready', {
            view: editorView.value,
            state: editorView.value.state,
            container: editorElement.value,
        })

        // Add this ResizeObserver
        resizeObserver = new ResizeObserver(() => {
             if (editorView.value) {
                 editorView.value.requestMeasure()
                 editorView.value.dispatch({}) // Forces a full re-layout
             }
        })
        resizeObserver.observe(editorElement.value)
    })

   document.fonts.ready.then(() => {
        if (editorView.value) {
            editorView.value.requestMeasure()
            editorView.value.dispatch({}) // Forces a full re-layout
        }
    })
})

// Clean it up
onBeforeUnmount(() => {
    if (resizeObserver) {
        resizeObserver.disconnect()
        resizeObserver = null
    }
})

function lineNr(a: number): string {
    return `${+a + firstLine.value - 1}`
}

watch(firstLine, (newValue) => {
    if (editorView.value === null) {
        return
    }
    console.log('firstLine', newValue)
    editorView.value.dispatch({
        effects: lineNumbersCompartment.reconfigure(
            lineNumbers({
                formatNumber: (n, state) => lineNr(n),
            })
        ),
    })
})

watch(editorLanguage, (newValue) => {
    if (editorView.value === null) {
        return
    }

    editorView.value.dispatch({
        effects: languageCompartment.reconfigure(newValue),
    })
    editorView.value.dispatch({
        effects: languageAutoCompleteCompartment.reconfigure(
            newValue.language.data.of({
                autocomplete: combinedCompletions(tagSet),
            })
        ),
    })
})

watch(editorTheme, (newValue) => {
    if (editorView.value === null) {
        return
    }

    editorView.value.dispatch({
        effects: [
            themeCompartment.reconfigure(newValue.editorTheme),
            highlighterCompartment.reconfigure(newValue.highlightStyle),
        ],
    })
})

watch(
    () => readOnly.value,
    (value) => {
        if (editorView.value === null) {
            return
        }

        //make the view readonly
        editorView.value.dispatch({
            effects: readOnlyCompartment.reconfigure(EditorState.readOnly.of(readOnly.value)),
        })
    },
    { immediate: true }
)

const SAVE_SELECTION = { anchor: 0, head: 0 }
watch(
    () => code.value,
    async (value) => {
        if (value === undefined) {
            value = ''
        }
        if (
            editorView.value === null ||
            editorView.value.composing ||
            editorView.value.state.doc.toJSON().join('\n') === value
        ) {
            return
        }

        const isOffRange = !editorView.value.state.selection.ranges.every(
            (range) => range.anchor < value.length && range.head < value.length
        )

        editorView.value.dispatch({
            changes: { from: 0, to: editorView.value.state.doc.length, insert: value },
            selection: isOffRange ? SAVE_SELECTION : editorView.value.state.selection,
            scrollIntoView: true,
        })
    },
    { immediate: true }
)

const lineCount = (): number => editorView.value?.state.doc.lines ?? 0

// Create underline decoration based on errors
const addUnderline = StateEffect.define<ErrorRange>({
    map: ({ from, to, severity, message, decoration }, change) =>
        validateRange({
            from: change.mapPos(from),
            to: change.mapPos(to),
            severity,
            message,
            decoration,
        }),
})

// Define a StateEffect for clearing all underlines
const clearUnderlines = StateEffect.define()

const underlineField = StateField.define<DecorationSet>({
    create() {
        return Decoration.none
    },
    update(underlines, tr) {
        underlines = underlines.map(tr.changes)
        for (let e of tr.effects) {
            // Handle the clearUnderlines effect by resetting underlines
            if (e.is(clearUnderlines)) {
                underlines = Decoration.none
            } else if (e.is(addUnderline)) {
                const decoration =
                    e.value.decoration || underlineMarkError(e.value.severity, e.value.message)
                underlines = underlines.update({
                    add: [decoration.range(e.value.from, e.value.to)],
                })
            }
        }
        return underlines
    },
    provide: (f) => EditorView.decorations.from(f),
})

const underlineMarkError = (severity: ErrorSeverity, msg: string) =>
    Decoration.mark({
        class: severity === ErrorSeverity.Warning ? 'yellow-wave' : 'red-wave',
        attributes: {},
    })

function clamp(n: number) {
    return Math.max(0, Math.min(n, editorView.value!.state.doc.length - 1))
}

function validateRange(range: ErrorRange): ErrorRange {
    range.from = clamp(range.from)
    range.to = clamp(range.to)
    if (range.from === range.to) {
        range.to = clamp(range.to + 1)
    }
    if (range.from === range.to) {
        range.from = clamp(range.from - 1)
    }
    if (range.from > range.to) {
        return {
            from: range.to,
            to: range.from,
            severity: range.severity,
            message: range.message,
            decoration: range.decoration,
        }
    }
    return range
}

const errorRanges = computed(() => {
    return errors.value
        .map((e) => {
            if (firstLine.value === 0) {
                return validateRange({
                    from: editorView.value!.state.doc.length - 2,
                    to: editorView.value!.state.doc.length - 1,
                    severity: e.severity,
                    message: e.message,
                })
            }
            const sLine = e.start.line - firstLine.value + 1
            const startLine = editorView.value!.state.doc.line(sLine)
            if (startLine) {
                const from = startLine.from + e.start.column
                const eLine = e.end.line - firstLine.value + 1
                if (eLine >= sLine && eLine <= lineCount()) {
                    const endLine = editorView.value!.state.doc.line(eLine)
                    if (endLine) {
                        return validateRange({
                            from: from,
                            to: endLine.from + e.end.column,
                            severity: e.severity,
                            message: e.message,
                        })
                    }
                } else {
                    return validateRange({
                        from: from,
                        to: from + 1,
                        severity: e.severity,
                        message: e.message,
                    })
                }
            }
            return undefined
        })
        .filter((e) => e !== undefined)
})

function underlineErrors() {
    let effects: StateEffect<unknown>[] = [
        clearUnderlines.of(null),
        ...errorRanges.value.map((e) => addUnderline.of(e)),
    ]

    editorView.value!.dispatch({ effects })
    return true
}

// Custom gutter marker for error symbols
class ErrorMarker extends GutterMarker {
    constructor(private severity: ErrorSeverity, private msg: string) {
        super()
    }

    toDOM() {
        const marker = document.createElement('span')
        const app = createApp(ErrorTip, {
            errors: [
                {
                    severity: this.severity,
                    message: this.msg,
                },
            ],
            severity: this.severity,
        })
        app.mount(marker)
        return marker
    }
}

// Custom gutter for errors
const errorGutter = gutter({
    class: 'error-gutter',
    markers: (view: EditorView) => {
        let builder = new RangeSetBuilder<GutterMarker>()

        errors.value.forEach((e) => {
            const lineNumber = e.start.line - firstLine.value + 1
            const line = view.state.doc.line(lineNumber)
            builder.add(line.from, line.from, new ErrorMarker(e.severity, e.message))
        })

        return builder.finish()
    },
})

watch(
    errors,
    () => {
        if (editorView.value === null) {
            return
        }
        console.log('Errors', errors.value)
        underlineErrors()
    },
    { immediate: true, deep: true }
)

watch(
    tagSet,
    () => {
        if (!editorView.value) {
            return
        }
        markTags(editorView.value, tagSet)
    },
    { deep: true }
)

defineExpose({
    view: editorView,
    lineCount,
    lineNr,
})
</script>
<style lang="sass">
.code-editor
    .system-code-box
        border: 1px dashed theme('colors.slate.300')

    .system-code-box-dark
        border: 2px solid theme('colors.yellow.600')

    .cm-focused
        outline: none !important

    .cm-lineNumbers
        min-width: 25px

    .over10
        .cm-lineNumbers
            min-width: 34px

    .over100
        .cm-lineNumbers
            min-width: 42px

    .over1000
        .cm-lineNumbers
            min-width: 51px

    .over10000
        .cm-lineNumbers
            min-width: 60px

    .cm-tooltip
        background-color: rgba(255, 255, 255, 0.2) !important
        backdrop-filter: blur(4px) saturate(50%) brightness(130%) !important
        box-shadow: 1px 1px 4px rgba(0, 0, 0, 0.2) !important
        border-radius: 4px !important

        .code-tooltip
            border-width: 1px
            border-style: solid
            border-radius: 4px
            padding: 4px 8px
            max-width: 400px
            word-wrap: break-word
            pointer-events: none
            z-index: 1000
            font-family: "Source Code Pro", monospace
            background-color: rgba(0, 0, 0, 0)

            &.error-tooltip
                color: #f82c2c !important
                font-weight: 700
                border-color: #e51e56

            &.warning-tooltip
                color: #422f05 !important
                font-weight: 400
                border-color: #e5a91e

    .cm-tooltip.cm-tooltip-autocomplete
        background-color: rgba(255, 255, 255, 0.95)
        border: 1px solid #ddd
        border-radius: 4px
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15)

        > ul
            font-family: "Source Code Pro", monospace
            padding: 4px 0

            > li
                padding: 4px 8px

                &[aria-selected]
                    background-color: #0366d6
                    color: white

                .cm-completionDetail
                    color: #666
                    font-size: 0.9em
                    margin-left: 8px
    :deep(.cm-scroller)
        // Prevents the scroller from reserving empty space for an inactive horizontal scrollbar
        min-height: 0 !important

    :deep(.cm-content)
        // Removes CodeMirror's default top/bottom padding
        padding-top: 0 !important
        padding-bottom: 0 !important
</style>
