import { CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import { createCompletionResult } from './shared'
import { CompletionItem } from './types'

const jsonCompletions: CompletionItem[] = [
    { label: 'true', type: 'constant', info: 'JSON boolean true' },
    { label: 'false', type: 'constant', info: 'JSON boolean false' },
    { label: 'null', type: 'constant', info: 'JSON null value' },
    {
        label: 'object',
        type: 'snippet',
        detail: '{ "key": "value" }',
        apply: '{\n  "key": "value"\n}',
        info: 'JSON object snippet',
    },
    {
        label: 'array',
        type: 'snippet',
        detail: '[ "value" ]',
        apply: '[\n  "value"\n]',
        info: 'JSON array snippet',
    },
]

export function createJsonCompletions(context: CompletionContext): CompletionResult | null {
    return createCompletionResult(context, jsonCompletions)
}
