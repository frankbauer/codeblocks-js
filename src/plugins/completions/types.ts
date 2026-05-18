export interface CompletionItem {
    label: string
    type: string
    info?: string
    detail?: string
    apply?: string
}

export interface CompletionOptions {
    includeRuntime?: boolean
}
