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
import { autocompletion } from '@codemirror/autocomplete'
import { indentWithTab } from '@codemirror/commands'
import { cpp } from '@codemirror/lang-cpp'
import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { java } from '@codemirror/lang-java'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { python } from '@codemirror/lang-python'
import { indentUnit, syntaxHighlighting } from '@codemirror/language'
import {
    Compartment, EditorSelection, EditorState,
    type Extension, RangeSetBuilder,
    StateEffect,
    StateField,
    type Transaction
} from '@codemirror/state'
import {
    Decoration,
    DecorationSet,
    gutter, GutterMarker, hoverTooltip, keymap, lineNumbers,
    ViewUpdate
} from '@codemirror/view'
import { EditorView, minimalSetup } from 'codemirror'
import { QIcon, QTooltip, Quasar } from 'quasar'
import {
    computed,
    ComputedRef,
    createApp,
    nextTick,
    onMounted,
    ref,
    shallowRef,
    toRefs,
    watch,
} from 'vue'

import { IRandomizerSet } from '@/lib/ICodeBlocks'
import { ErrorSeverity, ICompilerErrorDescription } from '@/lib/ICompilerRegistry'
import {
    createTagCompletions,
    createTagHighlightStyle,
    createTagMarkField,
    createTagTooltip,
    markTags
} from '@/plugins/tagHighlighter'
import { basicDarkTheme } from 'cm6-theme-basic-dark'
import { basicLightTheme } from 'cm6-theme-basic-light'
import { solarizedDarkTheme } from 'cm6-theme-solarized-dark'
import { solarizedLightTheme } from 'cm6-theme-solarized-light'

// Add proper interface for error ranges
interface ErrorRange {
    from: number
    to: number
    severity: ErrorSeverity
    message: string
}

// Add proper typing for the props
interface Props {
    modelValue?: string // Add this to properly type v-model
    name: string
    dataQuestion?: string | number
    theme?: string
    language?: string
    firstLine?: number
    readOnly?: boolean
    errors?: ICompilerErrorDescription[]
    maxLines?: number
    tagSet?: IRandomizerSet | undefined
}

// Fix emit types to match expected usage
const emit = defineEmits<{
    'update:modelValue': [string]
    'focus': [boolean]
    'update': [ViewUpdate]
    'change': [EditorState]
    'ready': [{ view: EditorView; state: EditorState; container: HTMLElement }]
}>()

const props = withDefaults(defineProps<Props>(), {
    dataQuestion: '',
    theme: 'xq-light',
    language: 'text/javascript',
    firstLine: 1,
    readOnly: false,
    errors: () => [],
    maxLines: 1,
    tagSet: undefined,  
})
const { name, dataQuestion, theme, language, firstLine, readOnly, errors, maxLines, tagSet } = toRefs(props)

// Replace code.value with proper v-model handling
const code = defineModel<string>('modelValue')
const editorElement = ref<HTMLElement | null>(null)
const editorView = shallowRef<EditorView | null>(new EditorView())

const mainClass = computed(() => {
    return {
        accqstXmlInput: true,
        noRTEditor: true,
        over10: maxLines.value >= 10,
        over100: maxLines.value >= 100,
        over1000: maxLines.value >= 1000,
        over10000: maxLines.value >= 10000,
    }
})

