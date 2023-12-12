import { reactive } from 'vue'
import { ErrorSeverity, ICompileAndRunArguments, ICompilerInstance } from '@/lib/ICompilerRegistry'
import { globalState } from '@/lib/globalState'

/**
 * The overhead time we need to spin up the execution environment. The value is added to the execution time defined for this question
 * @type {int} javaRunOverhead execution overhead in ms
 */
const javaRunOverhead = 4000

function runJavaWorker(
    questionID,
    code,
    callingCodeBlocks,
    max_ms,
    log_callback,
    info_callback,
    err_callback,
    compileFailedCallback,
    finishedExecutionCB,
    options: ICompileAndRunArguments,
    forceReload = false
) {
    //const exp = new RegExp('public[ \n]*class[ \n]*([a-zA-Z_$0-9]*)[ \n]*({|implements|extends)')
    const exp = /public\s+?class\s+?([a-zA-Z_$0-9]+?)(\s|\{|\[|\simplements|\sextends)/gm
    const match = exp.exec(code)
    if (match == null) {
        console.error('Unable to determine class Name!', match, code)
        compileFailedCallback({
            message: 'Unable to determine class Name!',
            start: {
                line: 0,
                column: 0,
            },
            end: {
                line: 0,
                column: 0,
            },
            severity: ErrorSeverity.Error,
        })
        finishedExecutionCB(false, undefined, options.args)
        return
    }

    const className = match[1]

    const worker = new Worker(globalState.codeBlocks.baseurl + 'js/doppio/v001/javaWorker.js')
    let timer: any | null = null

    worker.addEventListener(
        'message',
        function (e) {
            const data = e.data
            //console.log(data)
            switch (data.event) {
                case 'finished':
                    if (timer) {
                        clearTimeout(timer)
                        timer = null
                    }

                    /*if (data.stderr && data.stderr != '') err_callback(data.stderr + "\n") ;
        if (data.stdout && data.stdout != '') log_callback(data.stdout);*/

                    console.log('Done', data.stdout, data.stderr, finishedExecutionCB)
                    finishedExecutionCB()
                    break

                case 'startTimer':
                    timer = setTimeout(function (e) {
                        console.log('Sending kill command')
                        worker.postMessage({ cmd: 'kill' })
                        timer = setTimeout(function () {
                            console.log('Terminating Worker')
                            worker.terminate()
                        }, 5000)
                        err_callback(
                            'Terminated long running Process (>' +
                                Math.round((max_ms + javaRunOverhead) / 1000) +
                                's).'
                        )
                        JavaExec.setRunButton(true, 'run')
                        JavaExec.setRunButton(true)
                        JavaExec.showMessage(null)
                    }, max_ms + javaRunOverhead) //we need about 4000ms to spin up the execution unit
                    break

                case 'showMessage':
                    //console.log("showMessage", data)
                    JavaExec.showMessage(data.msg)
                    break
                case 'output':
                    if (data.type == 'err') {
                        err_callback(data.msg)
                    } else if (data.type == 'nfo') {
                        info_callback(data.msg)
                    } else {
                        log_callback(data.msg)
                    }
                    break

                case 'setRunButton':
                    //console.log("setRunButton", data)
                    JavaExec.setRunButton(data.enabled, data.info)
                    break

                case 'cleanCache':
                    //log_callback('')
                    if (!forceReload) {
                        worker.postMessage({ cmd: 'kill' })
                        console.log('Restarting...')
                        setTimeout(function () {
                            runJavaWorker(
                                questionID,
                                code,
                                callingCodeBlocks,
                                max_ms,
                                log_callback,
                                info_callback,
                                err_callback,
                                compileFailedCallback,
                                finishedExecutionCB,
                                options,
                                true
                            )
                        }, 500)
                    } else {
                        JavaExec.setRunButton(false)
                        JavaExec.showMessage('Failed to initialize JVM.')
                    }
                    break
            }
        },
        false
    )

    worker.postMessage({
        cmd: 'run',
        code: code,
        className: className,
        max_ms: max_ms + 1000,
        questionID: questionID,
        forceReload: forceReload,
    })
}

export class DoppioV001Compiler implements ICompilerInstance {
    private loadedlibs = 0
    readonly version = '001'
    readonly language = 'java'
    readonly canRun = true
    readonly canStop = true
    readonly allowsContinousCompilation = false
    readonly allowsPersistentArguments = false
    readonly allowsMessagePassing = false
    readonly acceptsJSONArgument = false
    readonly allowsREPL = false
    private didPreload = false
    private requestedPreload = false
    isReady = false
    readonly isRunning = false
    readonly experimental = false
    readonly deprecated = false

    preload() {
        if (this.loadedlibs < 3) {
            if (!this.requestedPreload) {
                this.requestedPreload = true
                this.triggerResourceLoad()
            }

            return
        }
        if (this.didPreload) {
            return
        }
        this.didPreload = true
        console.log('[Preloading Doppio]')
        const self = this
        try {
            JavaExec.showMessage = function (msg) {
                globalState.compilerState.displayGlobalState(msg)
            }.bind(this)

            const lock: string[] = []
            JavaExec.setRunButton = function (enabled: boolean, info?: string) {
                if (info && !enabled && lock.indexOf(info) == -1) {
                    lock.push(info)
                }
                if (info && enabled && lock.indexOf(info) > -1) {
                    lock.splice(lock.indexOf(info), 1)
                }

                if (!enabled || lock.length == 0) {
                    globalState.compilerState.setAllRunButtons(enabled)
                }
            }.bind(this)

            const self = this
            JavaExec.initialize(function () {
                console.log('Initializing Filesystem')
                JavaExec.initFileSystems(
                    globalState.codeBlocks.baseurl + 'js/doppio/v001/',
                    false,
                    function () {
                        //JavaExec.printDirContent('sys/vendor');

                        JavaExec.reroutStdStreams()
                        JavaExec.ready = true
                        self.isReady = true
                    }
                )
            })
        } catch (e) {
            console.error(e)
        }
    }

    compileAndRun(
        questionID: string,
        code: string,
        callingCodeBlocks: any,
        options: ICompileAndRunArguments
    ) {
        const {
            max_ms,
            log_callback,
            info_callback,
            err_callback,
            compileFailedCallback,
            finishedExecutionCB,
            args,
        } = options
        if (!this.isReady) {
            return
        }

        return runJavaWorker(
            questionID,
            code,
            callingCodeBlocks,
            max_ms,
            log_callback,
            info_callback,
            err_callback,
            compileFailedCallback,
            finishedExecutionCB,
            options,
            false
        )
    }

    triggerResourceLoad() {
        console.log('[Preparing Dependencies for Doppio]')
        const script = document.createElement('script')
        script.src = globalState.codeBlocks.baseurl + 'js/doppio/v001/browserfs/browserfs.min.js'
        const self = this
        script.onload = function () {
            self.loadedlibs++
            console.log('[BrowserFS loaded]')

            const script = document.createElement('script')
            script.src = globalState.codeBlocks.baseurl + 'js/doppio/v001/doppio/doppio.js'
            script.onload = function () {
                self.loadedlibs++
                console.log('[Doppio loaded]')

                const script = document.createElement('script')
                script.src = globalState.codeBlocks.baseurl + 'js/doppio/v001/JavaExec.js'
                script.onload = function () {
                    self.loadedlibs++
                    console.log('[JavaExec loaded]')
                    if (self.requestedPreload) {
                        self.preload()
                    }
                }.bind(self)
                document.head.appendChild(script)
            }.bind(self)
            document.head.appendChild(script)
        }.bind(self)
        document.head.appendChild(script)
    }

    created() {}
}

export const doppioCompiler_V001 = reactive(new DoppioV001Compiler())
export default doppioCompiler_V001
