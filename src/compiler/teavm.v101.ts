import 'reflect-metadata'
import { Vue, Component } from 'vue-property-decorator'
import {
    ICompilerInstance,
    ICompilerErrorDescription,
    ICompilerRegistry,
    ErrorSeverity,
    finishedCallbackSignatur,
    ICompileAndRunArguments,
} from '@/lib/ICompilerRegistry'

declare global {
    interface Worker {
        end(msg?: string, terminate?: boolean): void
    }
}

const teaVMRunOverhead = 30000

//ICompilerInstance
@Component
export class JavaV101Compiler extends Vue implements ICompilerInstance {
    readonly version = '101'
    readonly language = 'java'
    readonly canRun = true
    readonly canStop = true
    readonly allowsContinousCompilation = false
    readonly allowsPersistentArguments = false
    readonly allowsMessagePassing = true
    readonly acceptsJSONArgument = true
    didPreload: boolean = false
    teaworker: Worker | undefined = undefined
    isReady = false
    isRunning = false

    preload() {
        if (this.didPreload) {
            return
        }
        this.didPreload = true
        this.$compilerState.setAllRunButtons(false)

        console.log(`[Preloading TeaVM ${this.version} for Java]`)
        this.isRunning = true
        this.createTeaWorker(() => {
            this.isRunning = false
            this.$compilerState.hideGlobalState()
            this.$compilerState.setAllRunButtons(true)
            //console.log('setAllRun', true)
        })
    }

    private createTeaWorker(whenReady: () => void): boolean {
        if (this.teaworker === undefined) {
            this.$compilerState.setAllRunButtons(false)
            this.$compilerState.displayGlobalState('Initializing Runtime')
            try {
                this.teaworker = new Worker(
                    `${this.$CodeBlock.baseurl}js/teavm/v${this.version}/worker.js`
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
                            text:
                                'public class Bootstrap { public static void main(String[] args){}}',
                            mainClass: 'Bootstrap',
                        })
                    }
                    this.isReady = true
                    if (whenReady) {
                        //console.log("loopback to initial caller");
                        whenReady()
                    } else {
                        this.$compilerState.setAllRunButtons(true)
                        this.$compilerState.hideGlobalState()
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
        } = options

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
            const regexpMainClass = /public\s+?class\s+?([a-zA-Z_$0-9]+?)\s*?(\[|\simplements|\sextends)/gm
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
                        this.$compilerState.displayGlobalState(
                            'Compiling & Analyzing <b>' + mainClass + '.java</b>'
                        )
                    } else if (e.data.phase == 'LINKING') {
                        this.$compilerState.displayGlobalState(
                            'Linking <b>' + mainClass + '.java</b>'
                        )
                    } else if (e.data.phase == 'OPTIMIZATION') {
                        this.$compilerState.displayGlobalState(
                            'Optimizing <b>' + mainClass + '.java</b>'
                        )
                    } else if (e.data.phase == 'RENDERING') {
                        this.$compilerState.displayGlobalState(
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
                    let runTimeout: number | undefined = undefined
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
                        finishedExecutionCB(false)
                        this.isRunning = false
                    } else {
                        const runListener = (ee: any) => {
                            //console.log('JAVA-WORKER-MSG', ee.data)
                            console.log('tearunner', questionID, ee.data, ee.data.command)
                            if (ee.data.command == 'run-finished-setup') {
                                //Nothing to do here
                            } else if (ee.data.command == 'run-completed') {
                                finishedExecutionCB(true)

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
                            } else if (ee.data.command.indexof('worker-') === 0) {
                                //Message sent from the workter to the playground
                            }
                            callingCodeBlocks.foo()
                        }
                        this.$compilerState.displayGlobalState('Executing <b>' + mainClass + '</b>')
                        const workerrun = new Worker(
                            `${this.$CodeBlock.baseurl}js/teavm/v${this.version}/workerrun.js?&v=001`
                        )
                        this.sessionWorker = workerrun
                        workerrun.addEventListener('message', runListener.bind(this))

                        workerrun.postMessage({
                            command: 'run',
                            id: '' + questionID,
                            code: e.data.script,
                            args: args,
                            keepAlive: false,
                        })
                        workerrun.postMessage({
                            command: 'empty',
                            id: '' + questionID,
                            code: e.data.script,
                            args: args,
                        })
                        const wr = workerrun

                        setTimeout(() => {
                            console.log('SEND MESSAGE')
                            wr.postMessage({
                                command: 'nonce',
                                id: '' + questionID,
                                code: '',
                                args: [],
                            })
                        }, 2000)

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
                            finishedExecutionCB(false)
                            this.isRunning = false
                            if (msg) {
                                err_callback(msg + '\n')
                            }
                        }

                        const runStart = Date.now()
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

        if (this.teaworker) {
            this.sessionID = questionID
            this.sessionCompileListener = myListener
            this.teaworker.addEventListener('message', myListener)
        }
        //console.log(code);
        this.$compilerState.setAllRunButtons(false)
        this.$compilerState.displayGlobalState(
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
                finishedExecutionCB(false)
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
            this.sessionWorker.end(Vue.$l('CodeBlocks.UserCanceled'))
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
            this.teaworker.end(Vue.$l('CodeBlocks.UserCanceled'), false)
        }
    }
}

export const javaCompiler_V101 = new JavaV101Compiler()
export default javaCompiler_V101
