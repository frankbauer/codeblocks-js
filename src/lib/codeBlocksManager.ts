import {
    CodeOutputTypes,
    IBlockData,
    KnownBlockTypes,
    IRandomizerSettings,
    CodeExpansionType,
} from './ICodeBlocks'

import { tagger } from '@/plugins/tagger'
import { highlight } from '@/plugins/highlight'
import { storeBlock } from '@/storage/blockStorage'
import { UIThemeType, getUITheme } from '@/lib/uiTheme'
import { EditorTheme } from '@/plugins/codemirror/editorThemes'
import { AnyCodeBlockScope, IScriptBlock } from './IScriptBlock'
import { IRuntimeData, IRuntimeBlock } from './importExportUtils'
import { InternalCodeBlocksManager } from './domParser'
import { createScriptBlock, createLibraryScriptBlock } from './scriptBlock'
import { ICompilerErrorDescription, ICompilerID } from './ICompilerRegistry'
import {
    CUSTOM_LIBRARY_ID,
    getEmbeddedLibraryDefinition,
    type EmbeddedLibraryDefinition,
} from './embeddedLibraries'

export interface AppContext {
    appID: number
}

export class BlockData implements IBlockData {
    appSettings: IMainBlock
    hasCode: boolean
    _type: KnownBlockTypes
    content: string
    alternativeContent: string | null
    noContent: boolean
    id: number
    uuid: string
    parentID: number
    expanded: boolean
    codeExpanded: CodeExpansionType
    readonly: boolean
    static: boolean
    hidden: boolean
    version: string
    readyCount: number
    errors: ICompilerErrorDescription[]
    scopeUUID?: string
    scopeSelector!: string
    visibleLines: number | 'auto'
    hasAlternativeContent: boolean
    shouldAutoreset: boolean
    shouldReloadResources: boolean
    generateTemplate: boolean
    width: string
    height: string
    align: string
    lineCountHint: number
    name: string
    embeddedLibrary: string
    //true when the code has been changed and the script object needs to be rebuilt, false otherwise. This is used to delay the rebuild until the playground is actually run to avoid unnecessary rebuilds while editing.
    needsCodeRebuild: boolean

    obj: IScriptBlock | null
    dataObj: any | null

    constructor(d: IRuntimeBlock, mainBlock: IMainBlock) {
        this.obj = null
        this.dataObj = null
        this.needsCodeRebuild = false

        this.appSettings = mainBlock
        this._type = d.type
        this.content = d.content
        this.alternativeContent = d.alternativeContent || null
        this.noContent = d.noContent
        this.id = d.id
        this.uuid = d.uuid
        this.parentID = d.parentID

        const m = d.metadata as any
        this.expanded = m.expanded ?? true
        this.codeExpanded = m.codeExpanded ?? CodeExpansionType.AUTO
        this.static = m.static ?? d.type === KnownBlockTypes.BLOCKSTATIC
        this.hidden = m.hidden ?? d.type === KnownBlockTypes.BLOCKHIDDEN
        this.readonly = this.static || this.hidden || !!m.readonly
        this.hasCode =
            (m as any).hasCode ??
            (this.type === KnownBlockTypes.BLOCK ||
                this.type === KnownBlockTypes.BLOCKSTATIC ||
                this.type === KnownBlockTypes.BLOCKHIDDEN)

        this.version = m.version ?? '101'
        this.readyCount = d.readyCount
        this.errors = d.errors
        this.scopeUUID = d.scopeUUID
        this.scopeSelector = d.scopeSelector || ''
        this.visibleLines = m.visibleLines ?? 'auto'
        this.hasAlternativeContent = d.hasAlternativeContent ?? false
        this.shouldAutoreset = m.shouldAutoreset ?? false
        this.shouldReloadResources = m.shouldReloadResources ?? false
        this.generateTemplate = m.generateTemplate ?? this.type === KnownBlockTypes.PLAYGROUND
        this.width = m.width ?? '100%'
        this.height = m.height ?? '200px'
        this.align = m.align ?? 'center'
        this.lineCountHint = d.lineCountHint
        this.name = d.name
        this.embeddedLibrary = m.embeddedLibrary ?? CUSTOM_LIBRARY_ID

        if (
            this.type === KnownBlockTypes.PLAYGROUND ||
            this.type === KnownBlockTypes.LIBRARY ||
            this.type === KnownBlockTypes.DATA
        ) {
            if (this.content == '' || this.content === undefined || this.content === null) {
                if (this.type === KnownBlockTypes.LIBRARY) {
                    this.content = `export default {\n  create(context) {\n    return { greet: () => console.log("Greetings from ${this.name}") }\n  }\n}`
                } else if (this.type === KnownBlockTypes.PLAYGROUND) {
                    this.content = `export default {\n    init: function() {\n        // this.canvasElement.hide()\n    },\n    addArgumentsTo(args) {},\n    reset() {},\n    update: function(txt, json) {\n\n    }\n}`
                } else {
                    this.content = '{}'
                }
            }
        }

        this.initialize()
    }

