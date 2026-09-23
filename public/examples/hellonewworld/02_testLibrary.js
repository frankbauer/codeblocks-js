export default {
    lastAST: undefined,
    badgeLibrary: undefined,
    testCallback: undefined,
    // Maps our internal result states to icon names from https://lucide.dev/icons —
    // <cb-icon>name</cb-icon> renders any icon from that set, everywhere (no
    // ILIAS-only font dependency), and takes normal style/class attributes for
    // color and sizing just like the old <i class="material-icons"> markup did.
    iconForState: {
        // a passed test that also earns a badge
        verified: 'circle-check',
        // a passed test with no badge attached
        done: 'check',
        // a failed test
        dangerous: 'circle-x',
        // a test that couldn't be evaluated
        contact_support: 'circle-question-mark',
    },
    // Prepended to every line of a disabled test section. It is a line comment, so
    // block comments inside the test code are fine and the line count never changes.
    disabledLinePrefix: '//~',
    // Where structures come from, see enableAST / enableSourceParsing (kept across runs)
    astEnabled: true,
    sourceParsingEnabled: true,

    // `context` carries every library/DATA block created before this one, keyed by
    // name. The badges library (if the question author added one) is optional — we
    // just check whether it's there before using it.
    create(context) {
        this.badgeLibrary = context['badgeLibrary']

        return {
            // The playground code calls this once (typically from its own setupDOM)
            // to hand us the function that turns a run's output into the test-result
            // tree: callback(txt, json, ast) => [{ ok, text, badge?, sub?, hidden? }, ...]
            //
            // `ast` is optional: it's only defined when the app's "emitAST" setting is
            // enabled AND the compiler produced one for this particular run — see
            // onASTAvailable() below, which is what actually receives it.
            registerCallback: (callback) => {
                this.testCallback = callback
            },

            // Enable/disable test code sections in a source. A section is everything
            // between the marker lines
            //      /* TEST START <name> */
            //      ...
            //      /* TEST END <name> */
            // (a name may be used for several sections, all of them are toggled).
            //
            // `code` is either a string (the altered string is returned) or one of the
            // entries passed to alterCodeBeforeRun(code). For an entry, the change is
            // applied to the entry via set() — so it only affects the upcoming run —
            // and the altered string is returned as well. Call this from
            // alterCodeBeforeRun, e.g.:
            //
            //      alterCodeBeforeRun(code) {
            //          const tests = code.filter((c) => c.type === 'hidden').at(-1)
            //          testLibrary.setTestCodeEnabled('myMethod', hasMyMethod, tests)
            //      }
            enableTestCode: (name, code) => this.setTestCodeEnabled(name, true, code),
            disableTestCode: (name, code) => this.setTestCodeEnabled(name, false, code),
            setTestCodeEnabled: (name, enabled, code) =>
                this.setTestCodeEnabled(name, enabled, code),

            // -- structural checks ------------------------------------------------
            // The code is described as a structure (see parseCode below):
            //      { language, source, classes: { [qualifiedName]: Class },
            //        functions: { [name]: Function[] }, attributes: { [name]: Attribute } }
            // and queried with the find* functions. Every find* returns the first
            // match (or undefined), every find*s all matches.
            //
            //      const cl = testLibrary.findClass('Foo')
            //      testLibrary.findMethod(cl, 'hello')                      // * * hello(*)
            //      testLibrary.findMethod(cl, 'hello', ['double', 'int'])   // * * hello(double, int)
            //      testLibrary.findMethod(cl, 'hello', [['double', 'int'], ['int', 'int']])
            //      testLibrary.findMethod(cl, 'hello', ['*', 'int'], ['double', 'int'])
            //      testLibrary.findMethod(cl, 'hello', ['*', 'int'], 'int', ['public', 'static'])
            //      testLibrary.findMethod(cl, 'hello', ['*', 'int'], 'int', [['public'], ['private']])
            //      testLibrary.findConstructor(cl, ['int'], ['public'])
            //      testLibrary.findAttribute(cl, 'count', 'int', ['private', '!static'])
            //      testLibrary.findLocalVariable(method, 'sum', 'int', false)
            //      testLibrary.hasControlStructure(method, 'for')
            //
            // See matchesName / matchesType / matchesParams / matchesModifiers below
            // for the filter syntax. `undefined`, null and '*' always match.
            //
            // Each language has a set of these functions: testLibrary.java,
            // .javascript and .python. The top level ones are the set of the app's
            // language (this.LANGUAGE, see setLanguage / currentLanguage).
            // A set queries the structure stored by its parseSourceCode() in this
            // run, else (Java only) the compiler's AST, else this.CODE parsed on first
            // use. parse() only returns a structure, it never changes what is queried.
            ...this.makeLanguageSet(() => this.currentLanguage()),
            // at the top level, the language can be given (default: currentLanguage)
            parse: (code, language) => this.parseCode(code, language || this.currentLanguage()),
            parseSourceCode: (code, language) => this.parseSourceCode(code, language),
            hasAST: () => this.hasAST(),
            // Switch the sources of structures on or off (for all sets, kept across
            // runs). Without the AST, testLibrary.java parses the source; without
            // source parsing, this.CODE is never parsed automatically (explicit
            // parse / parseSourceCode calls still work) and a set without any
            // source queries an empty structure.
            enableAST: () => this.setSourceEnabled('astEnabled', true),
            disableAST: () => this.setSourceEnabled('astEnabled', false),
            isASTEnabled: () => this.astEnabled,
            enableSourceParsing: () => this.setSourceEnabled('sourceParsingEnabled', true),
            disableSourceParsing: () => this.setSourceEnabled('sourceParsingEnabled', false),
            isSourceParsingEnabled: () => this.sourceParsingEnabled,
            getLanguage: () => this.currentLanguage(),
            setLanguage: (language) => {
                this.language = language
            },

            java: {
                ...this.makeLanguageSet(() => 'java'),
                hasAST: () => this.hasAST(),
                getAST: () => this.lastAST,
                typeToString: (node) => this.typeToString(node),
            },
            javascript: this.makeLanguageSet(() => 'javascript'),
            python: this.makeLanguageSet(() => 'python'),
        }
    },

    setupDOM() {
        this.libraryElement.html(
            this.styles() +
                `
            <div class="cb-test" style="display:none;">
                <h2>Testprotokoll</h2>
                <div id="cb-test-result"></div>
            </div>
            <div class="tw-flex tw-flex-wrap" id="cb-test-legend">
                <div class="tw-w-full sm:tw-w-1/2 lg:tw-w-1/4 tw-pr-4"><cb-icon>circle-check</cb-icon>: Richtig (Teil einer Auszeichnung)</div>
                <div class="tw-w-full sm:tw-w-1/2 lg:tw-w-1/4 tw-pr-4"><cb-icon>check</cb-icon>: Richtig</div>
                <div class="tw-w-full sm:tw-w-1/2 lg:tw-w-1/4 tw-pr-4"><cb-icon style="color:red">circle-x</cb-icon>: Test nicht erfüllt</div>
                <div class="tw-w-full sm:tw-w-1/2 lg:tw-w-1/4 tw-pr-4"><cb-icon style="color:gray">circle-question-mark</cb-icon>: Kann nicht getestet werden</div>
            </div>
        `
        )
    },

    // Fired automatically whenever the compiler produced an AST for this run (only
    // happens if the app's "emitAST" setting is turned on). We just cache it — the
    // next update() call is what passes it on to the registered callback.
    onASTAvailable(ast) {
        this.lastAST = ast
    },

    // Called right before each compilation — forget the AST of the previous run, so
    // a run that produces none is never tested against a stale one — and the parsed
    // source structures, they are rebuilt from the new code on first use.
    alterCodeBeforeRun() {
        this.lastAST = undefined
        this.astModel = undefined
        this.storedModels = {}
        this.parseCache = new Map()
        this.warnedFallback = false
        this.warnedNoSource = false
    },

    update(txt, json) {
        if (typeof this.testCallback !== 'function') {
            return
        }
        const tests = this.testCallback(txt, json, this.lastAST)

        if (this.badgeLibrary && typeof this.badgeLibrary.checkBadges === 'function') {
            this.badgeLibrary.checkBadges(this.flattenTests(tests))
        }

        this.libraryElement.find('#cb-test-result').html(this.formatTestResults(tests))
        this.libraryElement.find('.cb-test').show()
    },

    reset() {
        this.libraryElement?.find('.cb-test').hide()
    },

    // -- test code sections -----------------------------------------------------

    setTestCodeEnabled(name, enabled, code) {
        const isEntry = code !== null && typeof code === 'object' && typeof code.set === 'function'
        if (!isEntry && typeof code !== 'string') {
            throw new TypeError(
                'testLibrary: expected a string or an entry of alterCodeBeforeRun(code)'
            )
        }
        const result = this.toggleTestSections(name, enabled, isEntry ? code.content : code)
        if (isEntry) {
            code.set(result)
        }
        return result
    },

    toggleTestSections(name, enabled, source) {
        const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const start = `/\\*\\s*TEST\\s+START\\s+${escaped}\\s*\\*/`
        const startMarker = new RegExp(start)
        // Older examples disabled a section by appending '/*' to the start marker
        const legacyDisable = new RegExp(`(${start})\\s*/\\*`)
        const endMarker = new RegExp(`/\\*\\s*TEST\\s+END\\s+${escaped}\\s*\\*/`)
        const prefix = this.disabledLinePrefix

        let inside = false
        return source
            .split('\n')
            .map((line) => {
                if (!inside) {
                    if (startMarker.test(line)) {
                        inside = !endMarker.test(line)
                        return line.replace(legacyDisable, '$1')
                    }
                    return line
                }
                if (endMarker.test(line)) {
                    inside = false
                    return line
                }
                const isDisabled = line.startsWith(prefix)
                if (enabled) {
                    return isDisabled ? line.slice(prefix.length) : line
                }
                return isDisabled ? line : prefix + line
            })
            .join('\n')
    },

    // -- code structure -----------------------------------------------------------
    // A structure (model) describes the declarations of a piece of code:
    //
    //      {
    //          language: 'java' | 'javascript' | 'python',
    //          source: 'ast' | 'parser',       // compiler AST or the source parser below
    //          classes: { [qualifiedName]: Class },    // nested classes included
    //          functions: { [name]: Function[] },      // module level (JS, Python)
    //          attributes: { [name]: Attribute },      // module level variables
    //      }
    //
    // Class, Method/Function and Attribute look the same for every language and
    // source (see makeClass / makeMethod / makeAttribute), so the queries work on
    // all of them. Languages without types (JS, unannotated Python) have `null`
    // types, which only a wildcard type filter matches.

    supportedLanguages: ['java', 'javascript', 'python'],

    // setLanguage() > this.LANGUAGE (the app's language) > detected from the code
    currentLanguage() {
        const language = this.normalizeLanguage(this.language || this.LANGUAGE)
        return language || this.detectLanguage(this.sourceText())
    },

    normalizeLanguage(language) {
        const l = String(language || '').toLowerCase()
        const name = { js: 'javascript', py: 'python' }[l] || l
        return this.supportedLanguages.includes(name) ? name : undefined
    },

    makeLanguageSet(getLanguage) {
        return {
            parse: (code) => this.parseCode(code, getLanguage()),
            parseSourceCode: (code) => this.parseSourceCode(code, getLanguage()),
            getStructure: () => this.getModel(getLanguage()),
            ...this.makeQueries(() => this.getModel(getLanguage())),
        }
    },

    // An AST is available and may be used
    hasAST() {
        return this.astEnabled && this.getCompilationUnits().length > 0
    },

    setSourceEnabled(key, enabled) {
        this[key] = !!enabled
        this.warnedFallback = false
        this.warnedNoSource = false
    },

    // The structure a language set queries in this run
    getModel(language) {
        this.storedModels = this.storedModels || {}
        if (this.storedModels[language]) {
            return this.storedModels[language]
        }
        if (language === 'java' && this.astEnabled) {
            const units = this.getCompilationUnits()
            if (units.length > 0) {
                if (!this.astModel || this.astModel.ast !== this.lastAST) {
                    this.astModel = { ast: this.lastAST, model: this.describeAST(units) }
                }
                return this.astModel.model
            }
            if (!this.warnedFallback && this.sourceParsingEnabled) {
                this.warnedFallback = true
                console.warn(
                    'testLibrary.java: no AST available (enable the "emitAST" setting and use ' +
                        'Java v102), falling back to the source parser.'
                )
            }
        }
        if (!this.sourceParsingEnabled) {
            if (!this.warnedNoSource) {
                this.warnedNoSource = true
                console.warn(
                    `testLibrary.${language}: source parsing is disabled and there is no ` +
                        'AST or parseSourceCode() result, the structure is empty.'
                )
            }
            return this.newModel(language, 'none')
        }
        return this.parseCode(undefined, language)
    },

    // Parses the code and makes it the structure `language` is queried with until
    // the next run (the last call per language wins). `code` is a string, a list of
    // code entries or undefined (this.CODE).
    parseSourceCode(code, language) {
        language = this.normalizeLanguage(language) || this.currentLanguage()
        const model = this.parseCode(code, language)
        this.storedModels = this.storedModels || {}
        this.storedModels[language] = model
        return model
    },

    // Parses without storing. Results are cached per language and source text until
    // the next run, so repeated calls with the same arguments return the same object.
    parseCode(code, language) {
        const name = this.normalizeLanguage(language)
        if (!name) {
            throw new TypeError(`testLibrary: unsupported language '${language}'`)
        }
        const src = this.sourceText(code)
        const key = name + '\n' + src
        this.parseCache = this.parseCache || new Map()
        if (!this.parseCache.has(key)) {
            const parser = {
                java: 'parseJava',
                javascript: 'parseJavaScript',
                python: 'parsePython',
            }
            this.parseCache.set(key, this[parser[name]](src))
        }
        return this.parseCache.get(key)
    },

    // Same layout as the source the compiler gets (without transient overrides)
    sourceText(code) {
        if (typeof code === 'string') {
            return code
        }
        const entries = code === undefined || code === null ? this.CODE || [] : code
        return entries.map((e) => e.content + '\n').join('')
    },

    detectLanguage(src) {
        const score = (patterns) => patterns.filter((p) => p.test(src)).length
        const java = score([
            /\b(public|private|protected)\s+(static\s+)?[\w<>[\],\s]+\s+\w+\s*\(/,
            /\bSystem\.(out|err)\./,
            /\b(void|int|double|boolean|String)\s+\w+\s*[(=;]/,
            /\bclass\s+\w+[^{:\n]*\{/,
            /^\s*import\s+[\w.]+(\.\*)?\s*;/m,
        ])
        const javascript = score([
            /\b(const|let|var)\s+[\w${[]/,
            /\bfunction\b/,
            /=>/,
            /\bconsole\.\w+\(/,
            /\bexport\s+default\b/,
        ])
        const python = score([
            /^\s*def\s+\w+\s*\(.*\)\s*(->.*)?:/m,
            /^\s*class\s+\w+\s*(\(.*\))?\s*:/m,
            /^\s*(from\s+[\w.]+\s+)?import\s+[\w.]+(\s+as\s+\w+)?\s*$/m,
            /\bprint\(/,
            /^\s*(if|for|while|elif)\b.*:\s*$/m,
        ])
        if (java >= javascript && java >= python) {
            return 'java'
        }
        return python > javascript ? 'python' : 'javascript'
    },

    // -- queries --

    makeQueries(getModel) {
        // A class object carries everything, the structure is only needed to look
        // up a class name
        const modelFor = (cl) => (typeof cl === 'string' ? getModel() : null)
        return {
            // `scope` is a class (its nested classes are searched) or a structure
            findClass: (name, modifiers, scope) =>
                this.findClasses(
                    this.isModel(scope) ? scope : getModel(),
                    name,
                    modifiers,
                    scope
                )[0],
            findClasses: (name, modifiers, scope) =>
                this.findClasses(this.isModel(scope) ? scope : getModel(), name, modifiers, scope),
            findMethod: (cl, name, params, returnType, modifiers) =>
                this.findMethods(modelFor(cl), cl, name, params, returnType, modifiers)[0],
            findMethods: (cl, name, params, returnType, modifiers) =>
                this.findMethods(modelFor(cl), cl, name, params, returnType, modifiers),
            findConstructor: (cl, params, modifiers) =>
                this.findConstructors(modelFor(cl), cl, params, modifiers)[0],
            findConstructors: (cl, params, modifiers) =>
                this.findConstructors(modelFor(cl), cl, params, modifiers),
            findAttribute: (cl, name, type, modifiers) =>
                this.findAttributes(modelFor(cl), cl, name, type, modifiers)[0],
            findAttributes: (cl, name, type, modifiers) =>
                this.findAttributes(modelFor(cl), cl, name, type, modifiers),
            // `structure` (e.g. a parse() result) is queried instead of the set's own
            findFunction: (name, params, returnType, modifiers, structure) =>
                this.findFunctions(structure || getModel(), name, params, returnType, modifiers)[0],
            findFunctions: (name, params, returnType, modifiers, structure) =>
                this.findFunctions(structure || getModel(), name, params, returnType, modifiers),
            findGlobal: (name, type, modifiers, structure) =>
                this.findGlobals(structure || getModel(), name, type, modifiers)[0],
            findGlobals: (name, type, modifiers, structure) =>
                this.findGlobals(structure || getModel(), name, type, modifiers),
            findLocalVariable: (fn, name, type, isFinal) =>
                this.findLocalVariables(fn, name, type, isFinal)[0],
            findLocalVariables: (fn, name, type, isFinal) =>
                this.findLocalVariables(fn, name, type, isFinal),
            findControlStructures: (fn, kind) => this.findControlStructures(fn, kind),
            hasControlStructure: (fn, kind) => this.findControlStructures(fn, kind).length > 0,
        }
    },

    // `name` is matched against the simple name ('Inner') and the qualified name
    // ('Outer.Inner'). Without a scope all classes (including nested ones) are
    // searched, with a class as scope the classes nested in it.
    isModel(x) {
        return !!x && typeof x === 'object' && 'language' in x && 'functions' in x
    },

    findClasses(model, name, modifiers, scope) {
        let classes = Object.values(model.classes)
        if (scope && !this.isModel(scope)) {
            const prefix = scope.qualifiedName + '.'
            classes = classes.filter((c) => c.qualifiedName.startsWith(prefix))
        }
        return classes.filter(
            (c) =>
                (this.matchesName(c.name, name) || this.matchesName(c.qualifiedName, name)) &&
                this.matchesModifiers(c.modifiers, modifiers)
        )
    },

    // `cl` is a class or a class name. A missing class yields no matches, so the
    // calls can be chained without checks.
    resolveClass(model, cl) {
        return typeof cl === 'string' ? this.findClasses(model, cl)[0] : cl
    },

    findMethods(model, cl, name, params, returnType, modifiers) {
        cl = this.resolveClass(model, cl)
        return this.filterFunctions(cl ? cl.methods : [], name, params, returnType, modifiers)
    },

    findConstructors(model, cl, params, modifiers) {
        cl = this.resolveClass(model, cl)
        return this.filterFunctions(
            cl ? cl.constructors : [],
            undefined,
            params,
            undefined,
            modifiers
        )
    },

    findAttributes(model, cl, name, type, modifiers) {
        cl = this.resolveClass(model, cl)
        return this.filterAttributes(cl ? cl.attributes : [], name, type, modifiers)
    },

    findFunctions(model, name, params, returnType, modifiers) {
        return this.filterFunctions(
            Object.values(model.functions).flat(),
            name,
            params,
            returnType,
            modifiers
        )
    },

    findGlobals(model, name, type, modifiers) {
        return this.filterAttributes(Object.values(model.attributes), name, type, modifiers)
    },

    filterFunctions(functions, name, params, returnType, modifiers) {
        return functions.filter(
            (m) =>
                this.matchesName(m.name, name) &&
                this.matchesParams(m.parameterTypes, params) &&
                this.matchesType(m.returnType, returnType) &&
                this.matchesModifiers(m.modifiers, modifiers)
        )
    },

    filterAttributes(attributes, name, type, modifiers) {
        return attributes.filter(
            (a) =>
                this.matchesName(a.name, name) &&
                this.matchesType(a.type, type) &&
                this.matchesModifiers(a.modifiers, modifiers)
        )
    },

    // `fn` is a method, constructor or function. `isFinal` is true (final/const
    // only), false (non final only) or undefined (both).
    findLocalVariables(fn, name, type, isFinal) {
        return (fn ? fn.localVariables : []).filter(
            (v) =>
                this.matchesName(v.name, name) &&
                this.matchesType(v.type, type) &&
                (isFinal === undefined || isFinal === null || v.isFinal === !!isFinal)
        )
    },

    // `kind` is one of 'if', 'for' (also matches 'foreach'), 'foreach', 'while',
    // 'do-while', 'switch', 'try', 'loop' (any loop) or an array of alternatives.
    findControlStructures(fn, kind) {
        return (fn ? fn.controlStructures : []).filter((c) => this.matchesKind(c.kind, kind))
    },

    matchesKind(kind, filter) {
        if (this.isWildcard(filter)) {
            return true
        }
        if (Array.isArray(filter)) {
            return filter.some((f) => this.matchesKind(kind, f))
        }
        if (filter === 'loop') {
            return ['for', 'foreach', 'while', 'do-while'].includes(kind)
        }
        if (filter === 'for') {
            return kind === 'for' || kind === 'foreach'
        }
        return kind === filter
    },

    // -- filters --

    isWildcard(filter) {
        return filter === undefined || filter === null || filter === '*'
    },

    // A string (exact), a RegExp, or an array of alternatives.
    matchesName(name, filter) {
        if (this.isWildcard(filter)) {
            return true
        }
        if (Array.isArray(filter)) {
            return filter.some((f) => this.matchesName(name, f))
        }
        if (filter instanceof RegExp) {
            return filter.test(name)
        }
        return name === filter
    },

    // Like matchesName, but whitespace is ignored and an unqualified filter also
    // matches a qualified type ('String' matches 'java.lang.String').
    matchesType(type, filter) {
        if (this.isWildcard(filter)) {
            return true
        }
        if (Array.isArray(filter)) {
            return filter.some((f) => this.matchesType(type, f))
        }
        if (type === null || type === undefined) {
            return false
        }
        if (filter instanceof RegExp) {
            return filter.test(type)
        }
        const t = type.replace(/\s+/g, '')
        const f = String(filter).replace(/\s+/g, '')
        return t === f || (!f.includes('.') && this.stripQualifiers(t) === f)
    },

    stripQualifiers(type) {
        return type.replace(/(?:[A-Za-z_$][\w$]*\.)+(?=[A-Za-z_$])/g, '')
    },

    // An array of type filters (one per parameter, the count has to match; [] means
    // no parameters) or an array of such arrays as alternatives. A single position
    // may list alternatives too: ['*', ['int', 'long']]. Varargs appear as arrays
    // ('int...' is 'int[]').
    matchesParams(types, filter) {
        if (this.isWildcard(filter)) {
            return true
        }
        if (!Array.isArray(filter)) {
            throw new TypeError('testLibrary: the parameter filter has to be an array')
        }
        if (filter.length > 0 && filter.every((f) => Array.isArray(f))) {
            return filter.some((f) => this.matchesParams(types, f))
        }
        return (
            types.length === filter.length && filter.every((f, i) => this.matchesType(types[i], f))
        )
    },

    // An array of modifiers that must all be present (order does not matter, other
    // modifiers are allowed); '!name' forbids a modifier. A string is split at
    // whitespace ('public static'). An array of such arrays is a list of
    // alternatives, e.g. [['public'], ['private']].
    matchesModifiers(modifiers, filter) {
        if (this.isWildcard(filter)) {
            return true
        }
        if (typeof filter === 'string') {
            filter = filter.split(/\s+/).filter((m) => m !== '')
        }
        if (filter.some((f) => Array.isArray(f))) {
            return filter.some((f) => this.matchesModifiers(modifiers, f))
        }
        return filter.every((m) =>
            m.startsWith('!') ? !modifiers.includes(m.slice(1)) : modifiers.includes(m)
        )
    },

    // -- descriptors --

    newModel(language, source) {
        return { language, source, classes: {}, functions: {}, attributes: {} }
    },

    addFunction(model, fn) {
        ;(model.functions[fn.name] = model.functions[fn.name] || []).push(fn)
    },

    addGlobal(model, attribute) {
        if (!model.attributes[attribute.name]) {
            model.attributes[attribute.name] = attribute
        }
    },

    // `c` holds the language specific data, missing lists default to [].
    // Registers the class (and so all nested ones) in the model.
    makeClass(model, c, outer) {
        const cl = {
            kind: c.kind || 'class', // class, interface, enum, record, annotation_type
            name: c.name,
            qualifiedName: outer ? `${outer.qualifiedName}.${c.name}` : c.name,
            package: c.package || null,
            modifiers: c.modifiers || [],
            typeParameters: c.typeParameters || [],
            extends: c.extends || null,
            implements: c.implements || [],
            outerClass: outer ? outer.qualifiedName : null,
            methods: [],
            constructors: [],
            attributes: [],
            classes: [],
            pos: c.pos,
            endPos: c.endPos,
        }
        if (c.node) {
            cl.node = c.node
        }
        if (model.language === 'python') {
            cl.signature =
                `class ${cl.name}` + (cl.implements.length ? `(${cl.implements.join(', ')})` : '')
        } else if (model.language === 'javascript') {
            cl.signature = `class ${cl.name}` + (cl.extends ? ` extends ${cl.extends}` : '')
        } else {
            const head = [...cl.modifiers, cl.kind === 'annotation_type' ? '@interface' : cl.kind]
            cl.signature =
                head.join(' ') +
                ` ${cl.name}` +
                (cl.typeParameters.length ? `<${cl.typeParameters.join(', ')}>` : '') +
                (cl.extends ? ` extends ${cl.extends}` : '') +
                (cl.implements.length
                    ? ` ${cl.kind === 'interface' ? 'extends' : 'implements'} ${cl.implements.join(', ')}`
                    : '')
        }
        if (outer) {
            outer.classes.push(cl)
        }
        model.classes[cl.qualifiedName] = cl
        return cl
    },

    // kind: 'method', 'constructor' or 'function' (module level)
    makeMethod(model, m, cl) {
        const fn = {
            kind: m.kind,
            name: m.kind === 'constructor' && cl ? cl.name : m.name,
            className: cl ? cl.qualifiedName : null,
            modifiers: m.modifiers || [],
            returnType: m.returnType === undefined ? null : m.returnType,
            parameters: m.parameters || [], // [{ name, type, modifiers }]
            parameterTypes: (m.parameters || []).map((p) => p.type),
            typeParameters: m.typeParameters || [],
            throws: m.throws || [],
            hasBody: !!m.hasBody,
            localVariables: m.localVariables || [], // [{ name, type, modifiers, isFinal, hasInitializer }]
            controlStructures: m.controlStructures || [], // [{ kind, pos }]
            pos: m.pos,
            endPos: m.endPos,
        }
        if (m.node) {
            fn.node = m.node
        }
        if (m.decorators) {
            fn.decorators = m.decorators
        }
        const params = fn.parameters
        if (model.language === 'python') {
            const all = (m.receiver ? [m.receiver] : []).concat(
                params.map((p) => (p.prefix || '') + p.name + (p.type ? `: ${p.type}` : ''))
            )
            fn.signature =
                (fn.modifiers.includes('async') ? 'async ' : '') +
                `def ${m.name}(${all.join(', ')})` +
                (fn.returnType ? ` -> ${fn.returnType}` : '')
        } else if (model.language === 'javascript') {
            const mods = fn.modifiers.filter((x) => x !== 'public' && x !== 'generator')
            fn.signature =
                [...mods, fn.kind === 'function' ? 'function' : null]
                    .filter((x) => x)
                    .map((x) => x + ' ')
                    .join('') +
                (fn.modifiers.includes('generator') ? '*' : '') +
                `${fn.kind === 'constructor' ? 'constructor' : fn.name}(${params
                    .map((p) => (p.modifiers.includes('rest') ? '...' : '') + p.name)
                    .join(', ')})`
        } else {
            const isConstructor = fn.kind === 'constructor'
            fn.signature =
                [
                    ...fn.modifiers,
                    ...(fn.typeParameters.length ? [`<${fn.typeParameters.join(', ')}>`] : []),
                    ...(isConstructor ? [] : [fn.returnType]),
                ].join(' ') +
                (fn.modifiers.length || fn.typeParameters.length || !isConstructor ? ' ' : '') +
                `${fn.name}(${params.map((p) => `${p.type} ${p.name}`).join(', ')})` +
                (fn.throws.length ? ` throws ${fn.throws.join(', ')}` : '')
        }
        if (cl) {
            ;(fn.kind === 'constructor' ? cl.constructors : cl.methods).push(fn)
        } else {
            this.addFunction(model, fn)
        }
        return fn
    },

    // Class attributes and module level variables (cl === null)
    makeAttribute(model, a, cl) {
        const attribute = {
            kind: 'attribute',
            name: a.name,
            className: cl ? cl.qualifiedName : null,
            modifiers: a.modifiers || [],
            type: a.type === undefined ? null : a.type,
            hasInitializer: !!a.hasInitializer,
            pos: a.pos,
            endPos: a.endPos,
        }
        if (a.node) {
            attribute.node = a.node
        }
        if (model.language === 'python') {
            attribute.signature = attribute.name + (attribute.type ? `: ${attribute.type}` : '')
        } else if (model.language === 'javascript') {
            attribute.signature = [
                ...attribute.modifiers.filter((x) => x !== 'public'),
                attribute.name,
            ].join(' ')
        } else {
            attribute.signature = [...attribute.modifiers, attribute.type, attribute.name].join(' ')
        }
        if (cl) {
            if (!cl.attributes.some((x) => x.name === attribute.name)) {
                cl.attributes.push(attribute)
            }
        } else {
            this.addGlobal(model, attribute)
        }
        return attribute
    },

    makeLocal(name, type, modifiers, hasInitializer, pos) {
        return {
            kind: 'local',
            name,
            type: type === undefined ? null : type,
            modifiers,
            isFinal: modifiers.includes('final') || modifiers.includes('const'),
            hasInitializer: !!hasInitializer,
            pos,
        }
    },

    // -- Java AST -----------------------------------------------------------------
    // The Java compiler emits a parse-only javac tree: a list of compilation units,
    // each node is { kind, pos, endPos, ... }. Classes are 'CLASS' nodes (also for
    // interfaces/enums/records, see classKind), their `members` hold 'METHOD'
    // (constructors are named '<init>' and have no returnType), 'VARIABLE'
    // (attributes) and nested 'CLASS' nodes. Types are sub-trees, typeToString()
    // turns them back into source form ('int', 'String[]', 'List<String>').
    //
    // Since the tree is not attributed, only what is written in the source is
    // there: no default constructors and no implicit modifiers (e.g. 'public' of
    // interface methods).

    getCompilationUnits(ast) {
        ast = ast === undefined ? this.lastAST : ast
        if (Array.isArray(ast)) {
            return ast.filter((u) => u && u.kind === 'COMPILATION_UNIT')
        }
        return ast && ast.kind === 'COMPILATION_UNIT' ? [ast] : []
    },

    describeAST(units) {
        const model = this.newModel('java', 'ast')
        units.forEach((u) =>
            (u.typeDecls || [])
                .filter((n) => n && n.kind === 'CLASS')
                .forEach((n) => this.describeClassNode(model, n, null, u.package))
        )
        return model
    },

    describeClassNode(model, node, outer, pkg) {
        const cl = this.makeClass(
            model,
            {
                kind: (node.classKind || 'CLASS').toLowerCase(),
                name: node.name,
                package: pkg,
                modifiers: node.modifiers,
                typeParameters: (node.typeParams || []).map((t) => this.typeToString(t)),
                extends: node.extending ? this.typeToString(node.extending) : null,
                implements: (node.implementing || []).map((t) => this.typeToString(t)),
                pos: node.pos,
                endPos: node.endPos,
                node,
            },
            outer
        )
        ;(node.members || []).forEach((n) => {
            if (!n) {
                return
            }
            if (n.kind === 'METHOD') {
                const isConstructor = n.name === '<init>'
                this.makeMethod(
                    model,
                    {
                        kind: isConstructor ? 'constructor' : 'method',
                        name: n.name,
                        modifiers: n.modifiers,
                        returnType: isConstructor ? null : this.typeToString(n.returnType),
                        parameters: (n.params || []).map((p) => ({
                            name: p.name,
                            type: this.typeToString(p.varType),
                            modifiers: p.modifiers || [],
                        })),
                        typeParameters: (n.typeParams || []).map((t) => this.typeToString(t)),
                        throws: (n.thrown || []).map((t) => this.typeToString(t)),
                        hasBody: !!n.body,
                        ...this.analyzeJavaBodyNode(n.body),
                        pos: n.pos,
                        endPos: n.endPos,
                        node: n,
                    },
                    cl
                )
            } else if (n.kind === 'VARIABLE') {
                this.makeAttribute(
                    model,
                    {
                        name: n.name,
                        modifiers: n.modifiers,
                        // enum constants have no declared type
                        type: n.varType ? this.typeToString(n.varType) : cl.name,
                        hasInitializer: !!n.init,
                        pos: n.pos,
                        endPos: n.endPos,
                        node: n,
                    },
                    cl
                )
            } else if (n.kind === 'CLASS') {
                this.describeClassNode(model, n, cl, pkg)
            }
        })
        return cl
    },

    // Local variables and control structures of a method body. Local and anonymous
    // classes are skipped, lambda parameters are not counted as local variables.
    analyzeJavaBodyNode(body) {
        const localVariables = []
        const controlStructures = []
        const kinds = {
            IF: 'if',
            FOR_LOOP: 'for',
            ENHANCED_FOR_LOOP: 'foreach',
            WHILE_LOOP: 'while',
            DO_WHILE_LOOP: 'do-while',
            SWITCH: 'switch',
            SWITCH_EXPRESSION: 'switch',
            TRY: 'try',
        }
        const walk = (n) => {
            if (!n || typeof n !== 'object') {
                return
            }
            if (Array.isArray(n)) {
                n.forEach(walk)
                return
            }
            if (n.kind === 'CLASS') {
                return
            }
            if (n.kind === 'LAMBDA') {
                walk(n.body)
                return
            }
            if (n.kind === 'VARIABLE') {
                const modifiers = n.modifiers || []
                localVariables.push(
                    // `var x = ...` has no type in the tree
                    this.makeLocal(
                        n.name,
                        n.varType ? this.typeToString(n.varType) : 'var',
                        modifiers,
                        !!n.init,
                        n.pos
                    )
                )
            } else if (kinds[n.kind]) {
                controlStructures.push({ kind: kinds[n.kind], pos: n.pos, endPos: n.endPos })
            }
            Object.values(n).forEach(walk)
        }
        walk(body)
        const byPos = (a, b) => a.pos - b.pos
        return {
            localVariables: localVariables.sort(byPos),
            controlStructures: controlStructures.sort(byPos),
        }
    },

    typeToString(node) {
        if (!node) {
            return null
        }
        switch (node.kind) {
            case 'PRIMITIVE_TYPE':
                return node.typeName
            case 'IDENTIFIER':
                return node.name
            case 'MEMBER_SELECT':
                return `${this.typeToString(node.expr)}.${node.identifier}`
            case 'ARRAY_TYPE':
                return `${this.typeToString(node.elemType)}[]`
            case 'PARAMETERIZED_TYPE':
                return `${this.typeToString(node.clazz)}<${(node.args || [])
                    .map((t) => this.typeToString(t))
                    .join(', ')}>`
            case 'WILDCARD':
                if (node.boundKind === 'EXTENDS') {
                    return `? extends ${this.typeToString(node.bound)}`
                }
                if (node.boundKind === 'SUPER') {
                    return `? super ${this.typeToString(node.bound)}`
                }
                return '?'
            case 'TYPE_PARAMETER':
                return (
                    node.name +
                    (node.bounds && node.bounds.length
                        ? ` extends ${node.bounds.map((t) => this.typeToString(t)).join(' & ')}`
                        : '')
                )
            default:
                return node.kind
        }
    },

    // -- source parsers -------------------------------------------------------------
    // Lightweight, heuristic parsers for Java, JavaScript and Python. They work on
    // any code (also code that does not compile) and only look at declarations —
    // unusual formatting or exotic syntax may be missed. Positions are offsets in
    // the parsed source. They work on a masked copy of the source, where comments
    // and the contents of string literals are replaced by spaces.

    maskSource(src, language) {
        const out = src.split('')
        const n = src.length
        const blank = (from, to) => {
            for (let k = from; k < to && k < n; k++) {
                if (out[k] !== '\n') {
                    out[k] = ' '
                }
            }
        }
        const py = language === 'python'
        const js = language === 'javascript'
        let prev = '' // last significant character, to tell a JS regex from a division
        let i = 0
        while (i < n) {
            const c = src[i]
            const d = src[i + 1]
            if (!py && c === '/' && d === '/') {
                const j = src.indexOf('\n', i)
                blank(i, j < 0 ? n : j)
                i = j < 0 ? n : j
                continue
            }
            if (!py && c === '/' && d === '*') {
                const j = src.indexOf('*/', i + 2)
                blank(i, j < 0 ? n : j + 2)
                i = j < 0 ? n : j + 2
                continue
            }
            if (py && c === '#') {
                const j = src.indexOf('\n', i)
                blank(i, j < 0 ? n : j)
                i = j < 0 ? n : j
                continue
            }
            const triple = src.substr(i, 3)
            if (
                (py && (triple === '"""' || triple === "'''")) ||
                (!js && !py && triple === '"""')
            ) {
                const j = src.indexOf(triple, i + 3)
                const end = j < 0 ? n : j + 3
                blank(i + 3, end - 3)
                i = end
                prev = '"'
                continue
            }
            if (c === '"' || c === "'" || (js && c === '`')) {
                let j = i + 1
                while (j < n && src[j] !== c && (c === '`' || src[j] !== '\n')) {
                    j += src[j] === '\\' ? 2 : 1
                }
                // Python type hints may be strings ("Shape"), keep harmless ones
                if (!py || !/^[\w.[\], ]*$/.test(src.slice(i + 1, j))) {
                    blank(i + 1, j)
                }
                i = j + 1
                prev = '"'
                continue
            }
            if (js && c === '/') {
                const before = src.slice(Math.max(0, i - 12), i)
                const regexAllowed =
                    prev === '' ||
                    '(,=:[!&|?{};+-*%<>~^'.includes(prev) ||
                    /\b(return|typeof|case|do|else|in|of|void|yield|await|delete|throw)\s*$/.test(
                        before
                    )
                if (regexAllowed) {
                    let j = i + 1
                    let inClass = false
                    while (j < n && src[j] !== '\n' && (inClass || src[j] !== '/')) {
                        if (src[j] === '\\') {
                            j++
                        } else if (src[j] === '[') {
                            inClass = true
                        } else if (src[j] === ']') {
                            inClass = false
                        }
                        j++
                    }
                    blank(i + 1, j)
                    i = j + 1
                    prev = '"'
                    continue
                }
            }
            if (!/\s/.test(c)) {
                prev = c
            }
            i++
        }
        return out.join('')
    },

    // Index of the bracket closing the one at `i` (or the end of the text)
    closeIndex(text, i) {
        const open = text[i]
        const close = { '(': ')', '[': ']', '{': '}', '<': '>' }[open]
        let depth = 0
        for (let j = i; j < text.length; j++) {
            if (text[j] === open) {
                depth++
            } else if (text[j] === close && --depth === 0) {
                return j
            }
        }
        return text.length - 1
    },

    // Index of the first `ch` outside of brackets, -1 if there is none
    indexTopLevel(text, ch) {
        let depth = 0
        for (let i = 0; i < text.length; i++) {
            const c = text[i]
            if (depth === 0 && c === ch) {
                return i
            }
            if ('([{'.includes(c)) {
                depth++
            } else if (')]}'.includes(c)) {
                depth--
            }
        }
        return -1
    },

    // Splits at `sep` outside of brackets. Angle brackets count as well, but only
    // before the first '=' of a part (so 'Map<K, V> m = a < b, n' works).
    splitTopLevel(text, sep = ',') {
        const parts = []
        let depth = 0
        let angle = 0
        let assigned = false
        let start = 0
        for (let i = 0; i < text.length; i++) {
            const c = text[i]
            if ('([{'.includes(c)) {
                depth++
            } else if (')]}'.includes(c)) {
                depth--
            } else if (depth === 0 && !assigned && c === '<') {
                angle++
            } else if (depth === 0 && !assigned && c === '>' && angle > 0) {
                angle--
            } else if (depth === 0 && angle === 0 && c === '=') {
                assigned = true
            } else if (depth === 0 && angle === 0 && c === sep) {
                parts.push(text.slice(start, i))
                start = i + 1
                assigned = false
            }
        }
        parts.push(text.slice(start))
        return parts.map((p) => p.trim()).filter((p) => p !== '')
    },

    normalizeType(type) {
        const t = type
            .replace(/\s+/g, ' ')
            .replace(/\s*([<>[\],.&|])\s*/g, '$1')
            .replace(/,/g, ', ')
            .replace(/([&|])/g, ' $1 ')
            .trim()
        return t === '' ? null : t
    },

    // Offset of the first non-space character in [from, to)
    skipSpace(text, from, to = text.length) {
        while (from < to && /\s/.test(text[from])) {
            from++
        }
        return from
    },

    // Control structures in a Java or JavaScript body (masked text)
    scanControlStructures(m, from, to, language) {
        const res = []
        const doWhiles = new Set()
        const re = /\b(if|for|while|do|switch|try)\b/g
        re.lastIndex = from
        let mm
        while ((mm = re.exec(m)) !== null && mm.index < to) {
            const at = mm.index
            if (at > 0 && /[\w$.]/.test(m[at - 1])) {
                continue
            }
            let kind = mm[1]
            if (kind === 'while' && doWhiles.has(at)) {
                continue
            }
            if (kind === 'do') {
                let j = this.skipSpace(m, re.lastIndex, to)
                j =
                    m[j] === '{'
                        ? this.closeIndex(m, j) + 1
                        : this.indexTopLevel(m.slice(j, to), ';') + j + 1
                j = this.skipSpace(m, j, to)
                if (m.startsWith('while', j)) {
                    doWhiles.add(j)
                }
                kind = 'do-while'
            } else if (kind === 'for') {
                const open = m.indexOf('(', re.lastIndex)
                const head =
                    open >= 0 && open < to ? m.slice(open + 1, this.closeIndex(m, open)) : ''
                const classic = this.indexTopLevel(head, ';') >= 0
                const each =
                    language === 'javascript' ? /\b(of|in)\b/.test(head) : /[^:]:[^:]/.test(head)
                kind = !classic && each ? 'foreach' : 'for'
            }
            res.push({ kind, pos: at })
        }
        return res
    },

    // -- Java source --

    // In javac's order, the parser sorts modifiers like the AST does
    javaModifiers: [
        'public',
        'protected',
        'private',
        'abstract',
        'default',
        'static',
        'sealed',
        'non-sealed',
        'final',
        'transient',
        'volatile',
        'synchronized',
        'native',
        'strictfp',
    ],

    sortJavaModifiers(modifiers) {
        return modifiers.sort(
            (a, b) => this.javaModifiers.indexOf(a) - this.javaModifiers.indexOf(b)
        )
    },

    // Splits leading modifiers off a declaration: ['public static', 'int x'] style
    takeJavaModifiers(text) {
        const modifiers = []
        let rest = text.trim()
        for (;;) {
            const mm = rest.match(/^(non-sealed|[a-z]+)\b\s*/)
            if (!mm || !this.javaModifiers.includes(mm[1])) {
                return { modifiers: this.sortJavaModifiers(modifiers), rest }
            }
            modifiers.push(mm[1])
            rest = rest.slice(mm[0].length)
        }
    },

    stripAnnotations(text) {
        return text.replace(/@(?!interface\b)[\w$.]+(\s*\((?:[^()]|\([^()]*\))*\))?/g, ' ')
    },

    parseJava(src) {
        const m = this.maskSource(src, 'java')
        const model = this.newModel('java', 'parser')
        const pkg = (m.match(/^\s*package\s+([\w.]+)\s*;/m) || [])[1] || null
        this.parseJavaMembers(m, 0, m.length, null, model, pkg)
        return model
    },

    // Splits [from, to) into declarations: everything up to a ';' or up to a
    // '{...}' block (unless the '{' is part of an initializer).
    parseJavaMembers(m, from, to, owner, model, pkg) {
        let start = from
        let i = from
        if (owner && owner.kind === 'enum') {
            start = i = this.parseJavaEnumConstants(m, from, to, owner, model)
        }
        while (i < to) {
            const c = m[i]
            if (c === '(' || c === '[') {
                i = this.closeIndex(m, i) + 1
            } else if (c === ';') {
                this.parseJavaDeclaration(m, start, i, null, owner, model, pkg)
                start = i = i + 1
            } else if (c === '{') {
                const end = this.closeIndex(m, i)
                if (this.indexTopLevel(m.slice(start, i), '=') >= 0) {
                    i = end + 1 // array initializer or anonymous class, the ';' follows
                    continue
                }
                this.parseJavaDeclaration(m, start, i, end, owner, model, pkg)
                start = i = end + 1
            } else {
                i++
            }
        }
    },

    parseJavaEnumConstants(m, from, to, owner, model) {
        let end = from
        while (end < to && m[end] !== ';') {
            end = '({['.includes(m[end]) ? this.closeIndex(m, end) + 1 : end + 1
        }
        const text = m.slice(from, end)
        // enum constants: RED, GREEN(2), BLUE { ... };
        this.splitTopLevel(this.stripAnnotations(text)).forEach((part) => {
            const name = (part.match(/^([A-Za-z_$][\w$]*)/) || [])[1]
            if (name) {
                this.makeAttribute(
                    model,
                    {
                        name,
                        modifiers: ['public', 'static', 'final'],
                        type: owner.name,
                        hasInitializer: true,
                        pos: from + text.indexOf(name),
                    },
                    owner
                )
            }
        })
        return end < to ? end + 1 : to
    },

    // Header in [hs, he); for a block, `bodyEnd` is the index of its closing '}'
    parseJavaDeclaration(m, hs, he, bodyEnd, owner, model, pkg) {
        const raw = m.slice(hs, he)
        const pos = hs + raw.search(/\S|$/)
        const endPos = bodyEnd !== null ? bodyEnd + 1 : he + 1
        const header = this.stripAnnotations(raw).replace(/\s+/g, ' ').trim()
        if (header === '' || /^(import|package)\b/.test(header)) {
            return
        }
        const cm = header.match(
            /^((?:(?:public|protected|private|static|final|abstract|sealed|non-sealed|strictfp)\s+)*)(class|interface|enum|record|@interface)\s+([A-Za-z_$][\w$]*)\s*/
        )
        if (cm) {
            if (bodyEnd === null) {
                return
            }
            let rest = header.slice(cm[0].length)
            let typeParameters = []
            if (rest.startsWith('<')) {
                const close = this.closeIndex(rest, 0)
                typeParameters = this.splitTopLevel(rest.slice(1, close)).map((t) =>
                    this.normalizeType(t)
                )
                rest = rest.slice(close + 1).trim()
            }
            let components = []
            if (rest.startsWith('(')) {
                const close = this.closeIndex(rest, 0)
                components = this.parseJavaParams(rest.slice(1, close))
                rest = rest.slice(close + 1).trim()
            }
            const clause = (kw) => {
                const mm = rest.match(
                    new RegExp(`\\b${kw}\\s+(.*?)\\s*(?=\\b(?:extends|implements|permits)\\b|$)`)
                )
                return mm ? this.splitTopLevel(mm[1]).map((t) => this.normalizeType(t)) : []
            }
            const kind = cm[2] === '@interface' ? 'annotation_type' : cm[2]
            const ext = clause('extends')
            const cl = this.makeClass(
                model,
                {
                    kind,
                    name: cm[3],
                    package: pkg,
                    modifiers: this.sortJavaModifiers(
                        cm[1].trim() ? cm[1].trim().split(/\s+/) : []
                    ),
                    typeParameters,
                    extends: kind === 'interface' ? null : ext[0] || null,
                    implements: kind === 'interface' ? ext : clause('implements'),
                    pos,
                    endPos,
                },
                owner
            )
            components.forEach((p) =>
                this.makeAttribute(
                    model,
                    { name: p.name, type: p.type, modifiers: ['private', 'final'], pos },
                    cl
                )
            )
            this.parseJavaMembers(m, he + 1, bodyEnd, cl, model, pkg)
            return
        }

        const eq = this.indexTopLevel(header, '=')
        const decl = eq >= 0 ? header.slice(0, eq) : header
        const open = decl.indexOf('(')
        if (open >= 0) {
            // method or constructor
            const mm = decl.slice(0, open).match(/^([\s\S]*?)([A-Za-z_$][\w$]*)\s*$/)
            if (!mm) {
                return
            }
            const close = this.closeIndex(decl, open)
            const { modifiers, rest } = this.takeJavaModifiers(mm[1])
            let prefix = rest
            let typeParameters = []
            if (prefix.startsWith('<')) {
                const c = this.closeIndex(prefix, 0)
                typeParameters = this.splitTopLevel(prefix.slice(1, c)).map((t) =>
                    this.normalizeType(t)
                )
                prefix = prefix.slice(c + 1).trim()
            }
            const throwsMatch = decl
                .slice(close + 1)
                .match(/\bthrows\s+(.*?)\s*(?:\bdefault\b.*)?$/)
            const isConstructor = prefix === '' && (!owner || mm[2] === owner.name)
            if (prefix === '' && !isConstructor) {
                return
            }
            const hasBody = bodyEnd !== null
            this.makeMethod(
                model,
                {
                    kind: isConstructor ? 'constructor' : owner ? 'method' : 'function',
                    name: mm[2],
                    modifiers,
                    returnType: isConstructor ? null : this.normalizeType(prefix),
                    parameters: this.parseJavaParams(decl.slice(open + 1, close)),
                    typeParameters,
                    throws: throwsMatch
                        ? this.splitTopLevel(throwsMatch[1]).map((t) => this.normalizeType(t))
                        : [],
                    hasBody,
                    localVariables: hasBody ? this.scanJavaLocals(m, he + 1, bodyEnd) : [],
                    controlStructures: hasBody
                        ? this.scanControlStructures(m, he + 1, bodyEnd, 'java')
                        : [],
                    pos,
                    endPos,
                },
                owner
            )
            return
        }
        if (bodyEnd !== null) {
            return // initializer block
        }

        // attribute(s): mods Type a = ..., b;
        const parts = this.splitTopLevel(header)
        const first = parts.shift() || ''
        const firstEq = this.indexTopLevel(first, '=')
        const { modifiers, rest } = this.takeJavaModifiers(
            firstEq >= 0 ? first.slice(0, firstEq) : first
        )
        const dm = rest.match(/^([\s\S]+?)\s*\b([A-Za-z_$][\w$]*)\s*((?:\[\s*\]\s*)*)$/)
        if (!dm || !/^[A-Za-z_$][\w$.]*\s*(<.*>)?\s*(\[\s*\]\s*)*$/.test(dm[1])) {
            return
        }
        const type = dm[1]
        const add = (name, dims, init) =>
            this.makeAttribute(
                model,
                {
                    name,
                    modifiers,
                    type: this.normalizeType(type + dims),
                    hasInitializer: init,
                    pos,
                    endPos,
                },
                owner
            )
        add(dm[2], dm[3], firstEq >= 0)
        parts.forEach((p) => {
            const pm = p.match(/^([A-Za-z_$][\w$]*)\s*((?:\[\s*\]\s*)*)(=|$)/)
            if (pm) {
                add(pm[1], pm[2], pm[3] === '=')
            }
        })
    },

    parseJavaParams(text) {
        return this.splitTopLevel(this.stripAnnotations(text))
            .map((p) => {
                const mm = p.match(
                    /^((?:final\s+)*)([\s\S]+?)\s*(\.\.\.)?\s*\b([A-Za-z_$][\w$]*)\s*((?:\[\s*\]\s*)*)$/
                )
                if (!mm) {
                    return null
                }
                return {
                    name: mm[4],
                    type: this.normalizeType(mm[2] + (mm[3] ? '[]' : '') + mm[5]),
                    modifiers: mm[1].trim() ? ['final'] : [],
                }
            })
            .filter((p) => p)
    },

    // Local variable declarations in a Java body: declaration statements, for
    // headers, for-each variables, catch parameters and try resources.
    scanJavaLocals(m, from, to) {
        const body = m.slice(from, to)
        const keywords =
            /^(return|throw|new|case|yield|assert|else|do|break|continue|goto|package|import|instanceof|extends|super|this|throws)$/
        const type = String.raw`[A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*(?:\s*<[\w$\s.,?<>[\]]*>)?(?:\s*\[\s*\])*`
        const re = new RegExp(
            String.raw`(^|[{};(:])(\s*)((?:final\s+|@[\w$.]+\s+)*)(${type})\s+([A-Za-z_$][\w$]*)((?:\s*\[\s*\])*)\s*(?==|;|,|:(?!:)|\))`,
            'g'
        )
        const res = []
        let mm
        while ((mm = re.exec(body)) !== null) {
            const typeText = mm[4]
            if (keywords.test(typeText.trim())) {
                continue
            }
            const boundary = mm.index
            const nameEnd = mm.index + mm[0].length
            // explicitly typed lambda parameters: (int a, int b) -> ...
            if (body[boundary] === '(') {
                const close = this.closeIndex(body, boundary)
                if (/^\s*->/.test(body.slice(close + 1))) {
                    continue
                }
            }
            const modifiers = /\bfinal\b/.test(mm[3]) ? ['final'] : []
            const at = from + boundary + mm[1].length + mm[2].length
            res.push(
                this.makeLocal(
                    mm[5],
                    this.normalizeType(typeText + mm[6]),
                    modifiers,
                    body[nameEnd] === '=',
                    at
                )
            )
            // further declarators: int a = 1, b = 2;
            let end = nameEnd
            while (
                end < body.length &&
                body[end] !== ';' &&
                body[end] !== ')' &&
                body[end] !== ':'
            ) {
                end = '({['.includes(body[end]) ? this.closeIndex(body, end) + 1 : end + 1
            }
            this.splitTopLevel(body.slice(nameEnd, end))
                .slice(1)
                .forEach((p) => {
                    const pm = p.match(/^([A-Za-z_$][\w$]*)\s*((?:\[\s*\]\s*)*)(=|$)/)
                    if (pm) {
                        res.push(
                            this.makeLocal(
                                pm[1],
                                this.normalizeType(typeText + mm[6] + pm[2]),
                                modifiers,
                                pm[3] === '=',
                                at
                            )
                        )
                    }
                })
        }
        return res
    },

    // -- JavaScript source --

    parseJavaScript(src) {
        const m = this.maskSource(src, 'javascript')
        const model = this.newModel('javascript', 'parser')
        this.parseJsScope(m, 0, m.length, model)
        return model
    },

    // Declarations on the top level of [from, to)
    parseJsScope(m, from, to, model) {
        let i = from
        while (i < to) {
            const c = m[i]
            if (c === '{' || c === '(' || c === '[') {
                i = this.closeIndex(m, i) + 1
            } else if (/[A-Za-z_$]/.test(c) && (i === 0 || !/[\w$.]/.test(m[i - 1]))) {
                const next = this.parseJsStatement(m, i, to, model)
                if (next > i) {
                    i = next
                } else {
                    while (i < to && /[\w$]/.test(m[i])) {
                        i++
                    }
                }
            } else {
                i++
            }
        }
    },

    // Parses a class, function or variable declaration at `i`, returns the index
    // after it (or `i` if there is none).
    parseJsStatement(m, i, to, model) {
        const at = (re) => {
            re.lastIndex = i
            return re.exec(m)
        }
        let mm = at(
            /(?:export\s+(?:default\s+)?)?class\s+([A-Za-z_$][\w$]*)(?:\s+extends\s+([^{]+?))?\s*\{/y
        )
        if (mm) {
            const open = i + mm[0].length - 1
            const close = this.closeIndex(m, open)
            this.parseJsClass(m, mm[1], mm[2], open, close, i, model)
            return close + 1
        }
        mm = at(
            /(?:export\s+(?:default\s+)?)?(async\s+)?function\s*(\*)?\s*([A-Za-z_$][\w$]*)\s*\(/y
        )
        if (mm) {
            const open = i + mm[0].length - 1
            const modifiers = [mm[1] ? 'async' : null, mm[2] ? 'generator' : null].filter((x) => x)
            return this.parseJsFunction(m, mm[3], 'function', modifiers, open, i, null, model)
        }
        mm = at(/(?:export\s+)?(const|let|var)\s+/y)
        if (mm) {
            const start = i + mm[0].length
            const end = this.jsStatementEnd(m, start, to)
            let offset = start
            this.splitTopLevel(m.slice(start, end)).forEach((part) => {
                const partPos = m.indexOf(part, offset)
                offset = partPos + part.length
                const dm = part.match(/^([A-Za-z_$][\w$]*)\s*(=\s*)?/)
                if (!dm) {
                    return
                }
                const initPos = partPos + dm[0].length
                if (dm[2] && this.jsFunctionAt(m, initPos)) {
                    this.parseJsFunctionValue(
                        m,
                        dm[1],
                        'function',
                        [],
                        initPos,
                        partPos,
                        null,
                        model
                    )
                } else if (dm[2] && /^class\b/.test(m.slice(initPos))) {
                    const open = m.indexOf('{', initPos)
                    const ext = (m.slice(initPos, open).match(/\bextends\s+([^{]+?)\s*$/) || [])[1]
                    this.parseJsClass(m, dm[1], ext, open, this.closeIndex(m, open), partPos, model)
                } else {
                    this.makeAttribute(
                        model,
                        {
                            name: dm[1],
                            modifiers: [mm[1]],
                            type: null,
                            hasInitializer: !!dm[2],
                            pos: partPos,
                        },
                        null
                    )
                }
            })
            return end + 1
        }
        return i
    },

    // End of a statement: ';' or a line break that does not continue the expression
    jsStatementEnd(m, from, to) {
        let i = from
        while (i < to) {
            const c = m[i]
            if ('({['.includes(c)) {
                i = this.closeIndex(m, i) + 1
                continue
            }
            if (c === ';' || c === '}') {
                return i
            }
            if (c === '\n') {
                const before = m.slice(from, i).trimEnd()
                const after = m.slice(i).trimStart()
                if (
                    before !== '' &&
                    !/[=+\-*/%,&|?:<>!(]$/.test(before) &&
                    !/^[.?+\-*/%&|,=)]/.test(after)
                ) {
                    return i
                }
            }
            i++
        }
        return to
    },

    // Is there a function expression or an arrow function at `i`?
    jsFunctionAt(m, i) {
        const rest = m.slice(i, i + 2000)
        if (/^(async\s+)?function\b/.test(rest)) {
            return true
        }
        const am = rest.match(/^(async\s*)?(\(|[A-Za-z_$][\w$]*\s*=>)/)
        if (!am) {
            return false
        }
        if (am[2] !== '(') {
            return true
        }
        const open = i + am[0].length - 1
        return /^\s*=>/.test(m.slice(this.closeIndex(m, open) + 1))
    },

    // A function expression or arrow function at `i`, assigned to `name`
    parseJsFunctionValue(m, name, kind, modifiers, i, pos, cl, model) {
        const rest = m.slice(i)
        const async = /^async\b/.test(rest)
        const mods = [...modifiers, ...(async ? ['async'] : [])]
        const fm = rest.match(/^(async\s+)?function\s*(\*)?\s*[\w$]*\s*\(/)
        if (fm) {
            return this.parseJsFunction(
                m,
                name,
                kind,
                [...mods, ...(fm[2] ? ['generator'] : [])],
                i + fm[0].length - 1,
                pos,
                cl,
                model
            )
        }
        const am = rest.match(/^(async\s*)?(\(|([A-Za-z_$][\w$]*)\s*=>)/)
        let params
        let arrow
        if (am[3]) {
            params = [{ name: am[3], type: null, modifiers: [] }]
            arrow = i + am[0].length
        } else {
            const open = i + am[0].length - 1
            const close = this.closeIndex(m, open)
            params = this.parseJsParams(m.slice(open + 1, close))
            arrow = m.indexOf('=>', close) + 2
        }
        const bodyStart = this.skipSpace(m, arrow)
        const bodyEnd =
            m[bodyStart] === '{'
                ? this.closeIndex(m, bodyStart)
                : this.jsStatementEnd(m, bodyStart, m.length)
        this.makeMethod(
            model,
            {
                kind,
                name,
                modifiers: mods,
                parameters: params,
                hasBody: true,
                localVariables: this.scanJsLocals(m, bodyStart, bodyEnd),
                controlStructures: this.scanControlStructures(m, bodyStart, bodyEnd, 'javascript'),
                pos,
                endPos: bodyEnd + 1,
            },
            cl
        )
        return bodyEnd + 1
    },

    // `open` is the '(' of the parameter list; returns the index after the body
    parseJsFunction(m, name, kind, modifiers, open, pos, cl, model) {
        const close = this.closeIndex(m, open)
        const bodyStart = m.indexOf('{', close)
        const hasBody = bodyStart >= 0
        const bodyEnd = hasBody ? this.closeIndex(m, bodyStart) : close
        this.makeMethod(
            model,
            {
                kind,
                name,
                modifiers,
                parameters: this.parseJsParams(m.slice(open + 1, close)),
                hasBody,
                localVariables: hasBody ? this.scanJsLocals(m, bodyStart + 1, bodyEnd) : [],
                controlStructures: hasBody
                    ? this.scanControlStructures(m, bodyStart + 1, bodyEnd, 'javascript')
                    : [],
                pos,
                endPos: bodyEnd + 1,
            },
            cl
        )
        return bodyEnd + 1
    },

    parseJsParams(text) {
        return this.splitTopLevel(text).map((p) => {
            const rest = p.startsWith('...')
            const name = p
                .replace(/^\.\.\./, '')
                .replace(/\s*=[\s\S]*$/, '')
                .trim()
            return { name, type: null, modifiers: rest ? ['rest'] : [] }
        })
    },

    parseJsClass(m, name, ext, open, close, pos, model) {
        const cl = this.makeClass(model, {
            name,
            extends: ext ? ext.trim() : null,
            pos,
            endPos: close + 1,
        })
        let i = open + 1
        while (i < close) {
            i = this.skipSpace(m, i, close)
            if (i >= close) {
                break
            }
            if (m[i] === ';') {
                i++
                continue
            }
            const start = i
            const modifiers = []
            let mm
            const at = (re) => {
                re.lastIndex = i
                return re.exec(m)
            }
            if ((mm = at(/static\s*\{/y))) {
                i = this.closeIndex(m, i + mm[0].length - 1) + 1
                continue
            }
            while ((mm = at(/(static|async|get|set)\s+(?=[#\w$*[])/y))) {
                modifiers.push(mm[1])
                i += mm[0].length
            }
            if (m[i] === '*') {
                modifiers.push('generator')
                i = this.skipSpace(m, i + 1, close)
            }
            let memberName
            if ((mm = at(/#?[A-Za-z_$][\w$]*/y))) {
                memberName = mm[0]
                i += mm[0].length
            } else if (m[i] === '[' || m[i] === '"' || m[i] === "'") {
                const end = m[i] === '[' ? this.closeIndex(m, i) : m.indexOf(m[i], i + 1)
                memberName = m.slice(i, end + 1)
                i = end + 1
            } else {
                i++
                continue
            }
            if (memberName.startsWith('#')) {
                memberName = memberName.slice(1)
                modifiers.push('private')
            } else {
                modifiers.push('public')
            }
            // stay on the line: a field without initializer ends at the line break
            while (i < close && (m[i] === ' ' || m[i] === '\t')) {
                i++
            }
            if (m[i] === '(') {
                const isConstructor = memberName === 'constructor' && !modifiers.includes('static')
                i = this.parseJsFunction(
                    m,
                    memberName,
                    isConstructor ? 'constructor' : 'method',
                    modifiers,
                    i,
                    start,
                    cl,
                    model
                )
                continue
            }
            // field, possibly holding a function
            const end = m[i] === '=' ? this.jsStatementEnd(m, i, close) : i
            if (m[i] === '=') {
                const initPos = this.skipSpace(m, i + 1, end)
                if (this.jsFunctionAt(m, initPos)) {
                    this.parseJsFunctionValue(
                        m,
                        memberName,
                        'method',
                        modifiers,
                        initPos,
                        start,
                        cl,
                        model
                    )
                    i = end + 1
                    continue
                }
            }
            this.makeAttribute(
                model,
                {
                    name: memberName,
                    modifiers,
                    type: null,
                    hasInitializer: m[i] === '=',
                    pos: start,
                },
                cl
            )
            i = end + 1
        }
        // attributes assigned in methods: this.x = ...
        ;[...cl.constructors, ...cl.methods].forEach((fn) => {
            const re = /\bthis\.(#?[A-Za-z_$][\w$]*)\s*=(?![=>])/g
            const body = m.slice(fn.pos, fn.endPos)
            let am
            while ((am = re.exec(body)) !== null) {
                const priv = am[1].startsWith('#')
                const attrName = priv ? am[1].slice(1) : am[1]
                this.makeAttribute(
                    model,
                    {
                        name: attrName,
                        modifiers: [priv ? 'private' : 'public'],
                        type: null,
                        hasInitializer: true,
                        pos: fn.pos + am.index,
                    },
                    cl
                )
            }
        })
        return cl
    },

    // let / const / var declarations in a body, including destructuring
    scanJsLocals(m, from, to) {
        const res = []
        if (from < 0 || to <= from) {
            return res
        }
        const re = /\b(const|let|var)\s+/g
        re.lastIndex = from
        let mm
        while ((mm = re.exec(m)) !== null && mm.index < to) {
            if (mm.index > 0 && /[\w$.]/.test(m[mm.index - 1])) {
                continue
            }
            const start = mm.index + mm[0].length
            const end = Math.min(this.jsStatementEnd(m, start, to), to)
            let head = m.slice(start, end)
            // for (const x of xs) / for (let k in o)
            const loop = head.match(/^([\s\S]*?)\s+\b(of|in)\b/)
            if (loop && !/=/.test(loop[1])) {
                head = loop[1]
            }
            const closeParen = this.indexTopLevel(head, ')')
            if (closeParen >= 0) {
                head = head.slice(0, closeParen)
            }
            const semicolon = this.indexTopLevel(head, ';')
            if (semicolon >= 0) {
                head = head.slice(0, semicolon)
            }
            this.splitTopLevel(head).forEach((part) => {
                const eq = this.indexTopLevel(part, '=')
                const target = (eq >= 0 ? part.slice(0, eq) : part).trim()
                const hasInit = eq >= 0 || !!loop
                this.jsBindingNames(target).forEach((name) =>
                    res.push(this.makeLocal(name, null, [mm[1]], hasInit, mm.index))
                )
            })
        }
        return res
    },

    // Names bound by a JS binding target: a, {a, b: c, d = 1, ...e}, [x, , y]
    jsBindingNames(target) {
        target = target.trim()
        if (/^[A-Za-z_$][\w$]*$/.test(target)) {
            return [target]
        }
        if (target.startsWith('{') || target.startsWith('[')) {
            return this.splitTopLevel(target.slice(1, -1)).flatMap((p) => {
                p = p.replace(/^\.\.\./, '')
                const eq = this.indexTopLevel(p, '=')
                p = eq >= 0 ? p.slice(0, eq) : p
                const colon = target.startsWith('{') ? this.indexTopLevel(p, ':') : -1
                return this.jsBindingNames(colon >= 0 ? p.slice(colon + 1) : p)
            })
        }
        return []
    },

    // -- Python source --

    pythonKeywords:
        /^(False|None|True|and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield|match|case)$/,

    parsePython(src) {
        const m = this.maskSource(src, 'python')
        const model = this.newModel('python', 'parser')
        const lines = this.pythonLines(m)
        this.parsePythonBlock(lines, 0, lines.length, null, model)
        return model
    },

    // Logical lines: { indent, text (whitespace collapsed), pos }
    pythonLines(m) {
        const lines = []
        let i = 0
        while (i < m.length) {
            let end = i
            let depth = 0
            while (end < m.length) {
                const c = m[end]
                if ('([{'.includes(c)) {
                    depth++
                } else if (')]}'.includes(c)) {
                    depth = Math.max(0, depth - 1)
                } else if (c === '\n' && depth === 0 && m[end - 1] !== '\\') {
                    break
                }
                end++
            }
            const raw = m.slice(i, end)
            const indent = raw.match(/^[ \t]*/)[0]
            const text = raw.replace(/\\\n/g, ' ').replace(/\s+/g, ' ').trim()
            // lines holding only (masked) string literals, e.g. docstrings
            if (text !== '' && !/^[rbuf]*("""|'''|"|')[\s"']*$/i.test(text)) {
                lines.push({
                    indent: indent.replace(/\t/g, '    ').length,
                    text,
                    pos: i + indent.length,
                })
            }
            i = end + 1
        }
        return lines
    },

    // Index after the block of lines[i] (all following lines indented deeper)
    pythonBlockEnd(lines, i, to) {
        let j = i + 1
        while (j < to && lines[j].indent > lines[i].indent) {
            j++
        }
        return j
    },

    pythonVisibility(name) {
        if (/^__.*__$/.test(name)) {
            return 'public'
        }
        if (name.startsWith('__')) {
            return 'private'
        }
        return name.startsWith('_') ? 'protected' : 'public'
    },

    parsePythonBlock(lines, from, to, owner, model) {
        let decorators = []
        let i = from
        while (i < to) {
            const line = lines[i]
            const end = this.pythonBlockEnd(lines, i, to)
            const t = line.text
            let mm
            if (t.startsWith('@')) {
                decorators.push(t.slice(1).replace(/\(.*$/, '').trim())
                i++
                continue
            }
            if ((mm = t.match(/^class\s+([A-Za-z_]\w*)\s*(?:\((.*)\))?\s*:/))) {
                const bases = mm[2] ? this.splitTopLevel(mm[2]).filter((b) => !/=/.test(b)) : []
                const cl = this.makeClass(
                    model,
                    {
                        name: mm[1],
                        modifiers: decorators.map((d) => '@' + d),
                        extends: bases[0] || null,
                        implements: bases,
                        pos: line.pos,
                        endPos: end < lines.length ? lines[end].pos : undefined,
                    },
                    owner
                )
                this.parsePythonBlock(lines, i + 1, end, cl, model)
            } else if ((mm = t.match(/^(async\s+)?def\s+([A-Za-z_]\w*)\s*\(/))) {
                this.parsePythonFunction(lines, i, end, mm, decorators, owner, model)
            } else if (owner === null || owner.kind === 'class') {
                const assignment = this.pythonAssignment(t)
                if (assignment) {
                    assignment.names.forEach((name) =>
                        this.makeAttribute(
                            model,
                            {
                                name,
                                modifiers: [
                                    ...(owner ? ['static'] : []),
                                    this.pythonVisibility(name),
                                ],
                                type: assignment.type,
                                hasInitializer: assignment.hasInit,
                                pos: line.pos,
                            },
                            owner
                        )
                    )
                }
            }
            decorators = []
            i = end
        }
    },

    parsePythonFunction(lines, i, end, mm, decorators, owner, model) {
        const line = lines[i]
        const t = line.text
        const open = mm[0].length - 1
        const close = this.closeIndex(t, open)
        const retMatch = t.slice(close + 1).match(/^\s*->\s*(.+?)\s*:/)
        const params = []
        this.splitTopLevel(t.slice(open + 1, close)).forEach((p) => {
            if (p === '*' || p === '/') {
                return
            }
            const pm = p.match(/^(\*{0,2})([A-Za-z_]\w*)\s*(?::\s*([^=]+?))?\s*(=.*)?$/)
            if (pm) {
                params.push({
                    name: pm[2],
                    type: pm[3] ? this.pythonType(pm[3]) : null,
                    modifiers: pm[1] === '*' ? ['varargs'] : pm[1] === '**' ? ['kwargs'] : [],
                    prefix: pm[1],
                })
            }
        })
        const known = {
            staticmethod: 'static',
            classmethod: 'classmethod',
            property: 'property',
            abstractmethod: 'abstract',
        }
        const modifiers = decorators.map((d) => known[d.split('.').pop()]).filter((x) => x)
        if (mm[1]) {
            modifiers.push('async')
        }
        modifiers.push(this.pythonVisibility(mm[2]))
        const isMethod = owner !== null && owner.kind === 'class'
        const receiver =
            isMethod && !modifiers.includes('static') && params.length ? params.shift().name : null
        const body = this.analyzePythonBody(lines, i, end, t.slice(close + 1))
        const isConstructor = isMethod && mm[2] === '__init__'
        const fn = this.makeMethod(
            model,
            {
                kind: isConstructor ? 'constructor' : isMethod ? 'method' : 'function',
                name: mm[2],
                modifiers,
                returnType: retMatch ? this.pythonType(retMatch[1]) : null,
                parameters: params.map(({ name, type, modifiers, prefix }) => ({
                    name,
                    type,
                    modifiers,
                    prefix,
                })),
                hasBody: true,
                localVariables: body.localVariables,
                controlStructures: body.controlStructures,
                decorators,
                receiver,
                pos: line.pos,
                endPos: end < lines.length ? lines[end].pos : undefined,
            },
            isMethod ? owner : null
        )
        fn.parameters.forEach((p) => delete p.prefix)
        if (receiver) {
            fn.receiver = receiver
            // instance attributes: self.x = ... / self.x: int = ...
            const re = new RegExp(`^${receiver}\\.([A-Za-z_]\\w*)\\s*(?::\\s*([^=]+?))?\\s*=(?!=)`)
            for (let k = i + 1; k < end; k++) {
                const am = lines[k].text.match(re)
                if (am) {
                    this.makeAttribute(
                        model,
                        {
                            name: am[1],
                            modifiers: [this.pythonVisibility(am[1])],
                            type: am[2] ? this.pythonType(am[2]) : null,
                            hasInitializer: true,
                            pos: lines[k].pos,
                        },
                        owner
                    )
                }
            }
        }
    },

    // A type hint, string hints ("Shape") are unquoted
    pythonType(hint) {
        return this.normalizeType(hint.trim().replace(/^(["'])(.*)\1$/, '$2'))
    },

    // `a = 1`, `a, b = 1, 2`, `a: int = 1`, `a: int` → { names, type, hasInit }
    pythonAssignment(text) {
        const mm = text.match(
            /^(\(?\s*[A-Za-z_]\w*(?:\s*,\s*[A-Za-z_]\w*)*\s*,?\s*\)?)\s*(?::\s*([^=]+?))?\s*(=(?!=)|$)/
        )
        if (!mm || (mm[3] === '' && !mm[2])) {
            return null
        }
        const names = mm[1]
            .replace(/[()]/g, '')
            .split(',')
            .map((n) => n.trim())
            .filter((n) => n !== '')
        if (names.some((n) => this.pythonKeywords.test(n)) || (mm[2] && names.length > 1)) {
            return null
        }
        return { names, type: mm[2] ? this.pythonType(mm[2]) : null, hasInit: mm[3] === '=' }
    },

    // Local variables and control structures in the body of lines[i] (nested
    // functions and classes are skipped). `inline` is the header after ')'.
    analyzePythonBody(lines, i, end, inline) {
        const localVariables = []
        const controlStructures = []
        const seen = new Set()
        const globals = new Set()
        const add = (name, type, hasInit, pos) => {
            if (seen.has(name) || globals.has(name)) {
                return
            }
            seen.add(name)
            const isFinal = !!type && /^(typing\.)?Final\b/.test(type)
            localVariables.push(this.makeLocal(name, type, isFinal ? ['final'] : [], hasInit, pos))
        }
        const statements = []
        const inlineBody = (inline.match(/:\s*(.+)$/) || [])[1]
        if (inlineBody) {
            statements.push({ text: inlineBody, pos: lines[i].pos })
        }
        for (let k = i + 1; k < end; k++) {
            const t = lines[k].text
            if (/^(async\s+)?def\s|^class\s/.test(t)) {
                k = this.pythonBlockEnd(lines, k, end) - 1
                continue
            }
            statements.push({ text: t, pos: lines[k].pos })
        }
        const kinds = { if: 'if', elif: 'if', for: 'foreach', while: 'while', try: 'try' }
        statements.forEach(({ text, pos }) => {
            const first = (text.match(/^(async\s+)?([a-z]+)\b/) || [])[2]
            if (kinds[first]) {
                controlStructures.push({ kind: kinds[first], pos })
            } else if (first === 'match' && /:$/.test(text)) {
                controlStructures.push({ kind: 'switch', pos })
            }
            let mm
            if ((mm = text.match(/^(?:global|nonlocal)\s+(.+)$/))) {
                mm[1].split(',').forEach((n) => globals.add(n.trim()))
            } else if ((mm = text.match(/^(?:async\s+)?for\s+(.+?)\s+in\s/))) {
                mm[1]
                    .replace(/[()[\]]/g, '')
                    .split(',')
                    .map((n) => n.trim())
                    .filter((n) => /^[A-Za-z_]\w*$/.test(n))
                    .forEach((n) => add(n, null, true, pos))
            } else if (/^(async\s+)?with\s|^except\b/.test(text)) {
                const re = /\bas\s+([A-Za-z_]\w*)/g
                let am
                while ((am = re.exec(text)) !== null) {
                    add(am[1], null, true, pos)
                }
            } else {
                const assignment = this.pythonAssignment(text)
                if (assignment) {
                    assignment.names.forEach((n) =>
                        add(n, assignment.type, assignment.hasInit, pos)
                    )
                }
            }
        })
        return { localVariables, controlStructures }
    },

    // -- formatting -----------------------------------------------------------

    flattenTests(tests, res) {
        res = res || []
        tests.forEach((t) => {
            res.push(t)
            if (t.sub !== undefined) {
                this.flattenTests(t.sub, res)
            }
        })
        return res
    },

    formatTestResults(tests) {
        return (
            '<ol>' +
            tests
                .map((t) => {
                    if (t.hidden) {
                        return ''
                    }
                    const color = t.ok === undefined ? 'gray' : t.ok ? 'white' : 'red'
                    const state =
                        t.ok === undefined
                            ? 'contact_support'
                            : t.ok
                              ? t.badge !== undefined
                                  ? 'verified'
                                  : 'done'
                              : 'dangerous'
                    const style = t.ok === undefined ? 'text-decoration: line-through;' : ''
                    let res = `<li style="${style}color:${color}">${t.text} <cb-icon>${this.iconForState[state]}</cb-icon>`
                    if (t.sub !== undefined) {
                        res += this.formatTestResults(t.sub)
                    }
                    return res + '</li>'
                })
                .join('') +
            '</ol>'
        )
    },

    // -- styles -------------------------------------------------------------------
    // Kept self-contained here (rather than in a separate TEXT block) so this
    // library works standalone wherever it's dropped in.

    styles() {
        return `<style>
    .cb-test {
        border-radius: 4px;
        background-color: black;
        color: white;
        padding: 0px 4px 1px 4px;
        margin-bottom: 0px;
    }
    #cb-test-legend {
        margin-bottom: 20px;
        margin-top: 0px;
        opacity: 0.75;
    }
    .cb-test h2 {
        color: white;
        font-family: roboto;
        font-weight: 200;
        padding-top: 4px;
        padding-bottom: 8px;
        padding-left: 8px;
    }
    #cb-test-result {
        margin-left: 16px !important;
    }
    #cb-test-result ol {
        margin-left: 16px;
        padding-left: 0px;
    }
    #cb-test-result ol ol {
        list-style-type: none;
        counter-reset: list;
        margin-left: 12px !important;
    }
    #cb-test-result ol ol > li {
        counter-increment: list;
    }
    #cb-test-result ol ol > li:before {
        content: counter(list, lower-alpha) ') ';
    }
</style>`
    },
}