const editorTheme = computed(() => {
    switch (theme.value) {
        case 'solarized dark':
            return solarizedDarkTheme
        case 'solarized light':
            return solarizedLightTheme
        case 'xq-dark':
            return basicDarkTheme
        default:
            return basicLightTheme
    }
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
const themeCompartment = new Compartment()
const readOnlyCompartment = new Compartment()
const lineNumbersCompartment = new Compartment()

const tagMarkField = createTagMarkField(tagSet)
const tagTooltip = createTagTooltip(tagMarkField, tagSet)

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
        themeCompartment.of(editorTheme.value),
        languageCompartment.of(editorLanguage.value),
        lineNumbersCompartment.of(
            lineNumbers({
                formatNumber: (n, state) => lineNr(n),
            })
        ),
        EditorView.domEventHandlers({
            keydown: (event: KeyboardEvent, view: EditorView) => {
                if (event.key === 'Tab') {
                    event.preventDefault()
                    if (event.shiftKey) {
                        // Handle Shift+Tab for unindent
                        return view.dispatch(
                            view.state.changeByRange((range) => {
                                let lines = view.state.doc.lineAt(range.from).number
                                let endLine = view.state.doc.lineAt(range.to).number
                                let changes: { from: number; to: number; insert: string }[] = []
                                for (let pos = lines; pos <= endLine; pos++) {
                                    let line = view.state.doc.line(pos)
                                    let text = view.state.doc
                                        .slice(line.from, line.from + 4)
                                        .toString()
                                    if (text.startsWith(' '.repeat(4))) {
                                        changes.push({
                                            from: line.from,
                                            to: line.from + 4,
                                            insert: '',
                                        })
                                    }
                                }
                                return {
                                    changes,
                                    range: EditorSelection.range(range.from, range.to),
                                }
                            })
                        )
                    } else {
                        // Handle Tab for indent
                        return view.dispatch(
                            view.state.changeByRange((range) => {
                                return {
                                    changes: [{ from: range.from, insert: '    ' }],
                                    range: EditorSelection.range(range.from + 4, range.to + 4),
                                }
                            })
                        )
                    }
                    return true
                }
                return false
            },
        }),
        keymap.of([indentWithTab]),
        syntaxHighlighting(createTagHighlightStyle()),
        autocompletion({
            override: [createTagCompletions(tagSet)]
        }),
        tagMarkField,
        tagTooltip,
        underlineField,
        hoverTooltip((view, pos) => {
            const error = errorRanges.value.find((e) => pos >= e.from && pos <= e.to)
            if (error) {
                return {
                    pos,
                    above: true,
                    create() {
                        const dom = document.createElement('div')
                        dom.textContent = error.message
                        dom.className = 'code-tooltip ' + 
                            (error.severity === ErrorSeverity.Warning ? 'warning-tooltip' : 'error-tooltip')
                        return { dom }
                    }
                }
            }
            return null
        }),
        errorGutter,
    ] as Extension[]
})

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
    })
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
})

watch(editorTheme, (newValue) => {
    if (editorView.value === null) {
        return
    }

    editorView.value.dispatch({
        effects: themeCompartment.reconfigure(newValue),
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
const addUnderline = StateEffect.define<{
    from: number
    to: number
    severity: ErrorSeverity
    message: string
    decoration?: Decoration
}>({
    map: ({ from, to, severity, message, decoration }, change) => ({
        from: change.mapPos(from),
        to: change.mapPos(to),
        severity,
        message,
        decoration
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
                const decoration = e.value.decoration || underlineMarkError(e.value.severity, e.value.message)
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

const errorRanges = computed(() => {
    return errors.value
        .map((e) => {
            const sLine = e.start.line - firstLine.value + 1
            const startLine = editorView.value!.state.doc.line(sLine)
            if (startLine) {
                const from = startLine.from + e.start.column
                const eLine = e.end.line - firstLine.value + 1
                if (eLine >= sLine && eLine <= lineCount()) {
                    const endLine = editorView.value!.state.doc.line(eLine)
                    if (endLine) {
                        return {
                            from,
                            to: endLine.from + e.end.column,
                            severity: e.severity,
                            message: e.message,
                        }
                    }
                } else {
                    return { from, to: from + 1, severity: e.severity, message: e.message }
                }
            }
            return undefined
        })
        .filter((e) => e !== undefined)
})

function underlineErrors() {
    let effects: StateEffect<unknown>[] = [
        clearUnderlines.of(null),
        ...errorRanges.value.map((e) => addUnderline.of(e))
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
        app.use(Quasar, { components: { QIcon, QTooltip } })
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

watch(tagSet, () => {
    if (!editorView.value) return
    markTags(editorView.value, tagSet)
}, { deep: true })

defineExpose({
    view: editorView,
    lineCount,
    lineNr,
})
</script>
<style lang="sass">
.code-editor
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
        box-shadow: 0 2px 6px rgba(0,0,0,0.15)
        
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
</style>
