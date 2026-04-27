import {
    ICompilerInstance,
    ErrorSeverity,
    ICompileAndRunArguments,
    CallingCodeBlocks,
} from '@/lib/ICompilerRegistry'
import { globalState } from '@/lib/globalState'
import { reactive } from 'vue'
import { l } from '@/plugins/i18n'

declare global {
    interface Worker {
        end(msg?: string, terminate?: boolean): void
    }
}

const teaVMRunOverhead = 40000

// ICompilerInstance
export class JavaV102Compiler implements ICompilerInstance {
    readonly version = '102'
    readonly language = 'java'
    readonly canRun = true
    readonly canStop = true
    readonly allowsContinousCompilation = true
    readonly allowsPersistentArguments = true
    readonly allowsMessagePassing = true
    readonly acceptsJSONArgument = true
    readonly canEmitAST = true
    readonly experimental = true
    readonly deprecated = false
    didPreload: boolean = false
    private teaworker: Worker | undefined = undefined
    private teaworkerrun: Worker | undefined = undefined
    isReady = false
    isRunning = false

    preload() {
        if (this.didPreload) {
            return
        }
        this.didPreload = true
        globalState.compilerState.setAllRunButtons(false)

        console.log(`[Preloading TeaVM ${this.version} for Java]`)
        this.isRunning = true
        this.createTeaWorker(() => {
            this.isRunning = false
            globalState.compilerState.hideGlobalState()
            globalState.compilerState.setAllRunButtons(true)
        })
    }

    private createTeaWorker(whenReady: () => void): boolean {
        if (this.teaworker === undefined) {
            globalState.compilerState.setAllRunButtons(false)
            globalState.compilerState.displayGlobalState('Initializing Runtime')
            try {
                this.teaworker = new Worker(
                    `${globalState.appState.baseurl}js/teavm/v${this.version}/worker.js`
                )
            } catch (e) {
                this.teaworker = new Worker(
                    `../assCodeQuestion/js/teavm/v${this.version}/worker.js`
                )
            }

            this.teaworker.addEventListener('message', (e: any) => {
                if (e.data.command == 'initialized') {
                    if (this.teaworker) {
                        this.teaworker.postMessage({
                            command: 'load-classlib',
                            id: 'didload-classlib',
                            url: 'compile-classlib-teavm.bin',
                            runtimeUrl: 'runtime-classlib-teavm.bin',
                        })
                    }
                } else if (e.data.command == 'ok' && e.data.id == 'didload-classlib') {
                    if (this.teaworker) {
                        this.teaworker.postMessage({
                            command: 'compile',
                            id: 'prep',
                            text: 'public class Bootstrap { public static void main(String[] args){}}',
                            mainClass: 'Bootstrap',
                        })
                    }
                } else if (e.data.id == 'prep' && e.data.command == 'compilation-complete') {
                    // Initialization compile is complete.
                    this.isReady = true
                    if (whenReady) {
                        whenReady()
                    } else {
                        globalState.compilerState.setAllRunButtons(true)
                        globalState.compilerState.hideGlobalState()
                    }
                }
            })

            this.teaworker.end = (msg: string, terminate: boolean = true) => {
                if (this.teaworker && terminate) {
                    this.teaworker.terminate()
                    this.teaworker = undefined
                    this.isReady = false
                }
                this.isRunning = false
                if (msg) {
                    console.warn(msg)
                }
            }

            return true
        }

        return false
    }

    private getOrCreateRunWorker(): Worker {
        if (this.teaworkerrun) {
            this.teaworkerrun.end('')
        }

        let workerrun: Worker
        try {
            workerrun = new Worker(
                `${globalState.appState.baseurl}js/teavm/v${this.version}/workerrun.js?&v=001`
            )
        } catch (e) {
            workerrun = new Worker(
                `../assCodeQuestion/js/teavm/v${this.version}/workerrun.js?&v=001`
            )
        }

        workerrun.end = (msg: string) => {
            if (this.teaworkerrun) {
                this.teaworkerrun.terminate()
                this.teaworkerrun = undefined
            }
            if (msg) {
                console.warn(msg)
            }
        }

        this.teaworkerrun = workerrun
        return workerrun
    }

    sessionCompileListener: ((e: any) => void) | undefined = undefined

