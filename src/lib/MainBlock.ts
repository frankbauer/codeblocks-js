import {
    CodeExpansionType,
    CodeOutputTypes,
    IBlockDataBase,
    IRandomizerSettings,
    KnownBlockTypes,
} from '@/lib/ICodeBlocks'
import { uuid } from 'vue-uuid'
import { ICompilerID } from '@/lib/ICompilerRegistry'
import { BlockData, constructBlock, IAppSettings, IMainBlock } from '@/lib/codeBlocksManager'

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
    domLibs: string[]
    workerLibs: string[]
    outputParser: CodeOutputTypes
    solutionTheme: string
    codeTheme: string
    executionTimeout: number
    maxCharacters: number
    scopeUUID?: string
    scopeSelector?: string
    continuousCompilation: boolean
    messagePassing: boolean
    keepAlive: boolean
    persistentArguments: boolean

    constructor(data: IAppSettings) {
        this.id = data.id
        this.uuid = data.uuid
        this.editMode = data.editMode
        this.readonly = data.readonly
        this.randomizer = data.randomizer
        this.blocks = data.blocks
        this.compiler = data.compiler
        this.language = data.language
        this.runCode = data.runCode
        this.domLibs = data.domLibs
        this.workerLibs = data.workerLibs
        this.outputParser = data.outputParser
        this.solutionTheme = data.solutionTheme
        this.codeTheme = data.codeTheme
        this.executionTimeout = data.executionTimeout
        this.maxCharacters = data.maxCharacters
        this.scopeUUID = data.scopeUUID
        this.scopeSelector = data.scopeSelector
        this.continuousCompilation = data.continuousCompilation
        this.messagePassing = data.messagePassing
        this.keepAlive = data.keepAlive
        this.persistentArguments = data.persistentArguments

        this.blocks.forEach((v, i) => {
            this.blocks[i].appSettings = this
        })
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
    }

    addNewBlock() {
        const newBlockData: IBlockDataBase = {
            noContent: false,
            alternativeContent: null,
            hasCode: true,
            type: KnownBlockTypes.BLOCK,
            content: '',
            id: this.blocks.length,
            uuid: uuid.v4(),
            name: `v${this.blocks.length}`,
            parentID: this.id,
            expanded: true,
            codeExpanded: CodeExpansionType.AUTO,
            width: '100%',
            height: '200px',
            align: 'center',
            obj: null,
            readonly: false,
            static: true,
            hidden: false,
            version: '101',
            readyCount: 0,
            errors: [],
            scopeUUID: this.scopeUUID,
            scopeSelector: this.scopeSelector,
            visibleLines: 10,
            hasAlternativeContent: false,
            shouldAutoreset: false,
            shouldReloadResources: false,
            generateTemplate: true,
            lineCountHint: -1,
        }
        this.blocks.push(constructBlock(this, newBlockData))
    }
}
