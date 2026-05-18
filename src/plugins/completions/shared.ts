import { CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import { CompletionItem } from './types'

export function createCompletionResult(
    context: CompletionContext,
    items: CompletionItem[]
): CompletionResult | null {
    const word = context.matchBefore(/[\w.]*/)
    if (!word) {
        return null
    }

    if (word.from === word.to && !context.explicit) {
        return null
    }

    return {
        from: word.from,
        options: items.map((item) => ({
            label: item.label,
            type: item.type,
            detail: item.detail,
            info: item.info
                ? () => {
                      const dom = document.createElement('div')
                      dom.textContent = item.info || null
                      return dom
                  }
                : undefined,
            apply: item.apply ?? (item.detail !== undefined ? item.detail : item.label),
        })),
    }
}
