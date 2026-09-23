import { ICodeEntry, ICodeRunEntry, CodeEntryType } from '../IScriptBlock'

// The subset of BlockData needed to describe a source code block
export interface ICodeSourceBlock {
    readonly id: number
    readonly uuid: string
    readonly name: string
    readonly hasCode: boolean
    readonly hidden: boolean
    readonly static: boolean
    readonly readonly: boolean
    actualContent(): string
}

// Read-only, live view on a source code block (used for this.CODE)
class CodeEntry implements ICodeEntry {
    constructor(protected readonly block: ICodeSourceBlock) {}

    get id(): number {
        return this.block.id
    }

    get uuid(): string {
        return this.block.uuid
    }

    get name(): string {
        return this.block.name
    }

    get type(): CodeEntryType {
        if (this.block.hidden) {
            return 'hidden'
        }
        if (this.block.static || this.block.readonly) {
            return 'regular'
        }
        return 'solution'
    }

    get content(): string {
        return this.block.actualContent()
    }
}

// Entry handed to alterCodeBeforeRun. Overrides are stored on the entry only; the
// blocks (and editors) are never modified. Once the source was assembled the entry is
// sealed, so a set() outside of alterCodeBeforeRun fails loudly instead of being ignored.
class CodeRunEntry extends CodeEntry implements ICodeRunEntry {
    private override: string | undefined = undefined
    private sealed = false

    get originalContent(): string {
        return this.block.actualContent()
    }

    get content(): string {
        return this.override ?? this.block.actualContent()
    }

    get isOverridden(): boolean {
        return this.override !== undefined
    }

    set(content: string): void {
        this.assertNotSealed()
        this.override = content
    }

    reset(): void {
        this.assertNotSealed()
        this.override = undefined
    }

    seal(): void {
        this.sealed = true
    }

    private assertNotSealed() {
        if (this.sealed) {
            throw new Error(
                'Code entries can only be changed while alterCodeBeforeRun(code) is running'
            )
        }
    }
}

function codeBlocks(blocks: readonly any[] | undefined): ICodeSourceBlock[] {
    if (!blocks) {
        return []
    }
    return (blocks as ICodeSourceBlock[]).filter((b) => b.hasCode)
}

// One read-only entry per block that contributes to the assembled source, in source order
export function createCodeEntries(blocks: readonly any[] | undefined): ICodeEntry[] {
    return codeBlocks(blocks).map((b) => new CodeEntry(b))
}

// Same as createCodeEntries, but the entries can be overridden until they are assembled
export function createCodeRunEntries(blocks: readonly any[] | undefined): ICodeRunEntry[] {
    return codeBlocks(blocks).map((b) => new CodeRunEntry(b))
}

// Builds the source from the (possibly overridden) entries and seals them.
// Must produce the same layout as completeSource in basicBlocks.ts
export function assembleSource(entries: readonly ICodeRunEntry[]): string {
    const source = entries.map((e) => e.content + '\n').join('')
    entries.forEach((e) => (e as CodeRunEntry).seal())
    return source
}
