import { ScriptBlock } from './scriptBlock'
import { IScriptOutputObject, IPlaygroundObject, ILegacyPlaygroundObject } from './IScriptBlock'
import i18n from '../plugins/i18n'
import 'reflect-metadata'
import { Vue, Component, Watch } from 'vue-property-decorator'

import App from '../App.vue'
import AppEditor from '../AppEditor.vue'
import { uuid } from 'vue-uuid'

import { compilerRegistry as CompilerRegistry } from './CompilerRegistry'
import { ICompilerErrorDescription, ICompilerID } from './ICompilerRegistry'
import { IRandomizerSettings, CodeOutputTypes, IBlockData, KnownBlockTypes, IRandomizerSet, IRandomizerSetTag } from './ICodeBlocks'
Vue.prototype.$compilerRegistry = CompilerRegistry

export interface IAppSettings {
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
}

interface IAppElementData {
    randomizerActive?: string
    randomizerPreviewIndex?: string
    randomizerKnownTags?: string
    randomizerSets?: string
    question?: string
    compiler?: string
    compilerVersion?: string
    domLibs?: string
    workerLibs?: string
    readonly?: string
    runCode?: string
    id?: string
    executionTimeout?: string
    maxCharacters?: string
    scopeUUID?: string
    scopeSelector?: string
}

interface IBlockElementData {
    readonly?: string
    static?: string
    hidden?: string
    visibleLines?: string
    shouldAutoreset?: string
    expanded?: string
    codeExpanded?: string
    noContent?: string
    alternativeContent?: string
    width?: string
    height?: string
    align?: string
    version?: string
    scopeUUID?: string
    scopeSelector?: string
}

@Component
export class BlockData extends Vue implements IBlockData {
    appSettings!: IAppSettings
    hasCode!: boolean
    type!: KnownBlockTypes
    content!: string
    alternativeContent!: string | null
    noContent!: boolean
    id!: number
    uuid!: string
    parentID!: number
    expanded!: boolean
    codeExpanded!: boolean
    obj!: ScriptBlock | null
    readonly!: boolean
    static!: boolean
    hidden!: boolean
    version!: string
    readyCount!: number
    errors!: ICompilerErrorDescription[]
    scopeUUID?: string
    scopeSelector!: string
    visibleLines!: number | 'auto'
    hasAlternativeContent!: boolean
    shouldAutoreset!: boolean
    width!: string
    height!: string
    align!: string
    toolbox!: string | null
    _oac?: () => string //used by Blockly to re-place the actuakContent-Method while keeping the old implementation around

    // constructor(appSettings: IAppSettings, data: IBlockData) {
    //     super()
    //     this.appSettings = appSettings
    //     this.hasCode = data.hasCode
    //     this.type = data.type
    //     this.content = data.content
    //     this.alternativeContent = data.alternativeContent
    //     this.noContent = data.noContent
    //     this.id = data.id
    //     this.uuid = data.uuid
    //     this.parentID = data.parentID
    //     this.expanded = data.expanded
    //     this.codeExpanded = data.codeExpanded
    //     this.obj = data.obj
    //     this.readonly = data.readonly
    //     this.static = data.static
    //     this.hidden = data.hidden
    //     this.version = data.version
    //     this.readyCount = data.readyCount
    //     this.errors = data.errors
    //     this.scopeUUID = data.scopeUUID
    //     this.scopeSelector = data.scopeSelector
    //     this.visibleLines = data.visibleLines
    //     this.hasAlternativeContent = data.hasAlternativeContent
    //     this.shouldAutoreset = data.shouldAutoreset
    //     this.width = data.width
    //     this.height = data.height
    //     this.align = data.align
    //     this.toolbox = data.toolbox
    // }

    actualContent() {
        if (this.appSettings.randomizer.active) {
            return Vue.$tagger.replaceRandomTagsInString(this.content, this.appSettings.randomizer.sets[this.appSettings.randomizer.previewIndex])
        }

        return this.content
    }
    recreateScriptObject() {
        console.log('[Debug] recreateScriptObject')
        if (this.type === KnownBlockTypes.PLAYGROUND) {
            const so = new ScriptBlock(this.actualContent(), this.version)
            this.obj = so
            console.log('Block Rebuild', this.obj, this.uuid)
        }
    }
    created() {
        this.recreateScriptObject()
    }

