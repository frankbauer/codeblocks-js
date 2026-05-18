import {
    CodeExpansionType,
    CodeOutputTypes,
    IRandomizerSettings,
    KnownBlockTypes,
} from '@/lib/ICodeBlocks'
import { uuid } from 'vue-uuid'
import { ICompilerID } from '@/lib/ICompilerRegistry'
import { BlockData, IMainBlock } from '@/lib/codeBlocksManager'
import { UITheme, UIThemeType } from '@/lib/uiTheme'
import { IRuntimeData, IRuntimeBlock, runtimeBlockSchema } from './importExportUtils'

export default class MainBlock implements IMainBlock {
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
    buildVersion: number = 0

    constructor(data: IRuntimeData) {
        const s = data.settings
        this.id = s.id
        this.uuid = s.uuid
        this.editMode = s.editMode
        this.readonly = s.readonly
        this.randomizer = s.randomizer ?? {
            active: false,
            previewIndex: 0,
            knownTags: [],
            sets: [],
        }
        this.compiler = s.compiler
        this.language = s.language
        this.runCode = s.runCode
        this.emitAST = s.emitAST
        this.domLibs = s.domLibs
        this.workerLibs = s.workerLibs
        this.outputParser = s.outputParser
        this.uiTheme = s.uiTheme
        this.executionTimeout = s.executionTimeout
        this.maxCharacters = s.maxCharacters
        this.scopeUUID = s.scopeUUID
        this.scopeSelector = s.scopeSelector
        this.continuousCompilation = s.continuousCompilation
        this.messagePassing = s.messagePassing
        this.keepAlive = s.keepAlive
        this.persistentArguments = s.persistentArguments
        this.shadowRoot = s.shadowRoot
        this.error = s.error

        this.blocks = data.blocks.map((b) => new BlockData(b, this))
        this.blocks.forEach((v, i) => {
            v.id = i
        })
    }

    applyRuntimeData(data: IRuntimeData, importSettings = true): void {
        if (importSettings) {
            const s = data.settings
            this.language = s.language
            this.compiler = s.compiler
            this.runCode = s.runCode
            this.emitAST = s.emitAST
            this.executionTimeout = s.executionTimeout
            this.maxCharacters = s.maxCharacters
            this.outputParser = s.outputParser
            this.uiTheme = s.uiTheme
            this.domLibs = s.domLibs
            this.workerLibs = s.workerLibs
            this.continuousCompilation = s.continuousCompilation
            this.messagePassing = s.messagePassing
            this.keepAlive = s.keepAlive
            this.persistentArguments = s.persistentArguments
            this.randomizer = s.randomizer ?? {
                active: false,
                previewIndex: 0,
                knownTags: [],
                sets: [],
            }
        }
        // Update blocks using the new BlockData constructor (Task 5)
        this.blocks = data.blocks.map((b) => new BlockData(b, this))
        this.blocks.forEach((b, i) => {
            b.id = i
        })
        this.buildVersion++
    }

    initArgsForLanguage() {
        console.d('Constructing args for', this.language, this.defaultArgs)

        if (this.defaultArgs === undefined) {
            if (this.language === 'java') {
                return []
            } else {
                return {}
            }
        } else {
            return this.defaultArgs
        }
    }

    defaultArgs!: object | string[] | undefined

    storeDefaultArgs(args: object | string[]) {
        this.defaultArgs = args
    }

    clearDefaultArgs() {
        this.defaultArgs = undefined
    }

    swap(id1: number, id2: number) {
        const a = this.blocks[id1]
        this.blocks[id1] = this.blocks[id2]
        this.blocks[id2] = a

        this.blocks[id1].id = id1
        this.blocks[id2].id = id2
        this.buildVersion++
    }

    moveUp(id: number) {
        if (id <= 0) {
            return
        }
        this.swap(id - 1, id)
    }

    moveDown(id: number) {
        if (id >= this.blocks.length - 1) {
            return
        }
        this.swap(id, id + 1)
    }

    changeOrder(id: number, newID: number): void {
        //this.swap(id, newID)
        const a = this.blocks[id]
        this.blocks.splice(id, 1)
        this.blocks.splice(newID, 0, a)

        this.blocks.forEach((v, i) => (v.id = i))
    }

    removeBlock(idx: number) {
        this.blocks.splice(idx, 1)
        for (let i = idx; i < this.blocks.length; i++) {
            this.blocks[i].id = i
        }
        this.buildVersion++
    }

    addNewBlock(type: KnownBlockTypes = KnownBlockTypes.BLOCK) {
        this.insertBlockAt(this.blocks.length, type)
    }

    insertBlockAt(position: number, type: KnownBlockTypes = KnownBlockTypes.BLOCK) {
        const resolvedType =
            type === KnownBlockTypes.BLOCKHIDDEN || type === KnownBlockTypes.BLOCKSTATIC
                ? KnownBlockTypes.BLOCK
                : type

        let name = ''
        let content = ''
        if (resolvedType === KnownBlockTypes.DATA || resolvedType === KnownBlockTypes.LIBRARY) {
            const prefix = resolvedType === KnownBlockTypes.DATA ? 'data' : 'lib'
            let counter = 1
            while (this.blocks.some((b) => b.name === `${prefix}${counter}`)) {
                counter++
            }
            name = `${prefix}${counter}`
        }

        const newBlockData = runtimeBlockSchema.parse({
            type: resolvedType,
            content: content,
            id: position,
            uuid: uuid.v4(),
            name: name,
            parentID: this.id,
            noContent: false,
            readyCount: 0,
            errors: [],
            scopeUUID: this.scopeUUID,
            scopeSelector: this.scopeSelector,
            lineCountHint: -1,
            hasAlternativeContent: false,
            alternativeContent: null,
            metadata: {
                expanded: true,
                codeExpanded: CodeExpansionType.AUTO,
                static: type === KnownBlockTypes.BLOCKSTATIC,
                hidden: type === KnownBlockTypes.BLOCKHIDDEN,
                version: '101',
                visibleLines: 10,
                embeddedLibrary: 'custom',
                shouldAutoreset: false,
                shouldReloadResources: false,
                generateTemplate: resolvedType === KnownBlockTypes.PLAYGROUND,
                width: '100%',
                height: '200px',
                align: 'center',
            },
        })
        this.blocks.splice(position, 0, new BlockData(newBlockData, this))
        this.blocks.forEach((v, i) => (v.id = i))
        this.buildVersion++
    }

    totalLines(): number {
        return this.blocks.reduce((acc, v) => acc + v.lineCount, 0)
    }
}