    randomizerContent(setIndex: number): string | undefined {
        if (setIndex >= 0 && setIndex < this.appSettings.randomizer.sets.length) {
            return tagger.replaceRandomTagsInString(
                this.content,
                this.appSettings.randomizer.sets[setIndex]
            )
        }

        return undefined
    }

    randomizerAlternativeContent(setIndex: number): string | null | undefined {
        if (this.alternativeContent === null) {
            return null
        }
        if (setIndex >= 0 && setIndex < this.appSettings.randomizer.sets.length) {
            return tagger.replaceRandomTagsInString(
                this.alternativeContent,
                this.appSettings.randomizer.sets[setIndex]
            )
        }

        return undefined
    }

    actualContent() {
        if (this.type === KnownBlockTypes.LIBRARY) {
            const embedded = this.embeddedLibraryDefinition
            if (embedded) {
                return embedded.content
            }
        }

        console.i('this.appSettings.randomizer.active', this.appSettings.randomizer.active)
        if (this.appSettings.randomizer.active) {
            return tagger.replaceRandomTagsInString(
                this.content,
                this.appSettings.randomizer.sets[this.appSettings.randomizer.previewIndex]
            )
        }

        return this.content
    }

    actualAlternativeContent() {
        if (this.alternativeContent === null) {
            return null
        }
        if (this.appSettings.randomizer.active) {
            return tagger.replaceRandomTagsInString(
                this.alternativeContent,
                this.appSettings.randomizer.sets[this.appSettings.randomizer.previewIndex]
            )
        }

        return this.alternativeContent
    }

    recreateScriptObject() {
        if (this.type === KnownBlockTypes.PLAYGROUND) {
            console.i('recreateScriptObject - Playground')

            const so = createScriptBlock(this.actualContent(), this.version)
            this.obj = so
            console.i('Block Rebuild', this.obj, this.uuid)
        } else if (this.type === KnownBlockTypes.LIBRARY) {
            console.i('recreateScriptObject - Library')

            const so = createLibraryScriptBlock(this.actualContent(), this.actualName, this.version)
            this.obj = so
            console.i('Block Rebuild', this.obj, this.uuid)
        } else if (this.type === KnownBlockTypes.DATA) {
            console.i('recreateScriptObject - Data')

            this.dataObj = {
                name: '',
                content: '',
            }
            console.i('Block Rebuild', this.obj, this.uuid)
        } else {
            console.i('recreateScriptObject - UNKNOWN')
        }
    }

    initialize() {
        this.recreateScriptObject()
    }

    getThemeForBlock(bl: BlockData): EditorTheme {
        const theme = getUITheme(this.appSettings.uiTheme)
        if (bl.hasCode) {
            if (bl.static || bl.readonly || bl.hidden) {
                return theme.codeBlock
            }

            return theme.solutionBlock
        }

        return theme.otherBlocks
    }

    get themeForCodeBlock(): EditorTheme {
        return this.getThemeForBlock(this)
    }

    get isSourceCode(): boolean {
        return (
            this.type === KnownBlockTypes.BLOCK ||
            this.type === KnownBlockTypes.BLOCKSTATIC ||
            this.type === KnownBlockTypes.BLOCKHIDDEN
        )
    }

    get descriptiveName(): string {
        if (this.actualName) {
            return this.actualName
        }
        const content = this.content || ''
        const firstLine = content.replace(/\s*\n\s*/g, ' ').trim()
        if (firstLine.length > 0) {
            return firstLine.substring(0, 60) + (firstLine.length > 60 ? '...' : '')
        }
        return this.type
    }

    get isLast(): boolean {
        return this.id == this.appSettings.blocks.length - 1
    }

    get firstLine(): number {
        if (!this.isSourceCode) {
            return 1
        }
        if (this.id === 0) {
            return 1
        }
        return this.appSettings.blocks[this.id - 1].nextLine
    }

    get firstLineRaw(): number {
        if (this.id === 0) {
            return 1
        }
        return this.appSettings.blocks[this.id - 1].nextLine
    }

    get lineCount(): number {
        if (!this.hasCode) {
            return 0
        }
        if (this.lineCountHint >= 0) {
            return this.lineCountHint
        }

        let ct = 0
        this.content.replace(/\n/, (m) => {
            ct++
            return m
        })
        return ct
    }

    get nextLine(): number {
        if (!this.hasCode || !this.isSourceCode) {
            return this.firstLineRaw
        }
        return this.firstLineRaw + this.lineCount
    }

    get domLibs(): string[] {
        return this.appSettings.domLibs
    }

    //is this right. Happend when converting from JS
    get scriptVersion(): string {
        return this.version
    }

    get embeddedLibraryDefinition(): EmbeddedLibraryDefinition | undefined {
        if (this.type !== KnownBlockTypes.LIBRARY) {
            return undefined
        }
        return getEmbeddedLibraryDefinition(this.embeddedLibrary)
    }

