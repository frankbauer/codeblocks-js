Error.stackTraceLimit = 50
;(async function () {
    let teavmSupport = await import('./worker/compiler.wasm-runtime.js')
    let teavm = await teavmSupport.load('worker/compiler.wasm', {
        stackDeobfuscator: {
            enabled: true,
        },
    })

    teavm.exports.installWorker()
})()
