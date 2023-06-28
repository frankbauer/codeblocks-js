declare const JavaExec: {
    setRunButton: (value: boolean, name?: string) => void
    showMessage: (msg: string | null) => void
    reroutStdStreams: () => void
    ready: boolean
    initialize: (cb: () => void) => void
    initFileSystems: (baseFolder: String, forceReload: boolean, cb: () => void) => void
}
