export interface IParsedError {
    line: number
    column: number
    msg: string
}

export interface ILegacyPlaygroundObject {
    init(canvasElement: JQuery<HTMLElement>): void
    reset?(canvasElement: JQuery<HTMLElement>): void
    update(output: string | object | undefined, canvasElement: JQuery<HTMLElement>): string | undefined
    onParseError?(initialOutput: string, parseError: string): void
}
export interface IPlaygroundObject {
    init(canvasElement: JQuery<HTMLElement>, outputElement: JQuery<HTMLElement>, scope: JQuery<HTMLElement>): void
    reset?(canvasElement: JQuery<HTMLElement>): void
    update(txt: string, json: object | undefined, canvasElement: JQuery<HTMLElement>, outputElement: JQuery<HTMLElement>): string | undefined
    onParseError?(initialOutput: string, parseError: string): void
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
