import compilerRegistry from '../CompilerRegistry'

export function stripModuleSyntax(code: string): string {
    return code
        .replace(/^\s*export\s+default\s*/, '')
        .replace(/^\s*module\.exports\s*=\s*/, '')
        .replace(/;\s*$/, '')
        .trim()
}

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
                if (input.trim().startsWith('<')) {
                    return $(input)
                }
                console.error(
                    `You can not use jQuery globally from this context. Please try scope.find('${input}') instead.`
                )
            } else {
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
        sandbox.String = String
        sandbox.Object = Object
        sandbox.Boolean = Boolean
        sandbox.Function = Function
        sandbox.Set = Set
        sandbox.Map = Map
        sandbox.String = String
        sandbox.Array = Array
        sandbox.RegExp = RegExp
        sandbox.Math = Math
        sandbox.JSON = JSON
        sandbox.Date = Date
        sandbox.Error = Error
        sandbox.EvalError = EvalError
        sandbox.RangeError = RangeError
        sandbox.ReferenceError = ReferenceError
        sandbox.SyntaxError = SyntaxError
        sandbox.TypeError = TypeError
        sandbox.URIError = URIError
        sandbox.Promise = Promise
        sandbox.DataView = DataView
        sandbox.ArrayBuffer = ArrayBuffer
        sandbox.Uint8Array = Uint8Array
        sandbox.Int8Array = Int8Array
        sandbox.Uint16Array = Uint16Array
        sandbox.Int16Array = Int16Array
        sandbox.Uint32Array = Uint32Array
        sandbox.Int32Array = Int32Array
        sandbox.Float32Array = Float32Array
        sandbox.Float64Array = Float64Array
        sandbox.Uint8ClampedArray = Uint8ClampedArray
        sandbox.setTimeout = setTimeout.bind(window)
        sandbox.clearTimeout = clearTimeout.bind(window)
        sandbox.setInterval = setInterval.bind(window)
        sandbox.clearInterval = clearInterval.bind(window)
        sandbox.getComputedStyle = getComputedStyle.bind(window)
        sandbox.parseInt = parseInt.bind(window)
        sandbox.parseFloat = parseFloat.bind(window)
        sandbox.decodeURI = decodeURI.bind(window)
        sandbox.decodeURIComponent = decodeURIComponent.bind(window)
        sandbox.encodeURI = encodeURI.bind(window)
        sandbox.encodeURIComponent = encodeURIComponent.bind(window)
        sandbox.NaN = NaN
        sandbox.isNaN = isNaN.bind(window)
        sandbox.Infinity = Infinity
        sandbox.isFinite = isFinite.bind(window)
        sandbox.Symbol = Symbol
        sandbox.localStorage = window.localStorage
        sandbox.sessionStorage = window.sessionStorage

        const resourceWarning = (name: string) => {
            console.warn(
                `[Guardrail] You are using global '${name}'. For more reliable asset loading, consider using the playground's 'getResources()' method and the 'RESOURCES' object.`
            )
        }

        sandbox.fetch = (...args: any[]) => {
            resourceWarning('fetch')
            return (fetch as any).apply(window, args)
        }
        sandbox.navigator = window.navigator
        sandbox.location = window.location
        sandbox.performance = window.performance
        sandbox.Image = function () {
            resourceWarning('Image')
            return new Image()
        }
        sandbox.Audio = function (src?: string) {
            resourceWarning('Audio')
            return new Audio(src)
        }
        sandbox.Video = function () {
            resourceWarning('Video')
            return document.createElement('video')
        }
        sandbox.Option = Option

        sandbox.document = {
            documentElement: document.documentElement,
            body: document.body,
            head: document.head,
            cookie: '', // Guardrail: cookies are usually not needed in playgrounds
            create$: (what: any) => $(document.createElement(what)),
            createElement: (what: any) => document.createElement(what),
            createTextNode: (what: any) => document.createTextNode(what),
            createDocumentFragment: () => document.createDocumentFragment(),
            getElementById: (id: string) =>
                console.error(
                    `document.getElementById('${id}') is not supported. Please use scope.find('#${id}') instead`
                ),
            getElementsByTagName: (tag: string) =>
                console.error(
                    `document.getElementsByTagName('${tag}') is not supported. Please use scope.find('${tag}') instead`
                ),
            getElementsByClassName: (cl: string) =>
                console.error(
                    `document.getElementsByClassName('${cl}') is not supported. Please use scope.find('.${cl}') instead`
                ),
            querySelector: (sel: string) =>
                console.error(
                    `document.querySelector('${sel}') is not supported. Please use scope.find('${sel}') instead`
                ),
            querySelectorAll: (sel: string) =>
                console.error(
                    `document.querySelectorAll('${sel}') is not supported. Please use scope.find('${sel}') instead`
                ),
            addEventListener: document.addEventListener.bind(document),
            removeEventListener: document.removeEventListener.bind(document),
        }
        sandbox.window = {
            devicePixelRatio: window.devicePixelRatio,
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight,
            outerWidth: window.outerWidth,
            outerHeight: window.outerHeight,
            scrollX: window.scrollX,
            scrollY: window.scrollY,
            location: window.location,
            navigator: window.navigator,
            history: window.history,
            performance: window.performance,
            document: sandbox.document,
            getComputedStyle: sandbox.getComputedStyle,
            setTimeout: sandbox.setTimeout,
            clearTimeout: sandbox.clearTimeout,
            setInterval: sandbox.setInterval,
            clearInterval: sandbox.clearInterval,
            requestAnimationFrame: sandbox.requestAnimationFrame,
            cancelAnimationFrame: cancelAnimationFrame.bind(window),
            console: sandbox.console,
            fetch: sandbox.fetch,
            $: sandbox.$,
            jQuery: sandbox.jQuery,
            localStorage: sandbox.localStorage,
            sessionStorage: sandbox.sessionStorage,
            addEventListener: window.addEventListener.bind(window),
            removeEventListener: window.removeEventListener.bind(window),
            postMessage: window.postMessage.bind(window),
            blur: window.blur.bind(window),
            focus: window.focus.bind(window),
            alert: window.alert.bind(window),
            confirm: window.confirm.bind(window),
            prompt: window.prompt.bind(window),
            Image: Image,
            Audio: Audio,
        }

        if (!sandboxProxies.has(sandbox)) {
            const sandboxProxy = new Proxy(sandbox, { has, get })
            sandboxProxies.set(sandbox, sandboxProxy)
        }
        return code(sandboxProxies.get(sandbox))
    }
}

