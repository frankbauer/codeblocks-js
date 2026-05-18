import { CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import { createCompletionResult } from './shared'
import { CompletionItem, CompletionOptions } from './types'

const jsKeywords: CompletionItem[] = [
    { label: 'const', type: 'keyword' },
    { label: 'let', type: 'keyword' },
    { label: 'var', type: 'keyword' },
    { label: 'function', type: 'keyword' },
    { label: 'class', type: 'keyword' },
    { label: 'return', type: 'keyword' },
    { label: 'if', type: 'keyword' },
    { label: 'else', type: 'keyword' },
    { label: 'for', type: 'keyword' },
    { label: 'while', type: 'keyword' },
    { label: 'async', type: 'keyword' },
    { label: 'await', type: 'keyword' },
]

const jsSnippets: CompletionItem[] = [
    {
        label: 'console.log()',
        type: 'function',
        detail: 'console.log()',
        apply: 'console.log()',
        info: 'Log to stdout',
    },
    {
        label: 'log',
        type: 'snippet',
        detail: 'console.log()',
        apply: 'console.log()',
        info: 'Log to stdout',
    },
    {
        label: 'fori',
        type: 'snippet',
        detail: 'for (let i = 0; i < length; i++) { }',
        apply: 'for (let i = 0; i < length; i++) {\n    \n}',
    },
    {
        label: 'main',
        type: 'snippet',
        detail: 'function main(args) { }',
        apply: 'function main(args) {\n    \n}',
    },
]

const jsRuntimeAPI: CompletionItem[] = [
    {
        label: 'CodeBlocks.postResult(obj)',
        type: 'function',
        info: 'Send structured result data to the output parser',
    },
    {
        label: 'CodeBlocks.postMessage(cmd, id, data)',
        type: 'function',
        info: 'Send a worker message to DOM-side handlers',
    },
    {
        label: 'CodeBlocks.startReceivingEvents(handler)',
        type: 'function',
        info: 'Register a handler for messages from DOM code',
    },
    {
        label: 'CodeBlocks.stopReceivingEvents()',
        type: 'function',
        info: 'Stop receiving DOM-side messages',
    },
    {
        label: 'process.exit(code)',
        type: 'function',
        info: 'Terminate keepAlive sessions',
    },
]

const jsBaseCompletions = [...jsKeywords, ...jsSnippets]

export function createJavaScriptCompletions(
    context: CompletionContext,
    options?: CompletionOptions
): CompletionResult | null {
    const allCompletions = options?.includeRuntime
        ? [...jsBaseCompletions, ...jsRuntimeAPI]
        : jsBaseCompletions
    return createCompletionResult(context, allCompletions)
}
