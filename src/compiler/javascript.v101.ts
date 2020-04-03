import 'reflect-metadata'
import { Vue, Component } from 'vue-property-decorator'
import {
    ICompilerInstance,
    ICompilerErrorDescription,
    ICompilerRegistry,
    ErrorSeverity
} from '@/lib/ICompilerRegistry'

declare global {
    interface Worker {
        end(msg?: string): void
    }
}

function runJavaScriptWorker(
    questionID: string,
    code: string,
    callingCodeBlocks: any,
    max_ms: number,
    log_callback: (txt: string) => void,
    info_callback: (txt: string) => void,
    err_callback: (txt: string) => void,
    compileFailedCallback: (info: ICompilerErrorDescription) => void,
    finishedExecutionCB: (success: boolean, overrideOutput?: any) => void
): Worker | undefined {
    //WebWorkers need to be supported
    if (!window.Worker) {
        err_callback(
            'CRITICAL-ERROR: your browser does not support WebWorkers! (please consult a Tutor).'
        )
        return
    }

    //const lines = code.split('\n').length;
    const startTime = performance.now()
    let executionFinished = false
    const worker = new Worker(Vue.$CodeBlock.baseurl + 'js/javascript/v101/jsWorker.js')

    worker.onmessage = function(msg) {
        //only accept messages, as long as the worker is not terminated
        if (executionFinished) {
            return
        }

        const time = performance.now() - startTime
        if (time > max_ms) {
            triggerTimeout()
        }

        switch (msg.data[0]) {
            case 'finished':
                executionFinished = true
                finishedExecutionCB(true)
                info_callback('Info: Execution finished in ' + time + ' ms\n')
                worker.end()
                break
            case 'log':
                log_callback(msg.data[1] + '\n')
                break
            case 'err':
                err_callback(msg.data[1] + '\n')
                break
            default:
                worker.end(
                    'HackerError: Great! You invaded our System. Sadly this will lead you nowhere. Please focus on the Test.'
                )
                break
        }
    }

    worker.onerror = function(e) {
        compileFailedCallback({
            start: { line: e.lineno - 3, column: e.colno - 1 },
            end: { line: e.lineno - 3, column: e.colno },
            message: e.message,
            severity: ErrorSeverity.Error
        })
        worker.end('Line ' + (e.lineno - 3) + ': ' + e.message)
    }

    worker.end = function(msg) {
        if (executionFinished) {
            return
        }
        worker.terminate()
        executionFinished = true
        //when aborting, the result is 'undefined'
        if (msg) {
            err_callback(msg + '\n')
        }
        finishedExecutionCB(false)
    }

    function triggerTimeout() {
        worker.end(
            'TimeoutError:  Execution took too long (>' +
                (performance.now() - startTime) +
                'ms) and was terminated. There might be an endless loop in your code.'
        )
    }

    let startExecution = function() {
        //start worker execution
        worker.postMessage(['start', code])

        //stop Worker execution when the time limit is exceeded;
        setTimeout(triggerTimeout, max_ms)
    }

    let willStartExecution = false
    callingCodeBlocks.workerLibraries.forEach(l => {
        if (l === 'd3-101') {
            willStartExecution = true
            callingCodeBlocks.$compilerRegistry.loadLibraries(
                ['d3-5.13.4', 'd3proxy-101'],
                function() {
                    worker.postMessage(['importD3'])
                    startExecution()
                }
            )
        } else if (l === 'brain-2.0.0') {
            willStartExecution = true
            callingCodeBlocks.$compilerRegistry.loadLibraries([], function() {
                worker.postMessage(['importBrain'])
                startExecution()
            })
        }
    })

    if (!willStartExecution) {
        startExecution()
    }

    return worker
}
@Component
export class JavascriptV101Compiler extends Vue implements ICompilerInstance {
    readonly version = '101'
    readonly language = 'javascript'
    readonly canRun = true
    readonly isReady = true
    isRunning = false
    readonly canStop = true
    readonly allowsContinousCompilation = true
    readonly acceptsJSONArgument = true
    libraries = [
        {
            key: 'd3-101',
            name: 'd3',
            version: '5.14.3',
            displayName: 'D3 - Proxy'
        },
        {
            key: 'brain-2.0.0',
            name: 'Brain.js',
            version: '2.0.0-alpha',
            displayName: 'Brain.js'
        }
    ]

    registerLibs?(compilerRegistry: ICompilerRegistry): void {
        compilerRegistry.registerDOMLib(
            [Vue.$CodeBlock.baseurl + 'js/javascript/v101/d3DomProxyToHTML.js'],
            'd3proxy',
            '101',
            'D3 - Proxy',
            true //makes it a utility lib => not selectable by users
        )
    }
    preload() {}
    private worker: Worker | undefined = undefined
    compileAndRun(
        questionID: string,
        code: string,
        callingCodeBlocks: any,
        max_ms: number,
        log_callback: (txt: string) => void,
        info_callback: (txt: string) => void,
        err_callback: (txt: string) => void,
        compileFailedCallback: (info: ICompilerErrorDescription) => void,
        finishedExecutionCB: (success: boolean, overrideOutput?: any) => void
    ): void {
        this.worker = runJavaScriptWorker(
            questionID,
            code,
            callingCodeBlocks,
            max_ms,
            log_callback,
            info_callback,
            err_callback,
            compileFailedCallback,
            finishedExecutionCB
        )
    }

    stop() {
        console.d('FORCE STOPPING')
        if (this.worker) {
            this.worker.end(Vue.$l('CodeBlocks.UserCanceled'))
        }
    }
}

export const javascriptCompiler_V101 = new JavascriptV101Compiler()
export default javascriptCompiler_V101