    compileAndRun(
        questionID: string,
        code: string,
        callingCodeBlocks: CallingCodeBlocks,
        options: ICompileAndRunArguments,
        runCreate: boolean = true
    ): void {
        const {
            max_ms,
            log_callback,
            info_callback,
            err_callback,
            compileFailedCallback,
            finishedExecutionCB,
            args,
            keepAlive,
        } = options
        console.log(`[Starting TeaVM${options.keepAlive ? ' keepAlive' : ''}]`, args)
        const start = Date.now()
        let executionFinished = false
        let booted = false

        if (this.isRunning) {
            err_callback('System is busy. Please wait until compilation finishes or call a tutor.')
            return
        }
        this.isRunning = true
        if (runCreate) {
            if (
                this.createTeaWorker(() => {
                    this.isRunning = false
                    this.compileAndRun(questionID, code, callingCodeBlocks, options, false)
                })
            ) {
                return
            }
        }

        if (!this.isReady) {
            err_callback(
                'System is not yet ready. Please wait until Initialization finishes or call a tutor.'
            )
            this.isRunning = false
            return
        }

        const compilerTimeout = setTimeout(() => {
            if (!booted) {
                const time = Date.now() - start

                if (this.teaworker) {
                    this.teaworker.end(
                        'TimeoutError:  Compilation took too long (>' +
                            time +
                            'ms) and was terminated. Trying to reset the system.'
                    )
                }
            }
        }, teaVMRunOverhead)

        // Simple main class detection for file naming
        const codeWithoutComments = code.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')
        const mainClassMatch = codeWithoutComments.match(/public\s+class\s+([a-zA-Z_$0-9]+)/)
        const mainClass = mainClassMatch ? mainClassMatch[1] : 'Main'

        const myListener = (e: any) => {
            //console.log('Received message from compiler worker:', e.data.command, e.data, questionID)
            if (e.data.id != '' + questionID) {
                return
            }

            if (e.data.command == 'ast') {
                //console.log('Received AST from compiler:', e.data.ast)
                const astCallback = options.ast_callback
                if (astCallback) {
                    astCallback(JSON.parse(e.data.ast))
                }
            } else if (e.data.command == 'phase') {
                globalState.compilerState.displayGlobalState(
                    'Phase: <b>' + e.data.phase + '</b> for ' + mainClass
                )
            } else if (e.data.command == 'diagnostic' || e.data.command == 'compiler-diagnostic') {
                const isError = e.data.severity == 'ERROR'
                if (compileFailedCallback) {
                    compileFailedCallback({
                        message:
                            e.data.message ||
                            e.data.text ||
                            e.data.humanReadable ||
                            'Compilation message',
                        start: {
                            line: e.data.lineNumber || 0,
                            column: (e.data.columnNumber || 0) - 1,
                        },
                        end: {
                            line: e.data.lineNumber || 0,
                            column: (e.data.columnNumber || 0) - 1,
                        },
                        severity: isError ? ErrorSeverity.Error : ErrorSeverity.Warning,
                    })
                }

                const msg =
                    (e.data.humanReadable ||
                        e.data.message ||
                        e.data.text ||
                        'Compilation message') + '\n'
                if (isError) {
                    err_callback(msg)
                } else {
                    info_callback(msg)
                }
            } else if (e.data.command == 'error') {
                if (this.teaworker) {
                    this.teaworker.end(
                        'Error:  An internal compiler error occurred: ' + (e.data.text || 'unknown')
                    )
                }
            } else if (e.data.command == 'compilation-complete') {
                booted = true
                clearTimeout(compilerTimeout)

                if (this.teaworker) {
                    this.teaworker.removeEventListener('message', myListener)
                    this.sessionCompileListener = undefined
                }

                if (e.data.status == 'errors') {
                    finishedExecutionCB(false, undefined, options.args)
                    this.isRunning = false
                    globalState.compilerState.hideGlobalState()
                    globalState.compilerState.setAllRunButtons(true)
                } else {
                    globalState.compilerState.displayGlobalState(
                        'Executing <b>' + mainClass + '</b>'
                    )

                    const workerrun = this.getOrCreateRunWorker()

                    const runListener = (ee: any) => {
                        //console.log('Received message from run worker:', ee.data, JSON.stringify(ee.data), questionID)

                        if (ee.data.command == 'f-FINAL') {
                            //console.log('Received final result from execution:', ee.data.value)
                            options.resultData = JSON.parse(ee.data.value)
                        }
                        
                        if (ee.data.id != '' + questionID) {
                            console.warn('Received message for different session.', ee.data.id, questionID, JSON.stringify(ee.data))
                        }

                        if (ee.data.command == 'run-finished-setup') {
                            // Nothing to do here.
                        } else if (
                            ee.data.command == 'w-exit-keepalive' ||
                            ee.data.command == 'exit-keepalive'
                        ) {
                            if (options.keepAlive) {
                                workerrun.postMessage({
                                    command: 'session-ended',
                                    id: '' + questionID,
                                })
                            }
                        } else if (ee.data.command == 'run-completed') {
                            if (ee.data.args) {
                                options.args['return'] = ee.data.args
                            }
                            finishedExecutionCB(true, undefined, options.args['return'])

                            console.log('Execution finished in ' + (Date.now() - start) + ' ms\n')
                            executionFinished = true
                            this.isRunning = false
                            if (!options.keepAlive) {
                                workerrun.removeEventListener('message', runListener)
                                workerrun.end('')
                            }
                            globalState.compilerState.hideGlobalState()
                            globalState.compilerState.setAllRunButtons(true)
                        } else if (ee.data.command == 'stdout') {
                            log_callback(ee.data.line + '\n')
                        } else if (ee.data.command == 'stderr') {
                            err_callback(ee.data.line + '\n')
                        } else if (
                            typeof ee.data.command === 'string' &&
                            ee.data.command.indexOf('w-') === 0
                        ) {
                            const cmd = ee.data.command.substr(2)
                            ee.data.command = cmd
                            options.didReceiveMessage(cmd, ee.data)
                        } else if (ee.data.command == 'main-finished') {
                            options.postMessageFunction = (cmd: string, data: any) => {
                                data = { ...data }
                                data.command = cmd
                                data.id = questionID
                                workerrun.postMessage(data)
                            }

                            options.postMessageFunction('main-finished', {})
                            options.dequeuePostponedMessages()
                            if (options.whenFinishedHandler) {
                                options.whenFinishedHandler(ee.data.args)
                            }
                        } else if (ee.data.command == 'main-will-start') {
                            if (options.beforeStartHandler) {
                                options.beforeStartHandler()
                            }
                        } 
                    }

                    workerrun.addEventListener('message', runListener)

                    workerrun.postMessage({
                        command: 'run',
                        id: '' + questionID,
                        code: e.data.script,
                        args: args,
                        messagePosting: options.allowsMessagePassing,
                        keepAlive: options.keepAlive,
                    })

                    const runStart = Date.now()
                    if (!keepAlive) {
                        setTimeout(() => {
                            if (!executionFinished) {
                                const time = Date.now() - runStart
                                workerrun.end(
                                    'TimeoutError:  Execution took too long (>' +
                                        time +
                                        'ms) and was terminated. There might be an endless loop in your code.'
                                )
                                this.isRunning = false
                                finishedExecutionCB(false, undefined, options.args)
                                globalState.compilerState.hideGlobalState()
                                globalState.compilerState.setAllRunButtons(true)
                            }
                        }, max_ms)
                    }
                }
            }
        }

        if (this.teaworker) {
            this.sessionCompileListener = myListener
            this.teaworker.addEventListener('message', myListener)

            globalState.compilerState.setAllRunButtons(false)
            globalState.compilerState.displayGlobalState(
                'Starting Compiler for <b>' + mainClass + '.java</b>'
            )
            console.log('Will receive AST:', options.sendAST===true && !!options.ast_callback)
            this.teaworker.postMessage({
                command: 'compile',
                id: '' + questionID,
                text: code,
                mainClass: mainClass,
                strict: true,
                debugInfo: true,
                emitAst: options.sendAST===true && !!options.ast_callback,
            })
        }
    }

    stop() {
        console.log('FORCE STOPPING')
        if (this.teaworkerrun) {
            this.teaworkerrun.end(l('CodeBlocks.UserCanceled'))
        }
        if (this.teaworker) {
            if (this.sessionCompileListener) {
                this.teaworker.removeEventListener('message', this.sessionCompileListener)
                this.sessionCompileListener = undefined
            }
            this.isRunning = false
        }
        globalState.compilerState.hideGlobalState()
        globalState.compilerState.setAllRunButtons(true)
    }
}

export const javaCompiler_V102 = reactive(new JavaV102Compiler())
export default javaCompiler_V102
