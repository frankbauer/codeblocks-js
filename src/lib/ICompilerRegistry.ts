export interface IListItemData {
    readonly label: string
    readonly value: string
}

export interface ICompilerErrorDescription {}

export interface ICompilerRegistry {
    registerDOMLib(uri: string[], name: string, version: string, displayName: string, utility?: boolean, order?: number): void
}

export interface ICompilerInstance {
    readonly version: string
    readonly language: string
    readonly canRun: boolean
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
    readonly languageType: string
    version: string
}
