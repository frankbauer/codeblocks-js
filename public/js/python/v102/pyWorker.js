let args = {}
let result = undefined

self.importScripts('./pyodide-0.17.0/pyodide.js')
self.importScripts('./codeblocks.js')
CodeBlocks.worker = self
const olog = console.log
const oerr = console.error
const clog = function (...args) {
    olog('[Worker]', ...args)
}
const cerr = function (...args) {
    oerr('[Worker]', ...args)
}

CodeBlocks._endSession = function () {
    self.postMessage({ command: 'finished', args: args, result: result })
    close()
}

async function listener(input) {
    const o = input.data
    const script = o.code

    if (typeof self.__pyodideLoading === 'undefined') {
        await loadPyodide({ indexURL: './pyodide-0.17.0/' })
    }

    switch (input.data.command) {
        case 'session-ended':
            CodeBlocks._endSession()
            break
        // case 'importD3':
        //     clog('[Importing D3-Proxy]')
        //     self.importScripts('./d3DomProxy.js') //to be included before d3
        //     self.importScripts('../../d3/5.3.8/d3.v5.min.js')
        //     __whitelist.add('d3')
        //     __whitelist.add('document')
        //     break
        // case 'importBrain':
        //     clog('[Importing Brain.JS]')
        //     self.importScripts('../../brain.js/2.0.0-alpha/brain-browser.min.js')

        //     var brain = window.brain
        //     this.brain = window.brain
        //     __whitelist.add('brain')
        //     __whitelist.add('window')
        //     break
        case 'start':
            args = o.args
            this.args = args

            // custom logging
            this.console = {
                log(...s) {
                    clog(...s)
                    if (Array.isArray(s)) {
                        s = s.join(', ')
                    }
                    //postMessage(['log', '' + s])
                    self.postMessage({ command: 'log', s: '' + s })
                },
                error(...s) {
                    cerr(...s)
                    if (Array.isArray(s)) {
                        s = s.join(', ')
                    }
                    //postMessage(['err', '' + s])
                    self.postMessage({ command: 'err', s: '' + s })
                },
            }
            self.console = console

            //postMessage(['finished', func(args), args])
            if (o.messagePosting) {
                self.postMessage({ command: 'main-will-start', id: o.id })
            }

            try {
                if (args) {
                    self.pyodide.globals.set('args', self.pyodide.toPy(args))
                }

                pyodide.runPython(`import sys
import io
sys.stdout = io.StringIO()`)
                await pyodide.loadPackagesFromImports(script)
                let coroutine = pyodide.pyodide_py.eval_code_async(script, pyodide.globals)
                try {
                    const output = await coroutine
                    if (output) {
                        clog(output)
                    }
                } catch (err) {
                    this.console.error(err)
                } finally {
                    coroutine.destroy()
                }

                const output = pyodide.runPython('sys.stdout.getvalue()')
                this.console.log(output)

                const nargs = self.pyodide.globals.get('args').toJs()
                if (nargs instanceof Map) {
                    args = {}
                    for (var [key, value] of nargs) {
                        args[key] = value
                    }
                } else {
                    args = nargs
                }
            } catch (err) {
                this.console.error(err)
            }

            if (o.messagePosting) {
                self.postMessage({ command: 'main-finished', id: o.id, args: args })
            }
            if (!o.keepAlive) {
                CodeBlocks._endSession()
            }
            break
        default:
            clog('FWD', input, input.data)
            CodeBlocks._forward(input.data)
    }
}

self.addEventListener('message', listener.bind(this))
