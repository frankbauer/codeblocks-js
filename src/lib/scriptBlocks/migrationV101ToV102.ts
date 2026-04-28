// Best-effort code migration from the v101 playground API to v102.
//
// v101 passes DOM context as method parameters:
//   init(canvasElement, outputElement, scope, runner)
//   update(txt, json, canvasElement, outputElement)
//   setupDOM(canvasElement, outputElement, scope)
//   reset(canvasElement)
//
// v102 injects them as object attributes before each call, so methods take no DOM args.
// Parameter names used by the author are detected from the actual signature and remapped.

function esc(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Finds the position of the closing '}' matching the opening '{' at `openPos`.
// Correctly skips strings, line comments, and block comments.
function findMatchingBrace(code: string, openPos: number): number {
    let depth = 1
    let i = openPos + 1
    let inStr: string | null = null
    let inLineComment = false
    let inBlockComment = false

    while (i < code.length) {
        const ch = code[i]
        if (inLineComment) {
            if (ch === '\n') inLineComment = false
        } else if (inBlockComment) {
            if (ch === '*' && code[i + 1] === '/') { inBlockComment = false; i++ }
        } else if (inStr) {
            if (ch === '\\') i++ // skip escaped char
            else if (ch === inStr) inStr = null
        } else {
            if (ch === '/' && code[i + 1] === '/') inLineComment = true
            else if (ch === '/' && code[i + 1] === '*') { inBlockComment = true; i++ }
            else if (ch === '"' || ch === "'" || ch === '`') inStr = ch
            else if (ch === '{') depth++
            else if (ch === '}') { depth--; if (depth === 0) return i }
        }
        i++
    }
    return -1
}

interface MethodSpec {
    name: string
    // indices in the old param list that carry DOM context
    domIndices: number[]
    // the standard attribute name for each domIndex (parallel array)
    standardNames: string[]
    // indices of params to keep in the new signature (e.g. txt, json for update)
    keepIndices: number[]
}

const METHOD_SPECS: MethodSpec[] = [
    { name: 'init',     domIndices: [0, 1, 2, 3], standardNames: ['canvasElement', 'outputElement', 'scope', 'runner'], keepIndices: [] },
    { name: 'update',   domIndices: [2, 3],        standardNames: ['canvasElement', 'outputElement'],                   keepIndices: [0, 1] },
    { name: 'setupDOM', domIndices: [0, 1, 2],     standardNames: ['canvasElement', 'outputElement', 'scope'],          keepIndices: [] },
    { name: 'reset',    domIndices: [0],            standardNames: ['canvasElement'],                                    keepIndices: [] },
]

// Within a method body, comment out explicit `this.X = param` assignments (the old
// manual-capture pattern) and replace remaining standalone uses of the param name
// with `this.standardName`.
function transformBody(body: string, paramMap: Map<string, string>): string {
    let result = body
    for (const [actualName, standardName] of paramMap) {
        // Comment out: this.standardName = actualName[;]
        result = result.replace(
            new RegExp(`(this\\.${esc(standardName)}\\s*=\\s*${esc(actualName)}\\s*;?)`, 'g'),
            `/* TODO: Removed — ${standardName} is now injected automatically by v102 */ // $1`
        )
        // Comment out: this.actualName = actualName[;]  (user stored under a different name)
        if (actualName !== standardName) {
            result = result.replace(
                new RegExp(`(this\\.${esc(actualName)}\\s*=\\s*${esc(actualName)}\\s*;?)`, 'g'),
                `/* TODO: Consider using this.${standardName} instead of this.${actualName} */ // $1`
            )
        }
        // Replace remaining standalone occurrences: avoid property accesses (obj.param)
        // by requiring that the identifier is not preceded by '.' or a word char.
        result = result.replace(
            new RegExp(`(?<![.\\w])${esc(actualName)}(?![\\w])`, 'g'),
            `this.${standardName}`
        )
    }
    return result
}

function transformMethod(code: string, spec: MethodSpec): string {
    // Match both shorthand methods and `name: [async] function(` style.
    // `async` keyword is optional before shorthand methods.
    const pattern = new RegExp(
        `(?<![.\\w])(?:async\\s+)?${esc(spec.name)}\\s*(?::\\s*(?:async\\s+)?function\\s*)?\\(`,
        'g'
    )

    // Collect occurrences first; process in reverse so offsets stay valid.
    type Occurrence = { matchStart: number; paramsStart: number; paramsEnd: number; braceOpen: number }
    const occurrences: Occurrence[] = []
    let m: RegExpExecArray | null
    while ((m = pattern.exec(code)) !== null) {
        const paramsStart = m.index + m[0].length // first char inside '('

        // Find closing paren (balance nested parens for default values)
        let parenDepth = 1
        let j = paramsStart
        while (j < code.length && parenDepth > 0) {
            if (code[j] === '(') parenDepth++
            else if (code[j] === ')') parenDepth--
            j++
        }
        const paramsEnd = j - 1 // position of ')'

        // Find opening brace (skip whitespace only — arrow functions won't have one here)
        let braceOpen = paramsEnd + 1
        while (braceOpen < code.length && /\s/.test(code[braceOpen])) braceOpen++
        if (code[braceOpen] !== '{') continue

        occurrences.push({ matchStart: m.index, paramsStart, paramsEnd, braceOpen })
    }

    // Process in reverse so earlier replacements don't shift later positions.
    let result = code
    for (let i = occurrences.length - 1; i >= 0; i--) {
        const { paramsStart, paramsEnd, braceOpen } = occurrences[i]

        // Parse actual parameter names (strip type annotations and defaults)
        const rawParams = result.substring(paramsStart, paramsEnd)
        const params = rawParams
            .split(',')
            .map((p) => p.trim().replace(/\s*=.*$/, '').replace(/\s*:.*$/, '').trim())

        // Build mapping from author's param name → standard attribute name
        const paramMap = new Map<string, string>()
        for (let k = 0; k < spec.domIndices.length; k++) {
            const idx = spec.domIndices[k]
            if (idx < params.length && params[idx]) {
                paramMap.set(params[idx], spec.standardNames[k])
            }
        }

        // New signature: keep non-DOM params
        const newParams = spec.keepIndices.map((idx) => params[idx] ?? '').filter(Boolean)

        // Extract and transform body
        const braceClose = findMatchingBrace(result, braceOpen)
        if (braceClose === -1) continue

        const body = result.substring(braceOpen + 1, braceClose)
        const newBody = transformBody(body, paramMap)

        // Reassemble: the opening '(' is at paramsStart - 1
        const openParen = paramsStart - 1
        result =
            result.substring(0, openParen + 1) +
            newParams.join(', ') +
            ') {\n' +
            newBody +
            '}' +
            result.substring(braceClose + 1)
    }
    return result
}

// Comment out object property declarations for the four DOM context attribute names.
// Applied line-by-line; may over-eagerly comment properties in deeply nested objects,
// but those are easy to restore and this is a best-effort migration.
function commentOutDOMProperties(code: string): string {
    return code.replace(
        /^(\s*)(canvasElement|outputElement|scope|runner)(\s*:)([^\n]*)/gm,
        (_, indent, name, colon, rest) =>
            `${indent}/* TODO: Removed — ${name} is now injected automatically by v102 */\n${indent}// ${name}${colon}${rest}`
    )
}

export function migrateV101ToV102(code: string): string {
    let result = code
    for (const spec of METHOD_SPECS) {
        result = transformMethod(result, spec)
    }
    result = commentOutDOMProperties(result)

    if (!/^\s*export\s+default\b/.test(result)) {
        result = 'export default ' + result.trimStart()
    }

    return result
}
