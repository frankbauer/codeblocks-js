import { EditorView } from 'codemirror'
import { ChangeSpec, EditorSelection, type Line } from '@codemirror/state'
import { indentNodeProp } from '@codemirror/language'

function reformatCode(
    view: EditorView,
    getIndentationInSource: (docString: string, pos: number) => number
): void {
    const changes: ChangeSpec[] = []
    const doc = view.state.doc
    const docString = doc.toString()

    for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i)
        const currentIndent = /^[\t ]*/.exec(line.text)![0].length
        const indent = getIndentationInSource(docString, line.from)

        if (currentIndent !== indent) {
            changes.push({
                from: line.from,
                to: line.from + currentIndent,
                insert: ' '.repeat(indent),
            })
        }
    }

    if (changes.length > 0) {
        view.dispatch({ changes })
    }
}

export function createDOMEventHandlers(
    getIndentationInSource: (docString: string, pos: number) => number
) {
    return EditorView.domEventHandlers({
        keydown: (event: KeyboardEvent, view: EditorView) => {
            if (event.key === 'ƒ') {
                if (event.altKey) {
                    event.preventDefault()
                    reformatCode(view, getIndentationInSource)
                    return false
                }
            }

            if (event.key === 'Tab') {
                event.preventDefault()
                if (event.shiftKey && event.altKey) {
                    // Handle Shift+Alt+Tab for reindenting the text
                    reformatCode(view, getIndentationInSource)
                    return false
                }
                if (event.shiftKey) {
                    // Handle Shift+Tab for unindent
                    return view.dispatch(
                        view.state.changeByRange((range) => {
                            const lines = view.state.doc.lineAt(range.from).number
                            const endLine = view.state.doc.lineAt(range.to).number
                            const changes: { from: number; to: number; insert: string }[] = []
                            for (let pos = lines; pos <= endLine; pos++) {
                                const line = view.state.doc.line(pos)
                                const text = view.state.doc
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
            }
            return false
        },
    })
}
