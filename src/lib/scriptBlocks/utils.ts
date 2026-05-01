import { IParsedError } from '@/lib/IScriptBlock'

export interface ICodeTemplate {
    prefix: string
    postfix: string
}

export const jsErrorParser = function (e: any, templ?: ICodeTemplate): IParsedError {
    console.error(e)
    let line: number | undefined = undefined
    let column: number | undefined = undefined
    if (e.line) {
        line = Math.max(1, e.line)
    } else if (e.lineNumber) {
        line = Math.max(1, e.lineNumber)
    }

    if (e.column) {
        column = e.column
    } else if (e.columnNumber) {
        column = e.columnNumber
    }

    if (line === undefined) {
        const lines = e.stack.split('\n')
        if (lines.length > 1) {
            const regex = /<anonymous>:(\d+):(\d+)/gm
            let m: RegExpExecArray | null = null
            if ((m = regex.exec(lines[1])) !== null) {
                line = Math.max(1, Number(m[1]) - 1)
                column = Math.max(1, Number(m[2]) - 1)
            }
        }
    }

    if (line !== undefined) {
        line--
        if (line == 0) {
            if (column === undefined) {
                column = 0
            }
            if (templ !== undefined) {
                column -= templ.prefix.length
            }
        }
    }
    return { line: line!, column: column!, msg: e.message }
}
