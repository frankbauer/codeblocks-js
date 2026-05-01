Error.stackTraceLimit = 50

let didRun = false
let stderrBuffer = ''
let stdoutBuffer = ''
let rArgs = []
let currentReqID = null

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

function processException(e) {
    const state = globalThis.teavm_internal_state
    const deobf = state ? state.stackDeobfuscator : null
    let output = ''
    let line = -1
    let file = 'Unknown Source'

    if (e && deobf) {
        const stackText = e.stack || ''
        const addresses = []
        const regex = /0x([0-9a-f]+)/g
        let match
        while ((match = regex.exec(stackText)) !== null) {
            addresses.push(parseInt(match[1], 16))
        }
        let stack = null
        if (addresses.length > 0) {
            stack = deobf(addresses)
        }

        // If stack is empty, try to parse Safari's format
        if (!stack || stack.length === 0) {
            stack = []
            const lines = stackText.split('\n')
            for (const line of lines) {
                const safariMatch = /([^@\s]+)@wasm-function\[(\d+)\]/.exec(line)
                if (safariMatch) {
                    let fullName = safariMatch[1]
                    let className = 'Unknown'
                    let method = fullName
                    if (fullName.includes('::')) {
                        const parts = fullName.split('::')
                        className = parts[0]
                        method = parts[1]
                    }
                    stack.push({
                        className: className,
                        method: method,
                        file: 'Unknown Source',
                        line: -1,
                    })
                }
            }
        }

        if (stack && stack.length > 0) {
            let firstStack = 0
            let className = null
            let lastWasException = true
            for (let i = 0; i < stack.length; i++) {
                const frame = stack[i]
                const cn = frame.className
                //stderrBuffer += 'Deobfuscated frame: ' + cn + '.' + frame.method + ', '+lastWasException+'\n';
                if (cn && (cn.endsWith('Exception') || cn.endsWith('Error'))) {
                    if (
                        cn !== 'java.lang.Throwable' &&
                        cn !== 'java.lang.Exception' &&
                        cn !== 'java.lang.RuntimeException' &&
                        cn !== 'java.lang.Error'
                    ) {
                        className = cn
                        firstStack = i
                        if (!lastWasException) {
                            break
                        }
                    }
                    lastWasException = true
                } else {
                    lastWasException = false
                }
            }

            let message = e.message
            if (message === '(could not fetch message)') {
                message = null
            }

            if (!className) {
                className = 'java.lang.Throwable'
            }

            let javaStack = className + (message ? ': ' + message : '') + '\n'
            for (let i = firstStack + 1; i < stack.length; i++) {
                const frame = stack[i]
                if (
                    frame.className.startsWith('org.teavm.') ||
                    frame.className.startsWith('MainOverride')
                ) {
                    continue
                }

                if (frame.line >= 0 && line === -1) {
                    line = frame.line
                    file = frame.file
                }

                if (frame.line >= 0) {
                    javaStack +=
                        '\tat ' +
                        frame.className +
                        '.' +
                        frame.method +
                        '(' +
                        (frame.file || 'Unknown Source') +
                        ':' +
                        frame.line +
                        ')\n'
                } else {
                    javaStack += '\tat ' + frame.className + '.' + frame.method + '\n'
                }
            }
            output += javaStack
        } else {
            output += 'Application Terminated: ' + (e.stack || e)
        }
    } else {
        output += 'Application Terminated: ' + (e ? (e.stack || e) : 'Unknown Error')
    }
    return { text: output, line: line, file: file }
}

self.addEventListener('error', (event) => {
    if (currentReqID) {
        const result = processException(event.error || event.message)
        self.postMessage({ command: 'stderr', line: result.text + '\n', id: currentReqID })
        self.postMessage({
            command: 'exception',
            text: result.text,
            line: result.line,
            file: result.file,
            id: currentReqID,
        })
    }
})

self.addEventListener('unhandledrejection', (event) => {
    if (currentReqID) {
        const result = processException(event.reason)
        self.postMessage({
            command: 'stderr',
            line: 'Unhandled Rejection: ' + result.text + '\n',
            id: currentReqID,
        })
        self.postMessage({
            command: 'exception',
            text: 'Unhandled Rejection: ' + result.text,
            line: result.line,
            file: result.file,
            id: currentReqID,
        })
    }
})

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
    currentReqID = request.id
    const reqID = request.id

    try {
        const teavmSupport = await import('./worker/compiler.wasm-runtime.js')

        const module = await teavmSupport.load(request.code, {
            nodejs: false,
            stackDeobfuscator: {
                enabled: true,
                path: './worker/compiler.wasm-deobfuscator.wasm',
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

        self.postMessage({ command: 'main-will-start', id: reqID })

        try {
            module.exports.main(Array.isArray(request.args) ? request.args : [])
        } catch (e) {
            const result = processException(e)
            stderrBuffer += result.text
            self.postMessage({
                command: 'exception',
                text: result.text,
                line: result.line,
                file: result.file,
                id: reqID,
            })
        }

        rArgs = Array.isArray(request.args) ? request.args.slice() : []

        self.postMessage({ command: 'main-finished', id: reqID, args: rArgs })
    } catch (e) {
        if (e instanceof Error) {
            stderrBuffer += 'Fatal Error: ' + e.message + '\n' + e.stack
        } else {
            stderrBuffer += 'Fatal Error occurred during initialization.'
        }
        endSession(reqID)
        return
    }

    if (!request.keepAlive) {
        endSession(reqID)
    }
}

self.addEventListener('message', listener)
