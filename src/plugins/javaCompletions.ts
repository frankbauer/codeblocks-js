import { CompletionContext, CompletionResult, autocompletion } from '@codemirror/autocomplete'

// Define interfaces for our completion items
interface JavaCompletionItem {
    label: string
    type: string
    info?: string
    detail?: string
}

// Common Java keywords
const javaKeywords: JavaCompletionItem[] = [
    {
        label: 'public',
        type: 'keyword',
        info: 'Access modifier that makes an element accessible from any class',
    },
    {
        label: 'private',
        type: 'keyword',
        info: 'Access modifier that makes an element accessible only within its class',
    },
    {
        label: 'protected',
        type: 'keyword',
        info: 'Access modifier that makes an element accessible within package and by subclasses',
    },
    { label: 'class', type: 'keyword', info: 'Declares a class' },
    { label: 'interface', type: 'keyword', info: 'Declares an interface' },
    { label: 'extends', type: 'keyword', info: 'Indicates inheritance from a superclass' },
    { label: 'implements', type: 'keyword', info: 'Indicates implementation of interfaces' },
    { label: 'static', type: 'keyword', info: 'Declares a member that belongs to the type itself' },
    {
        label: 'final',
        type: 'keyword',
        info: 'Declares an element that cannot be changed or inherited from',
    },
    { label: 'abstract', type: 'keyword', info: 'Declares an abstract class or method' },
]

// Common Java types
const javaTypes: JavaCompletionItem[] = [
    { label: 'void', type: 'type', info: 'Represents no return value' },
    { label: 'int', type: 'type', info: '32-bit integer' },
    { label: 'long', type: 'type', info: '64-bit integer' },
    { label: 'double', type: 'type', info: '64-bit floating point' },
    { label: 'float', type: 'type', info: '32-bit floating point' },
    { label: 'boolean', type: 'type', info: 'true or false value' },
    { label: 'char', type: 'type', info: '16-bit Unicode character' },
    { label: 'String', type: 'type', info: 'Text string' },
    { label: 'byte', type: 'type', info: '8-bit integer' },
    { label: 'short', type: 'type', info: '16-bit integer' },
    { label: 'char', type: 'type', info: '16-bit Unicode character' },
    { label: 'Integer', type: 'type', info: 'Wrapper class for int' },
    { label: 'Long', type: 'type', info: 'Wrapper class for long' },
    { label: 'Double', type: 'type', info: 'Wrapper class for double' },
    { label: 'Float', type: 'type', info: 'Wrapper class for float' },
    { label: 'Boolean', type: 'type', info: 'Wrapper class for boolean' },
    { label: 'Character', type: 'type', info: 'Wrapper class for char' },
]

// Common Java methods and snippets
const javaSnippets: JavaCompletionItem[] = [
    {
        label: 'main',
        type: 'snippet',
        detail: 'public static void main(String[] args)',
        info: 'Main method - the entry point of a Java program',
    },
    {
        label: 'sout',
        type: 'snippet',
        detail: 'System.out.println();',
        info: 'Print to standard output',
    },
    {
        label: 'fori',
        type: 'snippet',
        detail: 'for (int i = 0; i < length; i++){ }',
        info: 'For loop using a variable i',
    },
    {
        label: 'forj',
        type: 'snippet',
        detail: 'for (int j = 0; j < length; j++){ }',
        info: 'For loop using a variable j',
    },
    {
        label: 'if',
        type: 'snippet',
        detail: 'if () { }',
        info: 'If statement',
    },
    {
        label: 'while',
        type: 'snippet',
        detail: 'while () { }',
        info: 'While loop',
    },
]

// Common Java collections
const javaCollections: JavaCompletionItem[] = [
    {
        label: 'ArrayList<T>',
        type: 'class',
        info: 'Resizable array implementation',
    },
    { label: 'HashMap<K, T>', type: 'class', info: 'Hash table implementation of Map interface' },
    { label: 'LinkedList<T>', type: 'class', info: 'Doubly-linked list implementation' },
    { label: 'HashSet<T>', type: 'class', info: 'Hash table implementation of Set interface' },
]

// Common Java collections
const javaAPI: JavaCompletionItem[] = [
    {
        label: 'System.out.println()',
        type: 'api',
        info: 'Prints to standard output',
    },
    {
        label: 'System.out.print()',
        type: 'api',
        info: 'Prints to standard output without a newline',
    },
    { label: 'Math.abs(x)', type: 'api', info: 'Returns the absolute value of a number' },
    { label: 'Math.max(v0, v1)', type: 'api', info: 'Returns the larger of two numbers' },
    { label: 'Math.min(v0, v1)', type: 'api', info: 'Returns the smaller of two numbers' },
    {
        label: 'Math.pow(x, e)',
        type: 'api',
        info: 'Returns the value of the first argument raised to the power of the second argument',
    },
    { label: 'Math.sqrt(x)', type: 'api', info: 'Returns the square root of a number' },
    {
        label: 'Math.random()',
        type: 'api',
        info: 'Returns a random number between 0.0 and 1.0 (excluded)',
    },
]

// Combine all completions
const allCompletions = [
    ...javaKeywords,
    ...javaTypes,
    ...javaSnippets,
    ...javaCollections,
    ...javaAPI,
]

export function createJavaCompletions(context: CompletionContext): CompletionResult | null {
    const word = context.matchBefore(/\w*/)
    if (!word) {
        return null
    }

    if (word.from == word.to && !context.explicit) {
        return null
    }

    return {
        from: word.from,
        options: allCompletions.map((item) => ({
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
            apply: `${item.detail !== undefined ? item.detail : item.label}`,
        })),
    }
}
