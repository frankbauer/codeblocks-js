import { IBlockData } from './ICodeBlocks'
import { ICompileAndRunArguments } from './ICompilerRegistry'

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
export interface IPlaygroundObject {
    init(
        canvasElement: JQuery<HTMLElement>,
        outputElement: JQuery<HTMLElement>,
        scope: JQuery<HTMLElement>,
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
        scope: JQuery<HTMLElement>
    ): void
    RESOURCES: any[]
    DATA: any[]
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
    requestsOriginalVersion(): void
    invalidate(): void
    rebuild(code?: string): void
    pushError(e: any): void

    setupDOM(canvasElement: JQuery<HTMLElement>, scope: JQuery<HTMLElement>): void
    init(canvasElement: JQuery<HTMLElement>, scope: JQuery<HTMLElement>, runner: () => void): void
    reset(canvasElement: JQuery<HTMLElement>): void
    update(
        outputObject: IScriptOutputObject,
        canvasElement: JQuery<HTMLElement>
    ): string | undefined
    addArgumentsTo(args: object | string[]): void
    onParseError(initialOutput: string, parseError: string): boolean

    runConfig: null | ICompileAndRunArguments
    didReceiveMessage(cmd: string, data: any)
    beforeStart()
    whenFinished(args: string[] | object, resultData: object | any[])
    resetResources()
    resetBlockData(blocks: IBlockData[] | undefined)
}
