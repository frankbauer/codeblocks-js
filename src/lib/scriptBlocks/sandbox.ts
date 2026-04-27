import compilerRegistry from '../CompilerRegistry'

const sandboxProxies = new WeakMap()

function has(target: any, key: any) {
    return true
}

function get(target: any, key: any) {
    if (key === Symbol.unscopables) {
        return undefined
    }
    return target[key]
}

export function compileCode(src: string) {
    const code = new Function('sandbox', src)

    return function (sandbox: any) {
        compilerRegistry.addLoadedToSandbox(sandbox)
        sandbox.$ = (input: any) => {
            if (typeof input === 'string') {
                console.error(
                    `You can not use JQuerry globally from this context. Please try scope.find('${input}') instead.`
                )
            } else {
                if (input.getAttribute === undefined) {
                    console.error('You may only wrap DOMElements using $')
                    return
                }
                return $(input)
            }
        }

        const oldRequestAnimationFrame = requestAnimationFrame
        sandbox.requestAnimationFrame = (callback: FrameRequestCallback) => {
            oldRequestAnimationFrame(callback)
        }
        sandbox.module = {
            exports: undefined,
        }
        sandbox.jQuery = sandbox.$
        sandbox.console = console
        sandbox.Promise = Promise
        sandbox.Number = Number
        sandbox.Map = Map
        sandbox.String = String
        sandbox.Array = Array
        sandbox.RegExp = RegExp
        sandbox.Math = Math
        sandbox.JSON = JSON
        sandbox.Date = Date
        sandbox.setTimeout = setTimeout.bind(window)
        sandbox.clearTimeout = clearTimeout.bind(window)
        sandbox.setInterval = setInterval.bind(window)
        sandbox.clearInterval = clearInterval.bind(window)
        sandbox.document = {
            create$: (what: any) => $(document.createElement(what)),
            createElement: (what: any) => document.createElement(what),
            createTextNode: (what: any) => document.createTextNode(what),
            getElementById: (id: string) =>
                console.error(
                    `document.getElementById is not supported. Please use scope.find('#${id}') instead`
                ),
            getElementsByTagName: (tag: string) =>
                console.error(
                    `document.getElementsByTagName is not supported. Please use scope.find('${tag}') instead`
                ),
            getElementsByClassName: (cl: string) =>
                console.error(
                    `document.getElementsByClassName is not supported. Please use scope.find('.${cl}') instead`
                ),
        }
        sandbox.window = {
            devicePixelRatio: window.devicePixelRatio,
        }

        if (!sandboxProxies.has(sandbox)) {
            const sandboxProxy = new Proxy(sandbox, { has, get })
            sandboxProxies.set(sandbox, sandboxProxy)
        }
        return code(sandboxProxies.get(sandbox))
    }
}
