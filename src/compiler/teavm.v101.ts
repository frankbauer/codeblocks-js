import { ICompilerInstance, ErrorSeverity, ICompileAndRunArguments } from '@/lib/ICompilerRegistry'
import { globalState } from '@/lib/globalState'
import Vue, { reactive } from 'vue'
import { l } from '@/plugins/i18n'

declare global {
    interface Worker {
        end(msg?: string, terminate?: boolean): void
    }
}

const teaVMRunOverhead = 40000

//ICompilerInstance
export class JavaV101Compiler implements ICompilerInstance {
    readonly version = '101'
    readonly language = 'java'
    readonly canRun = true
    readonly canStop = true
    readonly allowsContinousCompilation = false
    readonly allowsPersistentArguments = true
    readonly allowsMessagePassing = true
    readonly acceptsJSONArgument = true
    readonly allowsREPL = false
    readonly experimental = true
    readonly deprecated = false
    didPreload: boolean = false
    private teaworker: Worker | undefined = undefined
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
            //console.log('setAllRun', true)
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
                //this should throw in the offline environment, thus we look for the worker at a different
                this.teaworker = new Worker('../assCodeQuestion/js/teavm/worker.js')
            }

            this.teaworker.addEventListener('message', (e: any) => {
                //console.log('teastuff', e.data)
                if (e.data.command == 'ok' && e.data.id == 'didload-classlib') {
                    if (this.teaworker) {
                        this.teaworker.postMessage({
                            command: 'compile',
                            id: 'prep',
                            text: 'public class Bootstrap { public static void main(String[] args){}}',
                            mainClass: 'Bootstrap',
                        })
                    }
                    this.isReady = true
                    if (whenReady) {
                        //console.log("loopback to initial caller");
                        whenReady()
                    } else {
                        globalState.compilerState.setAllRunButtons(true)
                        globalState.compilerState.hideGlobalState()
                    }
                } else if (e.data.id == 'prep' && e.data.command == 'compilation-complete') {
                    /* We could finish initialization here if there appear to be races when compiling multiple sources at once */
                }
            })

            //bootstrap environment
            this.teaworker.postMessage({
                command: 'load-classlib',
                id: 'didload-classlib',
                url: 'classlib.txt',
            })

            return true
        }

        return false
    }

    sessionCompileListener: ((e: any) => void) | undefined = undefined
    sessionID: string = '-1'
    sessionWorker: any = undefined

    compileAndRun(
        questionID: string,
        code: string,
        callingCodeBlocks: any,
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
            return
        }

        const compilerTimeout = setTimeout(() => {
            if (!booted) {
                const time = Date.now() - start

                if (this.teaworker) {
                    this.teaworker.end(
                        'TimeoutError:  Compilation took too long (>' +
                            time +
                            'ms) and was terminated. Trying to reset the System. Please re-run your code and call a Tutor if this Problem persists.'
                    )
                }

                this.teaworker = undefined
            }
        }, teaVMRunOverhead)

        let text = code
            .replace(/"(?:[^"\\]|\\.)*"|\/\*[\s\S]*?\*\//gm, '')
            .replace(/(^.*)\/\/.*$/gm, '$1') //replace strings and comments
        //let text = code.replace(/"(?:[^"\\]+?|(?!")"|\\{2}|\\[\s\S])*?"|^.*(\/\/.*$)|\/\*[\s\S]*?\*\//gm, ''); //replace strings and comments

        text = text.replaceRec(/(\{[^{}]*\})/gm, '[]') //replace parentheses

        const getMainClass = (_code: string) => {
            let ret = 'Unknown'
            //above replaces all {} with [], so look for public class <name> []
            const regexpMainClass =
                /public\s+?class\s+?([a-zA-Z_$0-9]+?)\s*?(\[|\simplements|\sextends)/gm
            let match: RegExpExecArray | null
            while ((match = regexpMainClass.exec(_code)) !== null) {
                if (match[1]) {
                    ret = match[1]
                    break
                }
            }
            return ret
        }
        let mainClass = getMainClass(text)
        //fallback if the above regExps mangled the student code and we can not find the main class
        if (mainClass == 'Unknown') {
            mainClass = getMainClass(code.replace('{', '['))
        }

        //console.log(mainClass, code);
        const myListener = (e: any) => {
            //console.log('this.teaworker', questionID, e.data);
            if (e.data.id == '' + questionID) {
                if (e.data.command == 'phase') {
                    if (e.data.phase == 'DEPENDENCY_ANALYSIS') {
                        globalState.compilerState.displayGlobalState(
                            'Compiling & Analyzing <b>' + mainClass + '.java</b>'
                        )
                    } else if (e.data.phase == 'LINKING') {
                        globalState.compilerState.displayGlobalState(
                            'Linking <b>' + mainClass + '.java</b>'
                        )
                    } else if (e.data.phase == 'OPTIMIZATION') {
                        globalState.compilerState.displayGlobalState(
                            'Optimizing <b>' + mainClass + '.java</b>'
                        )
                    } else if (e.data.phase == 'RENDERING') {
                        globalState.compilerState.displayGlobalState(
                            'Creating <b>' + mainClass + '.class</b>'
                        )
                    }
                } else if (e.data.command == 'diagnostic') {
                    if (compileFailedCallback) {
                        compileFailedCallback({
                            message: e.data.text,
                            start: {
                                line: e.data.lineNumber,
                                column: 0,
                            },
                            end: {
                                line: e.data.lineNumber,
                                column: 0,
                            },
                            severity:
                                e.data.severity == 'ERROR'
                                    ? ErrorSeverity.Error
                                    : ErrorSeverity.Warning,
                        })
                    }

                    const msg = e.data.text + '\n'
                    if (e.data.severity == 'ERROR') {
                        err_callback(msg + '\n')
                    } else {
                        info_callback(msg + '\n')
                    }
                } else if (e.data.command == 'compiler-diagnostic') {
                    if (compileFailedCallback) {
                        compileFailedCallback({
                            message: e.data.message,
                            start: {
                                line: e.data.startLineNumber,
                                column: e.data.startColumn,
                            },
                            end: {
                                line: e.data.endLineNumber,
                                column: e.data.endColumn,
                            },
                            severity:
                                e.data.kind == 'ERROR'
                                    ? ErrorSeverity.Error
                                    : ErrorSeverity.Warning,
                        })
                    }

                    const msg = e.data.humanReadable + '\n'
                    if (e.data.kind == 'ERROR') {
                        err_callback(msg + '\n')
                    } else {
                        info_callback(msg + '\n')
                    }
                } else if (e.data.command == 'error') {
                    if (this.teaworker) {
                        this.teaworker.end('Error:  An internal compiler Error occured')
                    }
                    this.teaworker = undefined
                } else if (e.data.command == 'compilation-complete') {
                    booted = true
                    let runTimeout: any | undefined = undefined
                    if (this.teaworker) {
                        this.teaworker.removeEventListener('message', myListener)
                        this.sessionCompileListener = undefined
                    }
                    try {
                        clearTimeout(compilerTimeout)
                    } catch (e) {
                        /* nothing to report */
                    }

                    if (e.data.status == 'errors') {
                        finishedExecutionCB(false, undefined, options.args)
                        this.isRunning = false
                    } else {
                        globalState.compilerState.displayGlobalState(
                            'Executing <b>' + mainClass + '</b>'
                        )
                        const workerrun = new Worker(
                            `${globalState.appState.baseurl}js/teavm/v${this.version}/workerrun.js?&v=001`
                        )
                        this.sessionWorker = workerrun

                        const runListener = (ee: any) => {
                            //console.log('JAVA-WORKER-MSG', ee.data)
                            console.d('tearunner message', questionID, ee.data, ee.data.command)
                            if (ee.data.command == 'run-finished-setup') {
                                //Nothing to do here
                            } else if (
                                ee.data.command == 'w-exit-keepalive' ||
                                ee.data.command == 'exit-keepalive'
                            ) {
                                //Make sure a keep-alive session can do proper cleanup
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

                                console.i('Execution finished in ' + (Date.now() - start) + ' ms\n')
                                // info_callback(
                                //     'Info: Execution finished in ' + (Date.now() - start) + ' ms\n'
                                // )
                                executionFinished = true
                                this.isRunning = false
                                workerrun.end()
                            } else if (ee.data.command == 'stdout') {
                                log_callback(ee.data.line + '\n')
                            } else if (ee.data.command == 'stderr') {
                                err_callback(ee.data.line + '\n')
                            } else if (ee.data.command.indexOf('w-') === 0) {
                                //Message sent from the workter to the playground
                                const cmd = ee.data.command.substr(2)
                                ee.data.command = cmd
                                options.didReceiveMessage(cmd, ee.data)
                            } else if (ee.data.command == 'main-finished') {
                                console.d('MESSAGE - Main Finished')
                                //set up the real message handler
                                options.postMessageFunction = (cmd, data) => {
                                    data = { ...data }
                                    console.d('MESSAGE - TeaVM Post ', cmd, data)
                                    data.command = cmd
                                    data.id = questionID
                                    wr.postMessage(data)
                                }

                                options.postMessageFunction('main-finished', {})

                                //make sure to send all queued messages now
                                options.dequeuePostponedMessages()

                                options.whenFinishedHandler(ee.data.args)
                            } else if (ee.data.command == 'main-will-start') {
                                options.beforeStartHandler()
                            } else if (ee.data.command == 'f-FINAL') {
                                options.resultData = JSON.parse(ee.data.value)
                            } else {
                                console.log('Unknown Message', ee.data)
                            }
                        }

                        workerrun.addEventListener('message', runListener.bind(this))

                        workerrun.postMessage({
                            command: 'run',
                            id: '' + questionID,
                            code: e.data.script,
                            args: args,
                            messagePosting: options.allowMessagePassing,
                            keepAlive: options.keepAlive,
                        })
                        const wr = workerrun

                        workerrun.end = (msg: string) => {
                            this.sessionWorker = undefined
                            //when we end it IS over, no matter how often we tried :)
                            try {
                                workerrun.terminate()
                                if (runTimeout) {
                                    clearTimeout(runTimeout)
                                }
                            } catch (e) {
                                /* nothing to report */
                            }

                            if (executionFinished) {
                                return
                            }
                            executionFinished = true
                            finishedExecutionCB(false, undefined, options.args)
                            this.isRunning = false
                            if (msg) {
                                err_callback(msg + '\n')
                            }
                        }

                        const runStart = Date.now()
                        if (!keepAlive) {
                            runTimeout = setTimeout(function () {
                                const time = Date.now() - runStart
                                workerrun.end(
                                    'TimeoutError:  Execution took too long (>' +
                                        time +
                                        'ms) and was terminated. There might be an endless loop in your code.'
                                )
                            }, max_ms)
                        }
                    }
                }
            }
        }

        if (this.teaworker) {
            this.sessionID = questionID
            this.sessionCompileListener = myListener
            this.teaworker.addEventListener('message', myListener)
        }
        //console.log(code);
        globalState.compilerState.setAllRunButtons(false)
        globalState.compilerState.displayGlobalState(
            'Starting Compiler for <b>' + mainClass + '.java</b>'
        )

        if (this.teaworker) {
            this.teaworker.postMessage({
                command: 'compile',
                id: '' + questionID,
                text: code,
                mainClass: mainClass,
            })
        }

        if (this.teaworker) {
            this.teaworker.end = (msg: string, terminate: boolean = true) => {
                try {
                    clearTimeout(compilerTimeout)
                } catch (e) {
                    //nothing to see here
                }

                if (booted) {
                    return
                }
                if (this.teaworker && terminate) {
                    console.log('TERMINATING')
                    this.teaworker.terminate()
                }
                finishedExecutionCB(false, undefined, options.args)
                this.isRunning = false
                this.isReady = true
                if (msg) {
                    err_callback(msg + '\n')
                }
            }
        }
    }

    stop() {
        console.d('FORCE STOPPING')
        if (this.sessionWorker) {
            this.sessionWorker.end(l('CodeBlocks.UserCanceled'))
        } else if (this.teaworker) {
            if (this.sessionCompileListener) {
                // this.sessionCompileListener({
                //     data: {
                //         id: '' + this.sessionID,
                //         command: 'compilation-complete',
                //         status: 'errors',
                //         errors: [Vue.$l('CodeBlocks.UserCanceled')]
                //     }
                // })
                this.teaworker.removeEventListener('message', this.sessionCompileListener)
                this.sessionCompileListener = undefined
            }
            this.teaworker.end(l('CodeBlocks.UserCanceled'), false)
        }
    }
}

export const javaCompiler_V101 = reactive(new JavaV101Compiler())
export default javaCompiler_V101
