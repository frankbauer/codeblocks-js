import 'reflect-metadata'
import { Vue, Component } from 'vue-property-decorator'
import { ICompilerInstance, ICompilerErrorDescription, ICompilerRegistry, ErrorSeverity } from '../lib/ICompilerRegistry'

const teaVMRunOverhead = 30000

//ICompilerInstance
@Component
export class JavaV100Compiler extends Vue implements ICompilerInstance {
    version = '100'
    language = 'java'
    canRun = true
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
            console.log('setAllRun', true)
        })
    }

    private createTeaWorker(whenReady: () => void): boolean {
        if (this.teaworker === undefined) {
            this.$compilerState.setAllRunButtons(false)
            this.$compilerState.displayGlobalState('Initializing Runtime')
            try {
                this.teaworker = new Worker(`${this.$CodeBlock.baseurl}js/teavm/v${this.version}/worker.js`)
            } catch (e) {
                //this should throw in the offline environment, thus we look for the worker at a different
                this.teaworker = new Worker('../assCodeQuestion/js/teavm/worker.js')
            }

            this.teaworker.addEventListener('message', (e: any) => {
                console.log('teastuff', e.data)
                if (e.data.command == 'ok' && e.data.id == 'didload-classlib') {
                    if (this.teaworker) {
                        this.teaworker.postMessage({
                            command: 'compile',
                            id: 'prep',
                            text: 'public class Bootstrap { public static void main(String[] args){}}',
                            mainClass: 'Bootstrap'
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
                url: 'classlib.txt'
            })

            return true
        }

        return false
    }

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
        runCreate: boolean = true
    ): void {
        var start = Date.now()
        var executionFinished = false
        var booted = false

        if (this.isRunning) {
            err_callback('System is busy. Please wait until compilation finishes or call a tutor.')
            return
        }
        this.isRunning = true
        if (runCreate) {
            if (
                this.createTeaWorker(() => {
                    this.isRunning = false
                    this.compileAndRun(questionID, code, callingCodeBlocks, max_ms, log_callback, info_callback, err_callback, compileFailedCallback, finishedExecutionCB, false)
                })
            ) {
                return
            }
        }

        if (!this.isReady) {
            err_callback('System is not yet ready. Please wait until Initialization finishes or call a tutor.')
            return
        }

        const compilerTimeout = setTimeout(() => {
            if (!booted) {
                var time = Date.now() - start

                if (this.teaworker) {
                    this.teaworker.end(
                        'TimeoutError:  Compilation took too long (>' + time + 'ms) and was terminated. Trying to reset the System. Please re-run your code and call a Tutor if this Problem persists.'
                    )
                }

                this.teaworker = undefined
            }
        }, teaVMRunOverhead)

        var mainClass = 'Unknown'
        let text = code.replace(/"(?:[^"\\]|\\.)*"|^.*(\/\/.*$)|\/\*[\s\S]*?\*\//gm, '') //replace strings and comments
        //let text = code.replace(/"(?:[^"\\]+?|(?!")"|\\{2}|\\[\s\S])*?"|^.*(\/\/.*$)|\/\*[\s\S]*?\*\//gm, ''); //replace strings and comments

        text = text.replaceRec(/(\{[^{}]*\})/gm, '[]') //replace parentheses

        //above replaces all {} with [], so look for public class <name> []
        let regexpMainClass = /public\s+?class\s+?([a-zA-Z_$0-9]+?)\s*?(\[|\simplements|\sextends)/gm
        let match: RegExpExecArray | null
        while ((match = regexpMainClass.exec(text)) !== null) {
            if (match[1]) {
                mainClass = match[1]
                break
            }
        }

        //console.log(mainClass, code);
        var myListener = (e: any) => {
            //console.log('this.teaworker', questionID, e.data);
            if (e.data.id == '' + questionID) {
                if (e.data.command == 'phase') {
                    if (e.data.phase == 'DEPENDENCY_ANALYSIS') {
                        this.$compilerState.displayGlobalState('Compiling & Analyzing <b>' + mainClass + '.java</b>')
                    } else if (e.data.phase == 'LINKING') {
                        this.$compilerState.displayGlobalState('Linking <b>' + mainClass + '.java</b>')
                    } else if (e.data.phase == 'OPTIMIZATION') {
                        this.$compilerState.displayGlobalState('Optimizing <b>' + mainClass + '.java</b>')
                    } else if (e.data.phase == 'RENDERING') {
                        this.$compilerState.displayGlobalState('Creating <b>' + mainClass + '.class</b>')
                    }
                } else if (e.data.command == 'diagnostic') {
                    if (compileFailedCallback) {
                        compileFailedCallback({
                            message: e.data.text,
                            start: {
                                line: e.data.lineNumber,
                                column: 0
                            },
                            end: {
                                line: e.data.lineNumber,
                                column: 0
                            },
                            severity: e.data.severity == 'ERROR' ? ErrorSeverity.Error : ErrorSeverity.Warning
                        })
                    }

                    let msg = e.data.text + '\n'
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
                                column: e.data.startColumn
                            },
                            end: {
                                line: e.data.endLineNumber,
                                column: e.data.endColumn
                            },
                            severity: e.data.kind == 'ERROR' ? ErrorSeverity.Error : ErrorSeverity.Warning
                        })
                    }

                    let msg = e.data.humanReadable + '\n'
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
                    }
                    try {
                        clearTimeout(compilerTimeout)
                    } catch (e) {}

                    if (e.data.status == 'errors') {
                        finishedExecutionCB(false)
                        this.isRunning = false
                    } else {
                        let runListener = (ee: any) => {
                            //console.log('tearunner', questionID, ee.data);
                            if (ee.data.command == 'run-finished-setup') {
                                //Nothing to do here
                            } else if (ee.data.command == 'run-completed') {
                                finishedExecutionCB(true)
                                info_callback('Info: Execution finished in ' + (Date.now() - start) + ' ms\n')
                                executionFinished = true
                                this.isRunning = false
                                workerrun.end()
                            } else if (ee.data.command == 'stdout') {
                                log_callback(ee.data.line + '\n')
                            } else if (ee.data.command == 'stderr') {
                                err_callback(ee.data.line + '\n')
                            }
                        }
                        this.$compilerState.displayGlobalState('Executing <b>' + mainClass + '</b>')
                        let workerrun = new Worker(`${this.$CodeBlock.baseurl}js/teavm/v${this.version}/workerrun.js`)
                        workerrun.addEventListener('message', runListener.bind(this))

                        workerrun.postMessage({
                            command: 'run',
                            id: '' + questionID,
                            code: e.data.script
                        })

                        workerrun.end = (msg: string) => {
                            //when we end it IS over, no matter how often we tried :)
                            try {
                                workerrun.terminate()
                                if (runTimeout) {
                                    clearTimeout(runTimeout)
                                }
                            } catch (e) {}

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

                        var runStart = Date.now()
                        runTimeout = setTimeout(function() {
                            var time = Date.now() - runStart
                            workerrun.end('TimeoutError:  Execution took too long (>' + time + 'ms) and was terminated. There might be an endless loop in your code.')
                        }, max_ms)
                    }
                }
            }
        }

        if (this.teaworker) {
            this.teaworker.addEventListener('message', myListener)
        }
        //console.log(code);
        this.$compilerState.setAllRunButtons(false)
        this.$compilerState.displayGlobalState('Starting Compiler for <b>' + mainClass + '.java</b>')

        if (this.teaworker) {
            this.teaworker.postMessage({
                command: 'compile',
                id: '' + questionID,
                text: code,
                mainClass: mainClass
            })
        }

        if (this.teaworker) {
            this.teaworker.end = (msg: string) => {
                try {
                    clearTimeout(compilerTimeout)
                } catch (e) {
                    //nothing to see here
                }

                if (booted) {
                    return
                }
                if (this.teaworker) {
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
}

export const javaCompiler_V100 = new JavaV100Compiler()
export default javaCompiler_V100
