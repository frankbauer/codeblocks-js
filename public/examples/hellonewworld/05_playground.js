export default {
    setupDOM: function () {
        this.canvasElement.hide()
        // Hand the test library our domain-specific "did the student pass" logic.
        // It will call this once per run, as callback(txt, json, ast).
        testLibrary.registerCallback(this.runTests.bind(this))
    },
    init: function () {},
    addArgumentsTo(args) {},
    update: function (txt, json) {
        // The test library already rendered the protocol from the registered
        // callback — nothing left to do with the output here.
        return txt
    },
    reset() {},

    getMainClass: function getMainClass(_code) {
        if (_code.indexOf(':class}') >= 0) {
            return '{:class}'
        }
        var ret = 'Unknown'
        var regexpMainClass =
            /public\s+?class\s+?([a-zA-Z_$0-9]+?)\s*?(\{|\simplements|\sextends)/gm
        var match
        while ((match = regexpMainClass.exec(_code)) !== null) {
            if (match[1]) {
                ret = match[1]
                break
            }
        }
        return ret
    },

    // Called by the test library as callback(txt, json, ast). `ast` is only ever
    // defined if the app's "emitAST" setting is enabled — this example doesn't need
    // it, but it's there if a more advanced test wants to inspect the syntax tree
    // instead of (or in addition to) the printed output.
    runTests: function (txt, json, ast) {
        const qID = this.scope.attr('data-question')
        const shouldA = `{:line1}
{:line2}

{:line3}`
        const shouldB = `${shouldA}
`
        const shouldClean = shouldA
            .replace(/[^a-z0-9!.',\-]/gim, ' ')
            .replace(/\s+/g, '')
            .toLowerCase()
        const txtClean = txt
            .replace(/[^a-z0-9!.',\-]/gim, ' ')
            .replace(/\s+/g, '')
            .toLowerCase()
        const content = this.scope.find(`textarea[data-question=${qID}][data-blocktype=2]`).val()
        const className = this.getMainClass(content)

        // Structural checks use the compiler's AST if "emitAST" is on (Java v102),
        // and parse the source code otherwise
        const java = testLibrary.java
        const mainMethod = java
            .findClasses()
            .map((cl) => java.findMethod(cl, 'main', ['String[]'], 'void', ['public', 'static']))
            .find((m) => m !== undefined)

        return [
            {
                ok: className == '{:class}',
                text: 'Korrekter Klassenname',
                badge: 'app',
                sub: [
                    {
                        ok: mainMethod !== undefined,
                        text: mainMethod
                            ? `main-Methode vorhanden: <code>${mainMethod.signature}</code> in <code>${mainMethod.className}</code>`
                            : 'main-Methode vorhanden: <code>public static void main(String[] args)</code>',
                    },
                ],
            },
            {
                ok: txt.trim() != '',
                text: 'Irgendeine Ausgabe',
                badge: 'out',
                sub: [
                    {
                        ok: txtClean == shouldClean,
                        text: 'Korrekter Text',
                    },
                    {
                        ok: txt == shouldA || txt == shouldB,
                        text: 'Exakte Ausgabe',
                        badge: 'all',
                    },
                ],
            },
        ]
    },
}
