import { StateEffect, StateField } from '@codemirror/state'
import { Decoration, DecorationSet, EditorView } from '@codemirror/view'
import { IRandomizerSet } from '@/lib/ICodeBlocks'
import { Ref } from 'vue'
import { HighlightStyle } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import { hoverTooltip } from '@codemirror/view'
import { CompletionContext, CompletionResult } from '@codemirror/autocomplete'

const tagCompletionTrigger = /\{:[\w]*/
//!!! make sure to also change the below expression in ilias-builder.js !!!
export const randomAndTemplateTag = /\{(:)([\w]*)}/g

export const TAG_CLASS_NAMES = {
    rnd: 'random-tag-placeholder',
    templ: 'template-tag-placeholder',
}

export function createTagCompletions(tagSet: Ref<IRandomizerSet | undefined>) {
    return (context: CompletionContext): CompletionResult | null => {
        const word = context.matchBefore(tagCompletionTrigger)
        if (!word || (word.from == word.to && !context.explicit)) {
            return null
        }

        if (!tagSet.value?.values.length) {
            return null
        }

        return {
            from: word.from,
            options: tagSet.value.values.map((tag) => ({
                label: `{:${tag.tag}}`,
                detail: tag.value,
                apply: `{:${tag.tag}}`,
                type: 'keyword',
            })),
        }
    }
}

export function createTagTooltip(
    tagMarkField: StateField<any>,
    tagSet: Ref<IRandomizerSet | undefined>
) {
    return hoverTooltip((view, pos) => {
        const marks = view.state.field(tagMarkField)
        let found: { from: number; to: number } | null = null

        for (let iter = marks.iter(); iter.value !== null; iter.next()) {
            if (pos >= iter.from && pos <= iter.to) {
                found = { from: iter.from, to: iter.to }
                break
            }
        }

        if (found) {
            const tag = view.state.doc.sliceString(found.from + 2, found.to - 1)
            const value = tagSet.value?.values.find((v) => v.tag === tag)?.value
            return {
                pos: found.from,
                above: true,
                create() {
                    const dom = document.createElement('div')
                    dom.className = 'code-tooltip'
                    dom.textContent =
                        value || `"${tag}" is either unknown or has no value in the current set`
                    return { dom }
                },
            }
        }
        return null
    })
}

// Create tag decoration
const createTagMark = (tag: string, tagSet: Ref<IRandomizerSet | undefined>) =>
    Decoration.mark({
        class: `random-tag-placeholder tag-mark-start tag-mark-end tag-mark-shadow${
            !tagSet.value?.values.find((v) => v.tag === tag) ? ' tag-not-found' : ''
        }`,
        tagName: 'span',
    })

// State effects for tag marking
export const addTagMark = StateEffect.define<{ from: number; to: number; tag: string }>()
export const clearTagMarks = StateEffect.define()

// State field for tag decorations
export const createTagMarkField = (tagSet: Ref<IRandomizerSet | undefined>) => {
    return StateField.define<DecorationSet>({
        create() {
            return Decoration.none
        },
        update(marks, tr) {
            marks = marks.map(tr.changes)
            for (const e of tr.effects) {
                if (e.is(clearTagMarks)) {
                    marks = Decoration.none
                } else if (e.is(addTagMark)) {
                    marks = marks.update({
                        add: [createTagMark(e.value.tag, tagSet).range(e.value.from, e.value.to)],
                    })
                }
            }
            return marks
        },
        provide: (f) => EditorView.decorations.from(f),
    })
}

// Helper function to mark tags in text
export function markTags(view: EditorView, tagSet: Ref<IRandomizerSet | undefined>) {
    const text = view.state.doc.toString()
    const matches = Array.from(text.matchAll(randomAndTemplateTag))

    const effects = [
        clearTagMarks.of(null),
        ...matches.map((match) =>
            addTagMark.of({
                from: match.index!,
                to: match.index! + match[0].length,
                tag: match[2],
            })
        ),
    ]

    if (effects.length > 1) {
        view.dispatch({ effects })
    }
}

// Add at the top with other exports
export const createTagHighlightStyle = () =>
    HighlightStyle.define([
        {
            tag: tags.special,
            color: '#e06c75',
            fontWeight: 'bold',
        },
    ])
