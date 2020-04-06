export interface IParsedError {
    line: number
    column: number
    msg: string
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
    requestsOriginalVersion(): void
    invalidate(): void
    rebuild(code?: string): void
    pushError(e: any): void

    init(canvasElement: JQuery<HTMLElement>, scope: JQuery<HTMLElement>, runner: () => void): void
    reset(canvasElement: JQuery<HTMLElement>): void
    update(
        outputObject: IScriptOutputObject,
        canvasElement: JQuery<HTMLElement>
    ): string | undefined
    addArgumentsTo(args: object | string[]): void
    onParseError(initialOutput: string, parseError: string): boolean
}
