export default {
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
        }
    },

    setupDOM() {
        this.libraryElement.html(`
            <div class="gditest" style="display:none;">
                <h2>Testprotokoll</h2>
                <div id="gditestresult"></div>
            </div>
            <div class="row" id="gditestlegend">
                <div style="padding-right:16px;" class="col-lg-3 col-sm-6 col-xs-12"><i class="q-icon notranslate material-icons">verified</i>: Richtig (Teil einer Auszeichnung)</div>
                <div style="padding-right:16px;" class="col-lg-3 col-sm-6 col-xs-12"><i class="q-icon notranslate material-icons">done</i>: Richtig</div>
                <div style="padding-right:16px;" class="col-lg-3 col-sm-6 col-xs-12"><i class="q-icon notranslate material-icons" style="color:red">dangerous</i>: Test nicht erfüllt</div>
                <div style="padding-right:16px;" class="col-lg-3 col-sm-6 col-xs-12"><i class="q-icon notranslate material-icons" style="color:gray">contact_support</i>: Kann nicht getestet werden</div>
            </div>
        `)
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

        this.libraryElement.find('#gditestresult').html(this.formatTestResults(tests))
        this.libraryElement.find('.gditest').show()
    },

    reset() {
        this.libraryElement?.find('.gditest').hide()
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
                    const icon =
                        t.ok === undefined
                            ? 'contact_support'
                            : t.ok
                              ? t.badge !== undefined
                                  ? 'verified'
                                  : 'done'
                              : 'dangerous'
                    const style = t.ok === undefined ? 'text-decoration: line-through;' : ''
                    let res = `<li style="${style}color:${color}">${t.text} <i class="q-icon notranslate material-icons">${icon}</i>`
                    if (t.sub !== undefined) {
                        res += this.formatTestResults(t.sub)
                    }
                    return res + '</li>'
                })
                .join('') +
            '</ol>'
        )
    },
}
