self.importScripts('worker/runtime.js')

let didRun = false
let $stderrBuffer = ''
let $stdoutBuffer = ''

const olog = console.log
const oerr = console.error
console.log = function(line){
    olog("[WORKER]", ...arguments)    
}

console.error = function(ch){
    oerr("[WORKER]", ...arguments)
}

function listener(event) {
    let request = event.data
    console.log('JAVA-WORKE-RUN-MSG', request)
    if (request.command == 'run' && !didRun) {
        didRun = true
        
        const reqID = request.id
        

        $rt_putStdoutCustom = function (ch) {
            if (ch === 0xa) {
                self.postMessage({ command: 'stdout', line: $stdoutBuffer, id: reqID })
                $stdoutBuffer = ''
            } else {
                $stdoutBuffer += String.fromCharCode(ch)
            }
        }

        $rt_putStderrCustom = function (ch) {
            if (ch === 0xa) {
                self.postMessage({ command: 'stderr', line: $stderrBuffer, id: reqID })
                $stderrBuffer = ''
            } else {
                $stderrBuffer += String.fromCharCode(ch)
            }
        }

        let blob = new Blob([request.code], { type: 'application/javascript' })
        let URLObject = URL.createObjectURL(blob)
        self.importScripts(URLObject)
        self.postMessage({ command: 'run-finished-setup', id: reqID })

        try {
            console.log('Starting')
            main(request.args)
        } catch (EE) {
            if (EE instanceof Error) {
                console.log('APPLICATION ERROR', EE)
                $stderrBuffer += 'Application Terminated (' + EE.name + '): ' + EE.message
            } else {
                console.log('APPLICATION ERROR', EE)
                $stderrBuffer += 'Application Terminated due to an internal Error.'
            }
        }

        if ($stderrBuffer != '') {
            self.postMessage({ command: 'stderr', line: $stderrBuffer, id: reqID })
        }
        if ($stdoutBuffer != '') {
            self.postMessage({ command: 'stdout', line: $stdoutBuffer, id: reqID })
        }

        // self.postMessage({ command: 'run-completed', id: reqID })

        URLObject = undefined
        blob = undefined
        // $stderrBuffer = undefined
        // $stdoutBuffer = undefined

        // self.removeEventListener('message', listener)
    }
    request = undefined
}

self.addEventListener('message', listener)
