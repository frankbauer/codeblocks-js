import { CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import { createCompletionResult } from './shared'
import { CompletionItem } from './types'

const pythonKeywords: CompletionItem[] = [
    { label: 'def', type: 'keyword' },
    { label: 'class', type: 'keyword' },
    { label: 'return', type: 'keyword' },
    { label: 'import', type: 'keyword' },
    { label: 'from', type: 'keyword' },
    { label: 'if', type: 'keyword' },
    { label: 'elif', type: 'keyword' },
    { label: 'else', type: 'keyword' },
    { label: 'for', type: 'keyword' },
    { label: 'while', type: 'keyword' },
    { label: 'try', type: 'keyword' },
    { label: 'except', type: 'keyword' },
    { label: 'with', type: 'keyword' },
    { label: 'lambda', type: 'keyword' },
    { label: 'pass', type: 'keyword' },
    { label: 'True', type: 'constant' },
    { label: 'False', type: 'constant' },
    { label: 'None', type: 'constant' },
]

const pythonSnippets: CompletionItem[] = [
    {
        label: 'print()',
        type: 'function',
        detail: 'print()',
        apply: 'print()',
        info: 'Print to standard output',
    },
    {
        label: 'import numpy as np',
        type: 'snippet',
        detail: 'import numpy as np',
        apply: 'import numpy as np',
        info: 'Canonical NumPy import alias',
    },
    {
        label: 'np.array()',
        type: 'function',
        detail: 'np.array(...)',
        apply: 'np.array()',
        info: 'Create an ndarray from a sequence',
    },
    {
        label: 'np.arange()',
        type: 'function',
        detail: 'np.arange(start, stop, step)',
        apply: 'np.arange()',
        info: 'Evenly spaced values within interval',
    },
    {
        label: 'np.linspace()',
        type: 'function',
        detail: 'np.linspace(start, stop, num)',
        apply: 'np.linspace()',
        info: 'Evenly spaced values over interval',
    },
    {
        label: 'np.zeros()',
        type: 'function',
        detail: 'np.zeros(shape)',
        apply: 'np.zeros()',
        info: 'Array of zeros',
    },
    {
        label: 'np.ones()',
        type: 'function',
        detail: 'np.ones(shape)',
        apply: 'np.ones()',
        info: 'Array of ones',
    },
    {
        label: 'np.random.rand()',
        type: 'function',
        detail: 'np.random.rand(d0, d1, ...)',
        apply: 'np.random.rand()',
        info: 'Random values in a given shape',
    },
    {
        label: 'np.mean()',
        type: 'function',
        detail: 'np.mean(a)',
        apply: 'np.mean()',
        info: 'Compute arithmetic mean',
    },
    {
        label: 'np.std()',
        type: 'function',
        detail: 'np.std(a)',
        apply: 'np.std()',
        info: 'Compute standard deviation',
    },
]

const pythonBaseCompletions = [...pythonKeywords, ...pythonSnippets]

export function createPythonCompletions(context: CompletionContext): CompletionResult | null {
    return createCompletionResult(context, pythonBaseCompletions)
}
