export interface IListItemData {
    label: string
    value: string
}

export interface ICompilerErrorDescription {

}

export interface ICompilerRegistry {
    registerDOMLib(uri:string[], name:string, version:string, displayName:string, utility?:boolean, order?:number) : void;
}

export interface ICompilerInstance {
    version: string
    language: string
    canRun: boolean
    isReady: boolean
    isRunning: boolean
    libraries?:ICompilerLibraryInfo[]

    registerLibs?(compilerRegistry:ICompilerRegistry):void
    preload(): void
    compileAndRun(
        questionID:string, 
        code:string, 
        callingCodeBlocks:any, 
        max_ms:number, 
        log_callback:(txt:string) => void, 
        info_callback:(txt:string) => void, 
        err_callback:(txt:string) => void, 
        compileFailedCallback:(info:ICompilerErrorDescription) => void, 
        finishedExecutionCB:(success:boolean) => void, 
        runCreate:boolean): void;
}

export interface ICompilerLibraryInfo {
    key: string
    name: string
    version: string
    displayName: string
}

export interface ICompilerInfo {
    type: string
    displayName: string
    versions: ICompilerInstance[]
    default: ICompilerInstance
}

export interface ICompilerID {
    languageType: string
    version: string
}