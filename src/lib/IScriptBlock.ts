import { IBlockData } from './ICodeBlocks'
import { ICompileAndRunArguments } from './ICompilerRegistry'

export type Runner = () => void

export interface IParsedError {
    line: number
    column: number
    msg: string
}

export interface IResourceInfo {
    uri: string
    type: 'json' | 'image' | 'text' | 'blob' | 'buffer'
    name?: string
}

export type CodeEntryType = 'solution' | 'regular' | 'hidden'

// One source code block as seen by v102 playgrounds and libraries through this.CODE (read-only)
export interface ICodeEntry {
    readonly id: number
    readonly uuid: string
    readonly name: string
    readonly type: CodeEntryType
    readonly content: string
}

// Entry passed to alterCodeBeforeRun(code). Only valid while that method runs.
export interface ICodeRunEntry extends ICodeEntry {
    // Content that is used when assembling the source (the override, if one was set)
    readonly content: string
    // Content of the block as stored in the editor
    readonly originalContent: string
    readonly isOverridden: boolean
    // Overrides the content for the upcoming run only. The editor is never changed.
    // Throws when called after alterCodeBeforeRun returned.
    set(content: string): void
    reset(): void
}

export interface ILegacyPlaygroundObject {
    init(canvasElement: JQuery<HTMLElement>): void

    reset?(canvasElement: JQuery<HTMLElement>): void

    update(
        output: string | object | undefined,
        canvasElement: JQuery<HTMLElement>
    ): string | undefined

    onParseError?(initialOutput: string, parseError: string): void
}

export interface ICodeBlockScope {
    find(selector: string): JQuery<HTMLElement>
    each(callback: (index: number, element: HTMLElement) => any): any
    filter(selector: string): JQuery<HTMLElement>
    children(selector?: string): JQuery<HTMLElement>
    [index: number]: HTMLElement
    length: number
}

export type AnyCodeBlockScope = JQuery<HTMLElement> | ICodeBlockScope

export interface IPlaygroundObject {
    init(
        canvasElement: JQuery<HTMLElement>,
        outputElement: JQuery<HTMLElement>,
        scope: AnyCodeBlockScope,
        runner: () => void
    ): void

    reset?(canvasElement: JQuery<HTMLElement>): void

    update(
        txt: string,
        json: object | undefined,
        canvasElement: JQuery<HTMLElement>,
        outputElement: JQuery<HTMLElement>
    ): string | undefined

    onParseError?(initialOutput: string, parseError: string): void

    onMessage?(cmd: string, data: any): void

    beforeStart?(): void

    whenFinished?(args: string[] | object, resultData?: object | any[]): void

    addArgumentsTo?(args: object | string[]): void

    getResources?(): IResourceInfo[]

    setupDOM?(
        canvasElement: JQuery<HTMLElement>,
        outputElement: JQuery<HTMLElement> | undefined,
        scope: AnyCodeBlockScope
    ): void

    RESOURCES: any[]
    DATA: any[]
}

export interface IPlaygroundObjectV102 {
    // Injected by ScriptBlockV102 before any method call — playground code reads these directly
    canvasElement: JQuery<HTMLElement>
    outputElement: JQuery<HTMLElement> | undefined
    scope: ICodeBlockScope
    runner: Runner

    init(): void
    reset?(): void
    update(txt: string, json: object | undefined): string | undefined
    setupDOM?(): void

    onASTAvailable?(ast: any): void
    onParseError?(initialOutput: string, parseError: string): void
    onMessage?(cmd: string, data: any): void
    beforeStart?(): void
    afterStop?(): void
    whenFinished?(args: string[] | object, resultData?: object | any[]): void
    addArgumentsTo?(args: object | string[]): void
    getResources?(): IResourceInfo[]

    // Called right before the source is assembled and sent to the compiler.
    // Use code[i].set(...) to transiently change the code for this run.
    alterCodeBeforeRun?(code: ICodeRunEntry[]): void

    RESOURCES: any[]
    DATA: any[]
    // All source code blocks (in source order), see ICodeEntry
    CODE: ICodeEntry[]
}

export interface ILibraryObject {
    // Injected by ScriptBlockV102 before any method call
    canvasElement: JQuery<HTMLElement>
    outputElement: JQuery<HTMLElement> | undefined
    scope: ICodeBlockScope
    runner: Runner | undefined
    // A container scoped to this library block, for rendering a custom UI.
    // Recreated (emptied out) whenever the playground fully reinitializes, so
    // setupDOM()/init() never end up appending their UI twice.
    libraryElement?: JQuery<HTMLElement>
    // Parsed content of every DATA block in the app, keyed by DATA block name —
    // same convention as this.DATA on a v102 playground.
    DATA?: any[]
    // All source code blocks (in source order), see ICodeEntry
    CODE?: ICodeEntry[]

    name?: string
    create?(context: Record<string, any>): any

    setupDOM?(): void
    init?(): void
    reset?(): void
    update?(txt: string, json: object | undefined): void

    onASTAvailable?(ast: any): void
    onParseError?(initialOutput: string, parseError: string): void
    onMessage?(cmd: string, data: any): void
    beforeStart?(): void
    afterStop?(): void
    whenFinished?(args: string[] | object, resultData?: object | any[]): void
    addArgumentsTo?(args: object | string[]): void
    alterCodeBeforeRun?(code: ICodeRunEntry[]): void
}

export interface IProcessedScriptOutput {
    type: 'json' | 'text' | 'dual'
    text: string
    json: object | undefined
}

export interface IScriptOutputObject {
    output: string
    sansoutput: string
    outputElement: JQuery<HTMLElement>
    initialOutput: string
    processedOutput: IProcessedScriptOutput
    parseError?: string | object
}

export interface IScriptBlock {
    err: IParsedError[]
    version: string

    requestsOriginalVersion(): boolean

    invalidate(): void

    rebuild(code?: string): void

    pushError(e: any): void

    setupDOM(canvasElement: JQuery<HTMLElement>, scope: AnyCodeBlockScope): void

    init(canvasElement: JQuery<HTMLElement>, scope: AnyCodeBlockScope, runner: () => void): void

    reset(canvasElement: JQuery<HTMLElement>): void

    update(
        outputObject: IScriptOutputObject,
        canvasElement: JQuery<HTMLElement>
    ): string | undefined

    onASTAvailable(ast: any): void

    addArgumentsTo(args: object | string[]): void

    // Receives the entries used to assemble the source for the upcoming run.
    // Implementations may call set() on them; the change only affects this run.
    alterCodeBeforeRun(code: ICodeRunEntry[]): void

    onParseError(initialOutput: string, parseError: string): boolean

    runConfig: null | ICompileAndRunArguments

    didReceiveMessage(cmd: string, data: any): void

    beforeStart(): void
    afterStop(): void

    whenFinished(args: string[] | object, resultData?: object | any[]): void

    resetResources(): void

    resetBlockData(blocks: IBlockData[] | undefined): void
}
