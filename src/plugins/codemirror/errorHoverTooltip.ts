import { Decoration, hoverTooltip } from '@codemirror/view'
import { ErrorSeverity } from '@/lib/ICompilerRegistry'
import { ComputedRef } from 'vue'

// Add proper interface for error ranges
export interface ErrorRange {
    from: number
    to: number
    severity: ErrorSeverity
    message: string
    decoration?: Decoration
}

export function createErrorHoverTooltip(errorRanges: ComputedRef<ErrorRange[]>) {
    return hoverTooltip((view, pos) => {
        const error = errorRanges.value.find((e) => pos >= e.from && pos <= e.to)
        if (error) {
            return {
                pos,
                above: true,
                create() {
                    const dom = document.createElement('div')
                    dom.textContent = error.message
                    dom.className =
                        'code-tooltip ' +
                        (error.severity === ErrorSeverity.Warning
                            ? 'warning-tooltip'
                            : 'error-tooltip')
                    return { dom }
                },
            }
        }
        return null
    })
}