    get isLast(): boolean {
        return this.id == this.appSettings.blocks.length - 1
    }
    get firstLine(): number {
        if (this.id === 0) {
            return 1
        }
        return this.appSettings.blocks[this.id - 1].nextLine
    }
    get lineCount(): number {
        if (!this.hasCode) {
            return 0
        }
        return this.content.split('\n').length
    }
    get nextLine(): number {
        if (!this.hasCode) {
            return this.firstLine
        }
        return this.firstLine + this.lineCount
    }
    get domLibs(): string[] {
        return this.appSettings.domLibs
    }

    //is this right. Happend when converting from JS
    get scriptVersion(): string {
        return this.version
    }

    @Watch('type')
    onTypeChanged(newType: KnownBlockTypes, oldType: KnownBlockTypes) {
        if (newType != oldType) {
            this.recreateScriptObject()
        }
    }
}

export interface IMainBlock extends IAppSettings {
    swap(id1: number, id2: number): void
    moveUp(id: number): void
    moveDown(id: number): void
    removeBlock(idx: number): void
    addNewBlock(): void
}

//this will handle the vue mounting on the dom
class InternalCodeBlocksManager {
    constructBlock(data: IAppSettings, bl: IBlockData): BlockData {
        if (bl.type === KnownBlockTypes.PLAYGROUND) {
            if (bl.content == '' || bl.content === undefined || bl.content === null) {
                bl.content = '{}'
            }
        }

        return new BlockData({
            data: () => {
                return {
                    ...bl,
                    appSettings: data
                }
            }
        })
    }

