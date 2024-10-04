import MainBlock from '@/lib/MainBlock'
import { BlockData, IAppSettings } from '@/lib/codeBlocksManager'

export type finishedCallbackSignatur = (
    success: boolean,
    overrideOutput?: any,
    returnState?: any
) => void

export interface IListItemData {
    readonly label: string
    readonly value: string
}

export enum ErrorSeverity {
    Error = 2,
    Warning = 1,
}

export interface IErrorPosition {
    line: number
    column: number
}

export interface ICompilerErrorDescription {
    start: IErrorPosition
    end: IErrorPosition
    message: string
    severity: ErrorSeverity
}

export interface IDomLibraray {
    key: string
    uri: string[]
    name: string
    version: string
    displayName: string
    didLoad: boolean
    utility: boolean
    order: number
    onBuildSandboxEnv: (sandbox: any) => void
}

export interface ICompilerHashMap {
    [lang: string]: ICompilerInfo
}

export interface IUpdateMappingMap {
    [old: string]: string
}

export interface ICompilerState {
    hideGlobalState(): void

    setAllRunButtons(what: boolean): void

    displayGlobalState(message: string | null): void

    readonly globalStateHidden: boolean
    readonly globalStateMessage: string
    readonly runButtonForceHide: boolean
}

export interface ICompilerRegistry {
    readonly languages: IListItemData[]
    readonly domLibraries: IListItemData[]

    register(compilers: ICompilerInfo[] | ICompilerInfo): void

    registerSingle(c: ICompilerInfo): void

    getCompiler(compilerInfo: ICompilerIDQuery): ICompilerInstance | undefined

    versionsForLanguage(languageType: string): string[] | ['none']

    registerDOMLib(
        uri: string[],
        name: string,
        version: string,
        displayName: string,
        utility?: boolean,
        order?: number
    ): void

    getLibObjects(domLibs: string[]): IDomLibraray[]

    urisForDOMLibs(domLibs: string[]): string[]

    loadLibraries(domLibraries: string[], whenLoaded: () => void): void
}

export interface ICompileAndRunArguments {
    max_ms: number
    log_callback: (txt: string) => void
    info_callback: (txt: string) => void
    err_callback: (txt: string) => void
    compileFailedCallback: (info: ICompilerErrorDescription) => void
    finishedExecutionCB: finishedCallbackSignatur
    args: object
    didReceiveMessage: (cmd: string, data: any) => void
    postMessageFunction: null | ((cmd: string, data: any) => void)
    dequeuePostponedMessages: () => void
    beforeStartHandler: () => void

    whenFinishedHandler(args: string[] | object): void

    allowMessagePassing: boolean
    keepAlive: boolean
    withREPL: boolean
    resultData: Object | any[] | undefined
}

export interface IReplInstance {
    interpreter(
        command: string,
        onStateChange: (incomplete) => void,
        onLog: (msg) => void,
        onError: (msg) => void
    ): Promise<object>
}

export interface CallingCodeBlocks {
    workerLibraries: string[]
    $compilerRegistry: ICompilerRegistry
    blocks: BlockData[]
}

export interface ICompilerInstance {
    readonly version: string
    readonly language: string
    readonly canRun: boolean
    readonly canStop: boolean
    readonly allowsMessagePassing: boolean
    readonly allowsREPL: boolean
    readonly allowsContinousCompilation: boolean
    readonly allowsPersistentArguments: boolean
    readonly acceptsJSONArgument: boolean
    readonly experimental: boolean
    readonly deprecated: boolean
    isReady: boolean
    isRunning: boolean
    readonly libraries?: ICompilerLibraryInfo[]

    registerLibs?(compilerRegistry: ICompilerRegistry): void

    preload(): void

    compileAndRun(
        questionID: string,
        code: string,
        callingCodeBlocks: CallingCodeBlocks,
        options: ICompileAndRunArguments,
        runCreate?: boolean
    ): void

    stop?(): void
}

export interface ICompilerLibraryInfo {
    readonly key: string
    readonly name: string
    readonly version: string
    readonly displayName: string
}

export interface ICompilerInfo {
    readonly type: string
    readonly displayName: string
    readonly versions: ICompilerInstance[]
    readonly default: ICompilerInstance
}

export interface ICompilerID {
    languageType: string
    version: string
}

export interface ICompilerIDQuery {
    languageType: string
    version?: string
}
