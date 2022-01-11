import 'reflect-metadata'
import { Vue, Component } from 'vue-property-decorator'
import {
    ICompilerInstance,
    ICompilerErrorDescription,
    ErrorSeverity,
    finishedCallbackSignatur,
    ICompileAndRunArguments,
} from '@/lib/ICompilerRegistry'

let spareWorker: Worker | undefined
let runningWorker: Worker | undefined
function getWorker(setReady: (boolean) => void) {
    if (!window.Worker) {
        return undefined
    }

    setReady(false)
    if (runningWorker !== undefined) {
        console.d('FORCE STOPPING ON RERUN')
        runningWorker.end(Vue.$l('CodeBlocks.UserCanceled'))
        runningWorker = undefined
    }

    runningWorker = spareWorker
    console.i('Starting Spare Pyodide Server')
    spareWorker = new Worker(Vue.$CodeBlock.baseurl + 'js/python/v102/pyWorker.js')
    spareWorker.onmessage = function (msg: any) {
        if (msg.data.command == 'finished-init') {
            setReady(true)
        }
    }
    spareWorker.postMessage({
        command: 'initialize',
        id: '0',
    })
    return runningWorker
}

function runPythonWorker(
    questionID: string,
    code: string,
    callingCodeBlocks: any,
    options: ICompileAndRunArguments,
    setReady: (boolean) => void
): Worker | undefined {
    const {
        max_ms,
        log_callback,
        info_callback,
        err_callback,
        compileFailedCallback,
        finishedExecutionCB,
        args,
    } = options

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
    const worker = getWorker(setReady)
    if (worker === undefined) {
        err_callback('CRITICAL-ERROR: Unable to get background worker.')
        return
    }

    worker.onmessage = function (msg: any) {
        console.d('jsrunner message', questionID, executionFinished, msg.data, msg.data.command)
        //only accept messages, as long as the worker is not terminated
        if (executionFinished) {
            return
        }

        const time = performance.now() - startTime
        if (time > max_ms) {
            triggerTimeout()
        }

        if (msg.data.command == 'finished') {
            if (options.allowMessagePassing) {
                options.whenFinishedHandler(msg.data.args)
            }
            if (msg && msg.data && msg.data.args) {
                args['return'] = msg.data.args
            } else {
                args['return'] = {}
            }
            console.d('returned msg:', msg, ', args:', args)
            executionFinished = true
            finishedExecutionCB(true, undefined, args['return'])
            console.i('Execution finished in ' + time + ' ms\n')
            //info_callback('Info: Execution finished in ' + time + ' ms\n')
            worker.end()
        } else if (msg.data.command == 'exception') {
            if (compileFailedCallback) {
                compileFailedCallback({
                    message: msg.data.text,
                    start: {
                        line: msg.data.lineNumber,
                        column: 0,
                    },
                    end: {
                        line: msg.data.lineNumber,
                        column: 0,
                    },
                    severity:
                        msg.data.severity == 'ERROR' ? ErrorSeverity.Error : ErrorSeverity.Warning,
                })
            }
        } else if (msg.data.command == 'log') {
            log_callback(msg.data.s + '\n')
        } else if (msg.data.command == 'err') {
            err_callback(msg.data.s + '\n')
        } else if (msg.data.command == 'main-will-start') {
            options.beforeStartHandler()
        } else if (msg.data.command == 'main-finished') {
            console.d('MESSAGE - Main Finished')
            //set up the real message handler
            options.postMessageFunction = (cmd, data) => {
                data = { ...data }
                console.d('MESSAGE - JS Post ', cmd, data)
                data.command = cmd
                data.id = questionID
                worker.postMessage(data)
            }

            options.postMessageFunction('main-finished', {})

            //make sure to send all queued messages now
            options.dequeuePostponedMessages()

            options.whenFinishedHandler(msg.data.args)
        } else if (msg.data.command == 'w-exit-keepalive' || msg.data.command == 'exit-keepalive') {
            //Make sure a keep-alive session can do proper cleanup
            if (options.keepAlive) {
                worker.postMessage({
                    command: 'session-ended',
                    id: '' + questionID,
                })
            }
        } else if (msg.data.command.indexOf('w-') == 0) {
            msg.data.command = msg.data.command.substr(2)
        } else {
            console.i('MESSAGE - ', msg.data)
            worker.end(
                'HackerError: Great! You invaded our System. Sadly this will lead you nowhere. Please focus on the Test.'
            )
        }
    }

    worker.onerror = function (e) {
        compileFailedCallback({
            start: { line: e.lineno - 3, column: e.colno - 1 },
            end: { line: e.lineno - 3, column: e.colno },
            message: e.message,
            severity: ErrorSeverity.Error,
        })
        worker.end('Line ' + (e.lineno - 3) + ': ' + e.message)
    }

    worker.end = function (msg) {
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

    const startExecution = function (args: object, options: ICompileAndRunArguments) {
        //start worker execution
        worker.postMessage({
            command: 'start',
            code: code,
            args: args,
            messagePosting: options.allowMessagePassing,
            keepAlive: options.keepAlive,
        })

        //stop Worker execution when the time limit is exceeded;
        setTimeout(triggerTimeout, max_ms)
    }

    let willStartExecution = false
    callingCodeBlocks.workerLibraries.forEach((l) => {
        if (l === 'd3-101') {
            willStartExecution = true
            callingCodeBlocks.$compilerRegistry.loadLibraries(
                ['d3-5.13.4', 'd3proxy-101'],
                function () {
                    worker.postMessage({ command: 'importD3' })
                    startExecution(args, options)
                }
            )
        } else if (l === 'brain-2.0.0') {
            willStartExecution = true
            callingCodeBlocks.$compilerRegistry.loadLibraries([], function () {
                worker.postMessage({ command: 'importBrain' })
                startExecution(args, options)
            })
        }
    })

    if (!willStartExecution) {
        startExecution(args, options)
    }

    return worker
}

//ICompilerInstance
@Component
export class PythonV102Compiler extends Vue implements ICompilerInstance {
    readonly version = '102'
    readonly language = 'python'
    readonly canRun = true
    readonly canStop = true
    readonly allowsContinousCompilation = true
    readonly allowsPersistentArguments = true
    readonly allowsMessagePassing = false
    readonly acceptsJSONArgument = true
    readonly experimental = true
    readonly deprecated = false
    isReady = false
    isRunning = false

    preload() {
        getWorker(this.setReady.bind(this)) //this will initialize our first worker
    }

    private setReady(val: boolean) {
        console.i('Changing READY-State to ' + val)
        this.isReady = val
    }

    private worker: Worker | undefined = undefined
    compileAndRun(
        questionID: string,
        code: string,
        callingCodeBlocks: any,
        options: ICompileAndRunArguments
    ): void {
        this.worker = runPythonWorker(
            questionID,
            code,
            callingCodeBlocks,
            options,
            this.setReady.bind(this)
        )
    }

    stop() {
        console.d('FORCE STOPPING')
        if (this.worker) {
            this.worker.end(Vue.$l('CodeBlocks.UserCanceled'))
        }
    }
}

export const pythonCompiler_V102 = new PythonV102Compiler()

export default {
    python3: pythonCompiler_V102,
}