    readonly element: HTMLElement
    readonly data: IAppSettings
    constructor(el: HTMLElement) {
        this.element = el
        const inData = el.dataset as IAppElementData
        let data: IAppSettings = {
            id: -1,
            editMode: el.tagName == 'CODEBLOCKSEDITOR' || el.hasAttribute('codeblockseditor'),
            runCode: false,
            language: 'javascript',
            compiler: {
                languageType: 'javascript',
                version: '101'
            },
            randomizer: {
                active: false,
                previewIndex: 0,
                knownTags: [],
                sets: []
            },
            domLibs: [],
            workerLibs: [],
            blocks: [],
            outputParser: CodeOutputTypes.AUTO,
            readonly: false,
            solutionTheme: 'solarized light',
            codeTheme: 'xq-light',
            uuid: 'is-set-below',
            executionTimeout: 5000,
            maxCharacters: 1000
        }

        if (inData.randomizerActive !== undefined) {
            data.randomizer.active = inData.randomizerActive == 'true' || inData.randomizerActive == '1'
        }
        if (inData.randomizerPreviewIndex !== undefined) {
            data.randomizer.previewIndex = Number(inData.randomizerPreviewIndex)
        }
        if (inData.randomizerKnownTags !== undefined) {
            data.randomizer.knownTags = JSON.parse(inData.randomizerKnownTags)
        }
        if (inData.randomizerSets !== undefined) {
            data.randomizer.sets = JSON.parse(inData.randomizerSets).map((o: object, i: number) => {
                const ret: IRandomizerSet = {
                    uuid: uuid.v4(),
                    values: []
                }
                Object.keys(o).forEach(tag => {
                    const item: IRandomizerSetTag = {
                        tag: tag,
                        value: o[tag]
                    }
                    ret.values.push(item)
                })

                return ret
            })
        }

        if (inData.question !== undefined) {
            data.id = Number(inData.question)
        }

        if (inData.compiler !== undefined) {
            const cInfo: ICompilerID = {
                languageType: inData.compiler,
                version: inData.compilerVersion!
            }
            data.compiler = cInfo

            const c = CompilerRegistry.getCompiler(data.compiler)
            if (c === undefined) {
                data.runCode = false
                data.language = data.compiler.languageType
            } else {
                data.runCode = inData.runCode == 'true' || inData.runCode == '1'
                data.language = c.language
                data.compiler.version = c.version
            }
        }

        if (inData.domLibs !== undefined) {
            data.domLibs = JSON.parse(inData.domLibs)
        }

        if (inData.readonly !== undefined) {
            if (data.editMode) {
                data.readonly = false
            } else {
                data.readonly = inData.readonly == 'true' || inData.readonly == '1' || inData.readonly == ''
            }
        }

        if (inData.workerLibs !== undefined) {
            data.workerLibs = JSON.parse(inData.workerLibs)
        }

        if (el.hasAttribute('uuid')) {
            data.uuid = el.getAttribute('uuid')!
        } else {
            data.uuid = uuid.v4()
            el.setAttribute('uuid', data.uuid)
        }

        //data.id = Number(data.id)

        if (inData.executionTimeout !== undefined) {
            data.executionTimeout = Number(inData.executionTimeout)
        }

        if (inData.maxCharacters === undefined) {
            data.maxCharacters = Number(inData.maxCharacters)
        }

        if (inData.scopeUUID !== undefined) {
            data.scopeUUID = inData.scopeUUID
        }
        if (inData.scopeSelector !== undefined) {
            data.scopeSelector = inData.scopeSelector
        }

        el.querySelectorAll('*').forEach(blIn => {
            const bl = blIn as HTMLElement
            //only first level children
            if (bl.parentElement != el) {
                return
            }
            let inBlock = bl.dataset as IBlockElementData
            let block: IBlockData = {
                hasCode: false,
                version: '101',
                type: bl.tagName as KnownBlockTypes,
                content: bl.textContent ? bl.textContent : '',
                alternativeContent: null,
                hasAlternativeContent: false,
                id: data.blocks.length,
                uuid: uuid.v4(),
                parentID: data.id,
                width: '100%',
                height: '200px',
                align: 'center',
                readyCount: 0,
                obj: null,
                toolbox: null,
                errors: [],
                readonly: inBlock.readonly !== undefined && inBlock.readonly != 'false' && inBlock.readonly != '0',
                static: inBlock.static !== undefined && inBlock.static != 'false' && inBlock.static != '0',
                hidden: inBlock.hidden !== undefined && inBlock.hidden != 'false' && inBlock.hidden != '0',
                visibleLines: inBlock.visibleLines === undefined ? 'auto' : Number(inBlock.visibleLines),
                shouldAutoreset: inBlock.shouldAutoreset !== undefined && inBlock.shouldAutoreset != 'false' && inBlock.shouldAutoreset != '0',
                expanded: inBlock.expanded === undefined || (inBlock.expanded != 'false' && inBlock.expanded != '0'),
                codeExpanded: inBlock.codeExpanded === undefined || (inBlock.codeExpanded != 'false' && inBlock.codeExpanded != '0'),
                noContent: inBlock.noContent !== undefined && inBlock.noContent != 'false' && inBlock.noContent != '0',
                scopeUUID: inBlock.scopeUUID,
                scopeSelector: inBlock.scopeSelector
            }

            if (!data.editMode && block.noContent) {
                block.content = ''
            }
            if (inBlock.alternativeContent !== undefined && !block.static && !block.hidden) {
                block.alternativeContent = inBlock.alternativeContent
                block.hasAlternativeContent = true
                if (!data.editMode && block.noContent) {
                    block.content = block.alternativeContent
                }
            } else {
                block.hasAlternativeContent = false
            }

            if (block.type === KnownBlockTypes.PLAYGROUND) {
                block.obj = null

                block.width = bl.getAttribute('width') ? bl.getAttribute('width')! : inBlock.width ? inBlock.width : '100%'
                block.height = bl.getAttribute('height') ? bl.getAttribute('height')! : inBlock.height ? inBlock.height : '200px'
                block.align = bl.getAttribute('align') ? bl.getAttribute('align')! : inBlock.align ? inBlock.align : 'center'
                block.version = bl.getAttribute('data-version') ? bl.getAttribute('data-version')! : block.version
            } else if (block.type == 'BLOCK') {
                const alts = bl.getElementsByTagName('ALTERNATIVE')
                const codes = bl.getElementsByTagName('CODE')
                if (codes.length > 0) {
                    block.content = codes[0].textContent ? codes[0].textContent : ''
                }

                if (alts.length > 0) {
                    block.hasAlternativeContent = true
                    block.alternativeContent = alts[0].textContent
                    if (!data.editMode && block.noContent) {
                        block.content = block.alternativeContent ? block.alternativeContent : ''
                    }
                }

                block.hasCode = true
            } else if (block.type == KnownBlockTypes.BLOCKLY) {
                const toolboxes = bl.getElementsByTagName('TOOLBOX')
                let toolbox: string = ''
                if (toolboxes.length > 0) {
                    toolbox = toolboxes[0].innerHTML ? toolboxes[0].innerHTML : ''
                }
                block.toolbox = toolbox

                const codes = bl.getElementsByTagName('CODE')
                if (codes.length > 0) {
                    block.content = codes[0].innerHTML ? codes[0].innerHTML : ''
                } else {
                    block.content = '<xml xmlns="https://developers.google.com/blockly/xml"></xml>'
                }
                block.hasCode = true
            } else if (block.type != 'TEXT') {
                console.log('Skipping', block.type)
                return
            }

            data.blocks.push(this.constructBlock(data, block))
        })
        this.data = data

        console.log('DATA', data)
    }