    get isEmbeddedLibrary(): boolean {
        return this.embeddedLibraryDefinition !== undefined
    }

    get actualName(): string {
        return this.isEmbeddedLibrary ? this.embeddedLibrary : this.name
    }

    setSelectedEmbeddedLibrary(id: string): void {
        if (this.type !== KnownBlockTypes.LIBRARY) {
            return
        }
        if (this.embeddedLibrary === id) {
            return
        }

        this.embeddedLibrary = id
        this.needsCodeRebuild = true
        this.recreateScriptObject()
        this.appSettings.buildVersion++
    }

    copyEmbeddedLibraryToCustom(): void {
        const embedded = this.embeddedLibraryDefinition
        if (this.type !== KnownBlockTypes.LIBRARY || !embedded) {
            return
        }

        this.content = embedded.content
        this.name = embedded.id
        this.embeddedLibrary = CUSTOM_LIBRARY_ID
        this.needsCodeRebuild = true
        this.recreateScriptObject()
        this.appSettings.buildVersion++
    }

    get type(): KnownBlockTypes {
        return this._type
    }

    set type(newType: KnownBlockTypes) {
        const oldType = this._type
        this._type = newType
        this.onTypeChanged(newType, oldType)
    }

    onTypeChanged(newType: KnownBlockTypes, oldType: KnownBlockTypes) {
        if (newType != oldType) {
            this.recreateScriptObject()
            this.appSettings.buildVersion++
        }
    }

    get scope(): AnyCodeBlockScope {
        return this.scopeSelector
            ? $(this.scopeSelector)
            : $(`.codeblocks[uuid="${this.appSettings.uuid}"]`)
    }
}

export interface IMainBlock {
    id: number
    uuid: string
    editMode: boolean
    readonly: boolean
    randomizer: IRandomizerSettings
    blocks: BlockData[]
    compiler: ICompilerID
    language: string
    runCode: boolean
    emitAST: boolean
    domLibs: string[]
    workerLibs: string[]
    outputParser: CodeOutputTypes
    uiTheme: UIThemeType
    executionTimeout: number
    maxCharacters: number
    scopeUUID?: string
    scopeSelector?: string
    continuousCompilation: boolean
    messagePassing: boolean
    keepAlive: boolean
    persistentArguments: boolean
    shadowRoot?: ShadowRoot
    error?: string
    buildVersion: number

    applyRuntimeData(data: IRuntimeData, importSettings?: boolean): void

    swap(id1: number, id2: number): void

    moveUp(id: number): void

    moveDown(id: number): void

    changeOrder(id: number, newID: number): void

    removeBlock(idx: number): void

    addNewBlock(type?: KnownBlockTypes): void

    insertBlockAt(position: number, type?: KnownBlockTypes): void

    initArgsForLanguage(): object | string[]

    storeDefaultArgs(args: object | string[]): void

    clearDefaultArgs(): void
}

export class MountableArray extends Array<InternalCodeBlocksManager> {
    mount() {
        this.forEach((el) => el.instantiateVue())
    }

    async loadAndMount() {
        for (const cbm of this) {
            await cbm.resolveSrc()
        }
        this.mount()
    }
}

export const CodeBlocksManager = {
    async loadAndMountInElement(element: Document | HTMLElement): Promise<void> {
        return this.find(element).loadAndMount()
    },

    async loadAndMountInScope(scope: HTMLElement | Document | undefined): Promise<void> {
        return this.loadAndMountInElement(scope || document)
    },

    async loadAndMount(): Promise<void> {
        return this.loadAndMountInElement(document)
    },

    find(scope: HTMLElement | Document | undefined) {
        if (scope === undefined) {
            scope = document
        }
        const allCodeBlockParents = scope.querySelectorAll(
            'codeblocks, codeblockseditor, div[codeblocks], div[codeblockseditor]'
        )
        const result = new MountableArray()
        allCodeBlockParents.forEach((elIn) => {
            const el = elIn as HTMLElement
            const cbm = new InternalCodeBlocksManager(el)
            let scope = cbm.data.settings.scopeSelector
                ? document.querySelector(cbm.data.settings.scopeSelector)
                : undefined
            if (scope === undefined || scope === null) {
                scope = el
            }

            highlight.$vue.processElements(scope)
            if (cbm.data.settings.editMode) {
                tagger.processElements(scope as HTMLElement)
                cbm.data.settings.scopeSelector = `[uuid=${scope.getAttribute('uuid')}]`
                cbm.data.settings.scopeUUID = scope.getAttribute('uuid')
                    ? scope.getAttribute('uuid')!
                    : undefined
                cbm.data.blocks.forEach((b) => {
                    b.scopeUUID = cbm.data.settings.scopeUUID
                    b.scopeSelector = cbm.data.settings.scopeSelector
                        ? cbm.data.settings.scopeSelector
                        : `[uuid=${b.scopeUUID}]`
                })
            }

            result.push(cbm)
        })
        return result
    },
}
