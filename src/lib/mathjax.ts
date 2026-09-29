/**
 * Calls `callback` once MathJax (if present on the page) has finished its startup, so that
 * MathJax does not replace content we are about to process.
 *
 * Supports MathJax 2 (`MathJax.Hub`, e.g. ILIAS <= 9) and MathJax 3 (`MathJax.startup`,
 * e.g. ILIAS >= 10). If `window.MathJax` is only a configuration object (MathJax not loaded
 * yet) or an unknown version, the callback runs immediately.
 */
export function whenMathJaxReady(callback: () => void): void {
    const mathJax = window.MathJax
    if (mathJax === undefined || mathJax === null) {
        callback()
    } else if (mathJax.Hub?.Register?.StartupHook) {
        mathJax.Hub.Register.StartupHook('End', callback)
    } else if (mathJax.startup?.promise) {
        mathJax.startup.promise.then(callback, callback)
    } else {
        callback()
    }
}
