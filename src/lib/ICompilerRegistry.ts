export interface IListItemData {
    readonly label: string
    readonly value: string
}

export enum ErrorSeverity {
    Error = 2,
    Warning = 1
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
}

export interface ICompilerHashMap {
    [lang: string]: ICompilerInfo
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

export interface ICompilerInstance {
    readonly version: string
    readonly language: string
    readonly canRun: boolean
    readonly canStop: boolean
    readonly allowsContinousCompilation: boolean
    readonly acceptsJSONArgument: boolean
    isReady: boolean
    isRunning: boolean
    readonly libraries?: ICompilerLibraryInfo[]

    registerLibs?(compilerRegistry: ICompilerRegistry): void
    preload(): void
    compileAndRun(
        questionID: string,
        code: string,
        callingCodeBlocks: any,
        max_ms: number,
        log_callback: (txt: string) => void,
        info_callback: (txt: string) => void,
        err_callback: (txt: string) => void,
        compileFailedCallback: (info: ICompilerErrorDescription) => void,
        finishedExecutionCB: (success: boolean, overrideOutput?: any) => void,
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
