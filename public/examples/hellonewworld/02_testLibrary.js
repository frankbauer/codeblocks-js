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
