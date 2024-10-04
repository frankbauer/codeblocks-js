import {
    ICompilerInstance,
    ICompilerErrorDescription,
    ErrorSeverity,
    finishedCallbackSignatur,
    ICompileAndRunArguments,
    CallingCodeBlocks,
} from '@/lib/ICompilerRegistry'
import { globalState } from '@/lib/globalState'
import Vue from 'vue'
import { l } from '@/plugins/i18n'

function runPythonWorker(
    questionID: string,
    prog: string,
    callingCodeBlocks: CallingCodeBlocks,
    maxRuntime: number,
    logCallback: (txt: string) => void,
    infoCallback: (txt: string) => void,
    errCallback: (txt: string) => void,
    compileFailedCallback: (info: ICompilerErrorDescription) => void,
    finishCallback: finishedCallbackSignatur,
    legacy: boolean
): Worker | undefined {
    console.log('Python Version:', legacy ? '2.7' : '3')

    // the Python program
    prog = prog.replaceAllPoly('\t', '    ')

    if (!window.Worker) {
        errCallback(
            'CRITICAL-ERROR: your browser does not support WebWorkers!! (please consult a Tutor).'
        )
        return
    }

    const worker = new Worker(globalState.appState.baseurl + 'js/python/v101/pyWorker.js')

    // construct message for worker
    const pyInp = [] // not used jet

    const messageData = {
        pyProg: prog,
        pyInp: pyInp,
        maxMS: maxRuntime,
        legacy: legacy,
    }
    worker.postMessage(['b8e493ca02970aeb0ef734556526bf9b', messageData])
    const start = Date.now()

    const testTimeout = function () {
        const time = Date.now() - start
        worker.end(
            'TimeoutError:  Execution took too long (> ' +
                time +
                ' ms) and was terminated. There might be an endless loop in your code.'
        )
    }

    const testTimeoutIntern = function () {
        const time = Date.now() - start
        if (time > maxRuntime) {
            testTimeout()
            return true
        }
        return false
    }
    let executionFinished = false
    worker.end = function (msg) {
        if (executionFinished) {
            return
        }
        worker.terminate()
        executionFinished = true
        finishCallback(false)
        if (msg) {
            errCallback(msg)
        }
    }

    worker.onmessage = function (e) {
        if (executionFinished) {
            return
        }
        //only accept messages, when worker not terminated (workers do not immetiately terminate)
        if (testTimeoutIntern() === true) {
            return
        }
        if (e.data[0] == 'finished') {
            logCallback(e.data[1].stdOut)
            finishCallback(true)
            console.i('Execution finished in ' + (Date.now() - start) + ' ms\n')
            //infoCallback('Info: Execution finished in : ' + (Date.now() - start) + ' ms')
            worker.end()
        } else if (e.data[0] === 'err') {
            const err = JSON.parse(e.data[2])
            if (err && err.lineno !== undefined && err.colno !== undefined) {
                compileFailedCallback({
                    start: {
                        line: err.lineno - 1,
                        column: err.colno,
                    },
                    end: {
                        line: err.lineno - 1,
                        column: err.colno + 1,
                    },
                    message: err.message,
                    severity: ErrorSeverity.Error,
                })
            } else {
                if (err && err.lineno !== undefined) {
                    compileFailedCallback({
                        start: {
                            line: err.lineno - 1,
                            column: 0,
                        },
                        end: {
                            line: err.lineno - 1,
                            column: 0,
                        },
                        message: err.message,
                        severity: ErrorSeverity.Error,
                    })
                }
            }
            worker.end('ERROR: ' + e.data[1])
        } else {
            worker.end('Unknown error: ' + e.data[1])
        }
    }
    // in any case use the window timeout to terminate the worker
    setTimeout(testTimeout, maxRuntime)

    return worker
}

//ICompilerInstance
export class PythonV101LegacyCompiler implements ICompilerInstance {
    readonly version = '101'
    readonly language = 'python'
    readonly canRun = true
    readonly canStop = true
    readonly allowsContinousCompilation = true
    readonly allowsPersistentArguments = false
    readonly allowsMessagePassing = false
    readonly acceptsJSONArgument = false
    readonly allowsREPL = false
    readonly experimental = false
    readonly deprecated = false
    readonly isReady = true
    readonly isRunning = false

    preload() {}

    private worker: Worker | undefined = undefined

    compileAndRun(
        questionID: string,
        code: string,
        callingCodeBlocks: CallingCodeBlocks,
        options: ICompileAndRunArguments
    ): void {
        const {
            max_ms,
            log_callback,
            info_callback,
            err_callback,
            compileFailedCallback,
            finishedExecutionCB,
            args,
        } = options
        this.worker = runPythonWorker(
            questionID,
            code,
            callingCodeBlocks,
            max_ms,
            log_callback,
            info_callback,
            err_callback,
            compileFailedCallback,
            finishedExecutionCB,
            true
        )
    }

    stop() {
        console.d('FORCE STOPPING')
        if (this.worker) {
            this.worker.end(l('CodeBlocks.UserCanceled'))
        }
    }
}

//ICompilerInstance
export class PythonV101Compiler implements ICompilerInstance {
    readonly version = '101'
    readonly language = 'python'
    readonly canRun = true
    readonly canStop = true
    readonly allowsContinousCompilation = true
    readonly allowsPersistentArguments = false
    readonly allowsMessagePassing = false
    readonly acceptsJSONArgument = false
    readonly allowsREPL = false
    readonly experimental = false
    readonly deprecated = false
    isReady = true
    isRunning = false

    preload() {}

    private worker: Worker | undefined = undefined

    compileAndRun(
        questionID: string,
        code: string,
        callingCodeBlocks: CallingCodeBlocks,
        options: ICompileAndRunArguments
    ): void {
        const {
            max_ms,
            log_callback,
            info_callback,
            err_callback,
            compileFailedCallback,
            finishedExecutionCB,
            args,
        } = options
        this.worker = runPythonWorker(
            questionID,
            code,
            callingCodeBlocks,
            max_ms,
            log_callback,
            info_callback,
            err_callback,
            compileFailedCallback,
            finishedExecutionCB,
            false
        )
    }

    stop() {
        console.d('FORCE STOPPING')
        if (this.worker) {
            this.worker.end(l('CodeBlocks.UserCanceled'))
        }
    }
}

export const pythonCompiler_V101 = new PythonV101Compiler()
export const pythonLegacyCompiler_V101 = new PythonV101LegacyCompiler()

export default {
    legacyPython: pythonLegacyCompiler_V101,
    python3: pythonCompiler_V101,
}
