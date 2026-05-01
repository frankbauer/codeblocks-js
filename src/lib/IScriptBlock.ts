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

    RESOURCES: any[]
    DATA: any[]
}

export interface ILibraryObject {
    // Injected by ScriptBlockV102 before any method call
    canvasElement: JQuery<HTMLElement>
    outputElement: JQuery<HTMLElement> | undefined
    scope: ICodeBlockScope
    runner: Runner | undefined

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

    onParseError(initialOutput: string, parseError: string): boolean

    runConfig: null | ICompileAndRunArguments

    didReceiveMessage(cmd: string, data: any): void

    beforeStart(): void
    afterStop(): void

    whenFinished(args: string[] | object, resultData?: object | any[]): void

    resetResources(): void

    resetBlockData(blocks: IBlockData[] | undefined): void
}