    instantiateVue() {
        const data = this.data
        const self = this
        new Vue({
            i18n,
            render: function(h) {
                @Component({
                    data: function() {
                        return data
                    }
                })
                class MainBlock extends Vue implements IMainBlock {
                    id!: number
                    uuid!: string
                    editMode!: boolean
                    readonly!: boolean
                    randomizer!: IRandomizerSettings
                    blocks!: BlockData[]
                    compiler!: ICompilerID
                    language!: string
                    runCode!: boolean
                    domLibs!: string[]
                    workerLibs!: string[]
                    outputParser!: CodeOutputTypes
                    solutionTheme!: string
                    codeTheme!: string
                    executionTimeout!: number
                    maxCharacters!: number
                    scopeUUID?: string
                    scopeSelector?: string
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
                    removeBlock(idx: number) {
                        data.blocks.splice(idx, 1)
                        for (let i = idx; i < data.blocks.length; i++) {
                            data.blocks[i].id = i
                        }
                    }
                    addNewBlock() {
                        let block: IBlockData = {
                            noContent: false,
                            alternativeContent: null,
                            hasCode: true,
                            type: KnownBlockTypes.BLOCK,
                            content: '',
                            id: data.blocks.length,
                            uuid: uuid.v4(),
                            parentID: data.id,
                            expanded: true,
                            codeExpanded: true,
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
                            scopeUUID: data.scopeUUID,
                            scopeSelector: data.scopeSelector,
                            visibleLines: 10,
                            hasAlternativeContent: false,
                            shouldAutoreset: false,
                            toolbox: null
                        }
                        data.blocks.push(self.constructBlock(data, block))
                    }
                }
                const context = {
                    props: {
                        language: data.language,
                        id: data.id,
                        blocks: new MainBlock()
                    }
                }
                return h(data.editMode ? AppEditor : App, context)
            }
        }).$mount(this.element)
    }
}

export class MountableArray extends Array<InternalCodeBlocksManager> {
    mount() {
        this.forEach(el => el.instantiateVue())
    }
}

export const CodeBlocksManager = {
    find(scope: HTMLElement | Document | undefined) {
        if (scope === undefined) {
            scope = document
        }
        const allCodeBlockParents = scope.querySelectorAll('codeblocks, codeblockseditor, div[codeblocks], div[codeblockseditor]')
        let result = new MountableArray()
        allCodeBlockParents.forEach(el => {
            const cbm = new InternalCodeBlocksManager(el as HTMLElement)
            let scope = cbm.data.scopeSelector ? document.querySelector(cbm.data.scopeSelector) : undefined
            if (scope === undefined || scope === null) {
                scope = el
            }

            Vue.$hljs.$vue.processElements(scope)
            if (cbm.data.editMode) {
                Vue.$tagger.processElements(scope)
                cbm.data.scopeSelector = `[uuid=${scope.getAttribute('uuid')}]`
                cbm.data.scopeUUID = scope.getAttribute('uuid') ? scope.getAttribute('uuid')! : undefined
                cbm.data.blocks.forEach(b => {
                    b.scopeUUID = cbm.data.scopeUUID
                    b.scopeSelector = cbm.data.scopeSelector ? cbm.data.scopeSelector : `[uuid=${b.scopeUUID}]`
                })
            }

            result.push(cbm)
        })
        return result
    }
}
