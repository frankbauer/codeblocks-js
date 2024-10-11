<template>
    <div class="code-editor">
        <textarea
            style="display: none"
            readonly
            v-model="code"
            :name="name"
            :data-question="dataQuestion"
            :class="`accqstXmlInput noRTEditor`"
        ></textarea>
        <div
            class="accqstXmlInput noRTEditor"
            :name="name"
            :data-question="dataQuestion"
            ref="editorElement"
        ></div>
    </div>
</template>

<script setup lang="ts">
import { computed, ComputedRef, nextTick, onMounted, ref, shallowRef, toRefs, watch } from 'vue'
import { EditorView, minimalSetup } from 'codemirror'
import {
    Compartment,
    EditorState,
    type Extension,
    StateEffect,
    StateField,
    type Transaction,
} from '@codemirror/state'
import { GutterMarker } from '@codemirror/gutter'
import { Decoration, DecorationSet, hoverTooltip, lineNumbers, ViewUpdate } from '@codemirror/view'
import { indentUnit } from '@codemirror/language'
import { cpp } from '@codemirror/lang-cpp'
import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { java } from '@codemirror/lang-java'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { python } from '@codemirror/lang-python'

import { solarizedDarkTheme } from 'cm6-theme-solarized-dark'
import { basicLightTheme } from 'cm6-theme-basic-light'
import { solarizedLightTheme } from 'cm6-theme-solarized-light'
import { basicDarkTheme } from 'cm6-theme-basic-dark'
import { ErrorSeverity, ICompilerErrorDescription } from '@/lib/ICompilerRegistry'

const emit = defineEmits<{
    (e: 'focus', value: boolean): void
    (e: 'update', value: ViewUpdate): void
    (e: 'change', value: EditorState): void
    (e: 'ready', value: { view: EditorView; state: EditorState; container: HTMLElement }): void
}>()

interface Props {
    name: string
    dataQuestion?: string | number
    theme?: string
    language?: string
    firstLine?: number
    readOnly?: boolean
    errors?: ICompilerErrorDescription[]
}

const props = withDefaults(defineProps<Props>(), {
    dataQuestion: '',
    theme: 'xq-light',
    language: 'text/javascript',
    firstLine: 1,
    readOnly: false,
    errors: () => [],
})
const { name, dataQuestion, theme, language, firstLine, readOnly, errors } = toRefs(props)

const code = defineModel<string>()
const editorElement = ref<HTMLElement | null>(null)
const editorView = shallowRef<EditorView | null>(new EditorView())

const editorTheme = computed(() => {
    switch (theme.value) {
        case 'solarized-dark':
            return solarizedDarkTheme
        case 'solarized-light':
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

const extensions: ComputedRef<Extension[]> = computed(() => {
    return [
        minimalSetup,
        // ViewUpdate event listener
        EditorView.updateListener.of((update: ViewUpdate): void => {
            emit('focus', editorView.value?.hasFocus ?? false)

            if (update.changes.empty || !update.docChanged) {
                return
            }

            emit('update', update)
        }),
        EditorState.allowMultipleSelections.of(true),
        readOnlyCompartment.of(EditorState.readOnly.of(readOnly.value)),
        EditorView.editable.of(true),
        EditorState.tabSize.of(4),
        indentUnit.of(' '),
        themeCompartment.of(editorTheme.value),
        languageCompartment.of(editorLanguage.value),
        //EditorView.decorations.compute([EditorState.doc], underlineErrors),
        // gutter({
        //     class: 'cm-line-errors',
        //     markers: errorMarkers,
        // }),
        lineNumbersCompartment.of(
            lineNumbers({
                formatNumber: (n, state) => `${n + (firstLine.value - 1)}`,
            })
        ),
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

        underlineErrors()
        emit('ready', {
            view: editorView.value,
            state: editorView.value.state,
            container: editorElement.value,
        })
    })
})

watch(firstLine, (newValue) => {
    if (editorView.value === null) {
        return
    }
    console.log('firstLine', newValue)
    editorView.value.dispatch({
        effects: lineNumbersCompartment.reconfigure(
            lineNumbers({
                formatNumber: (n, state) => `${n + (newValue - 1)}`,
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
}>({
    map: ({ from, to, severity, message }, change) => ({
        from: change.mapPos(from),
        to: change.mapPos(to),
        severity: severity,
        message: message,
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
                underlines = underlines.update({
                    add: [
                        underlineMarkError(e.value.type, e.value.message).range(
                            e.value.from,
                            e.value.to
                        ),
                    ],
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

// Hover tooltip for errors
const hoverTooltipExtension = hoverTooltip((view, pos) => {
    // Find the error at the hover position
    const error = errorRanges.value.find((e) => {
        return pos >= e.from && pos <= e.to
    })

    if (error) {
        // Create a tooltip for the found error
        return {
            pos,
            above: true,
            create: () => {
                let dom = document.createElement('div')
                dom.textContent = error.message
                dom.className =
                    'code-tooltip ' +
                    (error.severity === ErrorSeverity.Warning ? 'warning-tooltip' : 'error-tooltip')
                return { dom }
            },
        }
    }
    return null
})

function underlineErrors() {
    let effects: StateEffect<unknown>[] = errorRanges.value.map((e) => {
        return addUnderline.of(e)
    })

    if (!editorView.value!.state.field(underlineField, false)) {
        effects.push(StateEffect.appendConfig.of([underlineField, hoverTooltipExtension]))
    }

    // Add the clearUnderlines effect to remove existing underlines
    effects.unshift(clearUnderlines.of(null))

    console.log('Adding effects', effects)
    editorView.value!.dispatch({ effects })
    return true
}

// Custom gutter marker for error symbols
class ErrorMarker extends GutterMarker {
    toDOM() {
        const marker = document.createElement('span')
        marker.textContent = '⚠️' // You can change this symbol to anything
        marker.title = 'Compiler Error'
        return marker
    }
}

function errorMarkers() {
    const markers = new Map()
    errors.value.forEach((error) => {
        markers.set(error.line - 1, new ErrorMarker())
    })
    return markers
}

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

defineExpose({
    view: editorView,
    lineCount,
})
</script>
<style lang="sass">
.code-editor
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

            &.werror-tooltip
                color: #f82c2c !important
                font-weight: 700
                border-color: #e51e56

            &.error-tooltip
                color: #422f05 !important
                font-weight: 400
                border-color: #e5a91e
</style>
