Error.stackTraceLimit = 50

let didRun = false
let stderrBuffer = ''
let stdoutBuffer = ''
let rArgs = []

function endSession(reqID) {
    if (stderrBuffer !== '') {
        self.postMessage({ command: 'stderr', line: stderrBuffer, id: reqID })
    }
    if (stdoutBuffer !== '') {
        self.postMessage({ command: 'stdout', line: stdoutBuffer, id: reqID })
    }

    stderrBuffer = ''
    stdoutBuffer = ''

    self.postMessage({ command: 'run-completed', id: reqID, args: rArgs })
}

async function listener(event) {
    const request = event.data

    if (request.command === 'session-ended' && didRun) {
        endSession(request.id)
        return
    }

    if (request.command !== 'run' || didRun) {
        return
    }

    didRun = true
    const reqID = request.id

    try {
        const teavmSupport = await import('./worker/compiler.wasm-runtime.js')
        const module = await teavmSupport.load(request.code, {
            stackDeobfuscator: {
                enabled: true,
            },
            installImports(o) {
                o.teavmConsole.putcharStdout = function (ch) {
                    if (ch === 0xa) {
                        self.postMessage({ command: 'stdout', line: stdoutBuffer, id: reqID })
                        stdoutBuffer = ''
                    } else {
                        stdoutBuffer += String.fromCharCode(ch)
                    }
                }
                o.teavmConsole.putcharStderr = function (ch) {
                    if (ch === 0xa) {
                        self.postMessage({ command: 'stderr', line: stderrBuffer, id: reqID })
                        stderrBuffer = ''
                    } else {
                        stderrBuffer += String.fromCharCode(ch)
                    }
                }
            },
        })

        self.postMessage({ command: 'run-finished-setup', id: reqID })

        if (request.messagePosting) {
            self.postMessage({ command: 'main-will-start', id: reqID })
        }

        module.exports.main(Array.isArray(request.args) ? request.args : [])

        if (
            typeof self.$rt_last_run_args !== 'undefined' &&
            self.$rt_last_run_args &&
            self.$rt_last_run_args.data &&
            typeof self.$rt_last_run_args.data.map === 'function'
        ) {
            rArgs = self.$rt_last_run_args.data.map((j) => j.toString())
        } else {
            rArgs = Array.isArray(request.args) ? request.args.slice() : []
        }

        if (request.messagePosting) {
            self.postMessage({ command: 'main-finished', id: reqID, args: rArgs })
        }
    } catch (e) {
        if (e instanceof Error) {
            stderrBuffer += 'Application Terminated (' + e.name + '): ' + e.message
        } else {
            stderrBuffer += 'Application Terminated due to an internal Error.'
        }
    }

    if (!request.keepAlive) {
        endSession(reqID)
    }
}

self.addEventListener('message', listener)
