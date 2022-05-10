import { ScriptBlock } from './scriptBlock'
import { IScriptOutputObject, IPlaygroundObject, ILegacyPlaygroundObject } from './IScriptBlock'
import i18n from '../plugins/i18n'
import 'reflect-metadata'
import { Vue, Component, Watch } from 'vue-property-decorator'

import App from '../App.vue'
import AppEditor from '../AppEditor.vue'
import { uuid } from 'vue-uuid'

import compilerRegistry, { compilerRegistry as CompilerRegistry } from './CompilerRegistry'
import { ICompilerErrorDescription, ICompilerID } from './ICompilerRegistry'
import {
    IRandomizerSettings,
    CodeOutputTypes,
    IBlockData,
    KnownBlockTypes,
    IRandomizerSet,
    IRandomizerSetTag,
    ICodeBlockDataState,
    IBlockDataBase,
    IBlockDataBlockly,
    IBlockloadManager,
    IBlockElementData,
    CodeExpansionType,
} from './ICodeBlocks'

//get loaders
import blockInstaller from '@/lib/BlockloadManagers/BlockManager'
import blocklyInstaller from '@/lib/BlockloadManagers/BlocklyManager'
import playgroundInstaller from '@/lib/BlockloadManagers/PlaygroundManager'
import dataInstaller from '@/lib/BlockloadManagers/DataManager'
import REPLInstaller from '@/lib/BlockloadManagers/REPLManager'
import { trim } from 'jquery'

const loaders: { [index: string]: IBlockloadManager } = {}
blockInstaller(loaders)
blocklyInstaller(loaders)
playgroundInstaller(loaders)
REPLInstaller(loaders)
dataInstaller(loaders)

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
    continuousCompilation: boolean
    messagePassing: boolean
    keepAlive: boolean
    persistentArguments: boolean
    shadowRoot?: ShadowRoot
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
    continuousCompilation?: string
    messagePassing?: string
    keepAlive?: string
    persistentArguments?: string
    outputParser?: CodeOutputTypes
    solutionTheme?: string
    codeTheme?: string
}

export interface IBlockBookmarkPayload {
    uuid: string
    block: BlockData | null
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
    codeExpanded!: CodeExpansionType
    obj!: ScriptBlock | null
    dataObj!: any | null
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
    shouldReloadResources!: boolean
    generateTemplate!: boolean
    width!: string
    height!: string
    align!: string
    blockly!: IBlockDataBlockly
    lineCountHint!: number
    name!: string
    _oac?: () => string //used by Blockly to re-place the actualContent-Method while keeping the old implementation around

    actualContent() {
        if (this.appSettings.randomizer.active) {
            return Vue.$tagger.replaceRandomTagsInString(
                this.content,
                this.appSettings.randomizer.sets[this.appSettings.randomizer.previewIndex]
            )
        }

        return this.content
    }
    recreateScriptObject() {
        if (this.type === KnownBlockTypes.PLAYGROUND) {
            console.i('recreateScriptObject - Playground')

            const so = new ScriptBlock(this.actualContent(), this.version)
            this.obj = so
            console.i('Block Rebuild', this.obj, this.uuid)
        } else if (this.type === KnownBlockTypes.DATA) {
            console.i('recreateScriptObject - Data')

            this.dataObj = {
                name: '',
                content: '',
            }
            console.i('Block Rebuild', this.obj, this.uuid)
        }
    }
    created() {
        this.recreateScriptObject()
    }

    getThemeForBlock(bl: ICodeBlockDataState): string {
        if (bl.static || bl.readonly || bl.hidden || this.type === KnownBlockTypes.DATA) {
            return this.appSettings.codeTheme
        }

        return this.appSettings.solutionTheme
    }

    get themeForCodeBlock(): string {
        if (this.static || this.readonly || this.hidden || this.type === KnownBlockTypes.DATA) {
            return this.appSettings.codeTheme
        }

        return this.appSettings.solutionTheme
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

    get scope(): JQuery<HTMLElement> {
        return this.scopeSelector
            ? $(this.scopeSelector)
            : $(`.codeblocks[uuid="${this.appSettings.uuid}"]`)
    }
}

export interface IMainBlock extends IAppSettings {
    swap(id1: number, id2: number): void
    moveUp(id: number): void
    moveDown(id: number): void
    changeOrder(id: number, newID: number): void
    removeBlock(idx: number): void
    addNewBlock(): void

    initArgsForLanguage(): object | string[]
    storeDefaultArgs(args: object | string[]): void
    clearDefaultArgs(): void
}

function isTrue(val: any): boolean {
    //return val !== undefined || val == 'true' || val == '1'
    return val !== undefined && val != 'false' && val != '0'
}

const useShadowDOM = false

//this will handle the vue mounting on the dom
class InternalCodeBlocksManager {
    constructBlock(data: IAppSettings, bl: IBlockDataBase): BlockData {
        if (bl.type === KnownBlockTypes.PLAYGROUND || bl.type === KnownBlockTypes.DATA) {
            if (bl.content == '' || bl.content === undefined || bl.content === null) {
                bl.content = '{}'
            }
        }

        return new BlockData({
            data: () => {
                return {
                    ...bl,
                    appSettings: data,
                }
            },
        })
    }

    readonly element: HTMLElement
    readonly data: IAppSettings
    readonly shadowRoot: ShadowRoot | undefined = undefined
    constructor(el: HTMLElement) {
        if (useShadowDOM) {
            const content = el.outerHTML

            //replace original element with empty div that will store the shadowDOM
            const parent = el.parentElement!
            const rewrap = document.createElement('DIV')
            parent.replaceChild(rewrap, el)

            //add shadowDOM and clear content
            const shadow = rewrap.attachShadow({ mode: 'open' })
            this.shadowRoot = shadow
            shadow.innerHTML = ''

            //copy root-level styles into the shadowDOM
            $('style').each((idx, style) => {
                const st = document.createElement('STYLE')
                st.innerHTML = style.innerHTML
                shadow.appendChild(st)
            })

            $('link[shadow]').each((idx, link) => {
                shadow.appendChild(link.cloneNode())
            })

            // //add new root and append original Element
            // const root = document.createElement('DIV')
            // root.id = 'root'
            // //root.innerHTML = noContent
            // root.appendChild(el)
            // shadow.appendChild(root)
            // console.log($('style').length)
            // this.element = root

            //append original element to shadowDOM
            shadow.appendChild(el)
            this.element = el
        } else {
            this.shadowRoot = undefined
            this.element = el
        }
        //console.log(this.element)
        const inData = el.dataset as IAppElementData
        const data: IAppSettings = {
            id: -1,
            editMode: el.tagName == 'CODEBLOCKSEDITOR' || el.hasAttribute('codeblockseditor'),
            runCode: false,
            language: 'javascript',
            compiler: {
                languageType: 'javascript',
                version: '101',
            },
            randomizer: {
                active: false,
                previewIndex: 0,
                knownTags: [],
                sets: [],
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
            maxCharacters: 1000,
            continuousCompilation: isTrue(inData.continuousCompilation),
            messagePassing: isTrue(inData.messagePassing),
            keepAlive: isTrue(inData.keepAlive),
            persistentArguments: isTrue(inData.persistentArguments),
            shadowRoot: this.shadowRoot,
        }

        if (inData.randomizerActive !== undefined) {
            data.randomizer.active = isTrue(inData.randomizerActive)
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
                    values: [],
                }
                Object.keys(o).forEach((tag) => {
                    const item: IRandomizerSetTag = {
                        tag: tag,
                        value: o[tag],
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
                version: inData.compilerVersion!,
            }
            data.compiler = cInfo

            const c = CompilerRegistry.getCompiler(data.compiler)
            if (c === undefined) {
                data.runCode = false
                data.language = data.compiler.languageType
            } else {
                data.runCode = isTrue(inData.runCode)
                data.language = c.language
                data.compiler.version = c.version
            }
        }

        if (inData.domLibs !== undefined) {
            data.domLibs = JSON.parse(inData.domLibs).map((l: string) =>
                compilerRegistry.mapLibrary(l)
            )
        }

        if (inData.readonly !== undefined) {
            if (data.editMode) {
                data.readonly = false
            } else {
                data.readonly = isTrue(inData.readonly)
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

        if (inData.maxCharacters !== undefined) {
            data.maxCharacters = Number(inData.maxCharacters)
        }

        if (inData.scopeUUID !== undefined) {
            data.scopeUUID = inData.scopeUUID
        }
        if (inData.scopeSelector !== undefined) {
            data.scopeSelector = inData.scopeSelector
        }

        if (inData.outputParser !== undefined) {
            data.outputParser = inData.outputParser
        }

        if (inData.solutionTheme !== undefined) {
            data.solutionTheme = inData.solutionTheme
        }

        if (inData.codeTheme !== undefined) {
            data.codeTheme = inData.codeTheme
        }

        el.querySelectorAll('*').forEach((blIn) => {
            const bl = blIn as HTMLElement
            //only first level children
            if (bl.parentElement != el) {
                return
            }
            const inBlock = bl.dataset as IBlockElementData
            const as = bl.getAttribute('as')
            if (as !== null) {
                inBlock.as = as.trim().toUpperCase()
            }

            const block: IBlockDataBase = {
                as: inBlock.as ? KnownBlockTypes[inBlock.as] : undefined,
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
                name: `v${data.blocks.length}`,
                lineCountHint: -1,
                blockly: {
                    showControls: false,
                    useOverride: false,
                    toolbox: {
                        categories: [],
                    },
                    toolboxOverride: '',
                    blocks: [],
                    _blockErrors: [],
                },
                errors: [],
                readonly: isTrue(inBlock.readonly),
                static: isTrue(inBlock.static),
                hidden: isTrue(inBlock.hidden),
                visibleLines:
                    inBlock.visibleLines === undefined ||
                    inBlock.visibleLines?.trim().toLowerCase() == 'auto'
                        ? 'auto'
                        : Number(inBlock.visibleLines),
                shouldAutoreset: isTrue(inBlock.shouldAutoreset),
                shouldReloadResources: isTrue(inBlock.shouldReloadResources),
                generateTemplate:
                    undefined ||
                    (inBlock.generateTemplate != 'false' && inBlock.generateTemplate != '0'),

                expanded:
                    inBlock.expanded === undefined ||
                    (inBlock.expanded != 'false' && inBlock.expanded != '0'),
                codeExpanded: CodeExpansionType.AUTO,
                noContent: isTrue(inBlock.noContent),
                scopeUUID: inBlock.scopeUUID,
                scopeSelector: inBlock.scopeSelector,
            }

            if (inBlock.codeExpanded !== undefined) {
                if (
                    inBlock.codeExpanded.toUpperCase() == 'TINY' ||
                    inBlock.codeExpanded == 'false' ||
                    inBlock.codeExpanded == '0'
                ) {
                    block.codeExpanded = CodeExpansionType.TINY
                } else if (
                    inBlock.codeExpanded.toUpperCase() == 'LARGE' ||
                    inBlock.codeExpanded == '2'
                ) {
                    block.codeExpanded = CodeExpansionType.LARGE
                }
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

            if (block.type != 'TEXT') {
                console.log('BL', block.type, block.as)
                if (block.as) {
                    block.type = block.as
                }
                const loader = loaders[block.type]
                console.d('LOADER', loader, loaders, block.type, block.as)
                if (loader === undefined) {
                    console.i('Skipping', block.type, block.as)
                    return
                } else {
                    loader.loadFromDatablock(bl, inBlock, block, data.editMode)
                }
            }

            data.blocks.push(this.constructBlock(data, block))
        })
        this.data = data

        console.d('DATA', data)
    }

    instantiateVue() {
        const data = this.data
        const self = this
        new Vue({
            i18n,
            render: function (h) {
                @Component({
                    data: function () {
                        return data
                    },
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
                    continuousCompilation!: boolean
                    messagePassing!: boolean
                    keepAlive!: boolean
                    persistentArguments!: boolean

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
                        data.blocks.splice(idx, 1)
                        for (let i = idx; i < data.blocks.length; i++) {
                            data.blocks[i].id = i
                        }
                    }
                    addNewBlock() {
                        const block: IBlockDataBase = {
                            noContent: false,
                            alternativeContent: null,
                            hasCode: true,
                            type: KnownBlockTypes.BLOCK,
                            content: '',
                            id: data.blocks.length,
                            uuid: uuid.v4(),
                            name: `v${data.blocks.length}`,
                            parentID: data.id,
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
                            scopeUUID: data.scopeUUID,
                            scopeSelector: data.scopeSelector,
                            visibleLines: 10,
                            hasAlternativeContent: false,
                            shouldAutoreset: false,
                            shouldReloadResources: false,
                            generateTemplate: true,
                            blockly: {
                                showControls: false,
                                useOverride: false,
                                toolboxOverride: '',
                                toolbox: {
                                    categories: [],
                                },
                                blocks: [],
                                _blockErrors: [],
                            },
                            lineCountHint: -1,
                        }
                        data.blocks.push(self.constructBlock(data, block))
                    }
                }
                const context = {
                    props: {
                        language: data.language,
                        id: data.id,
                        blocks: new MainBlock(),
                    },
                }
                return h(data.editMode ? AppEditor : App, context)
            },
        }).$mount(this.element)
    }
}

export class MountableArray extends Array<InternalCodeBlocksManager> {
    mount() {
        this.forEach((el) => el.instantiateVue())
    }
}

export const CodeBlocksManager = {
    find(scope: HTMLElement | Document | undefined) {
        if (scope === undefined) {
            scope = document
        }
        const allCodeBlockParents = scope.querySelectorAll(
            'codeblocks, codeblockseditor, div[codeblocks], div[codeblockseditor]'
        )
        const result = new MountableArray()
        allCodeBlockParents.forEach((el) => {
            const cbm = new InternalCodeBlocksManager(el as HTMLElement)
            let scope = cbm.data.scopeSelector
                ? document.querySelector(cbm.data.scopeSelector)
                : undefined
            if (scope === undefined || scope === null) {
                scope = el
            }

            Vue.$hljs.$vue.processElements(scope)
            if (cbm.data.editMode) {
                Vue.$tagger.processElements(scope)
                cbm.data.scopeSelector = `[uuid=${scope.getAttribute('uuid')}]`
                cbm.data.scopeUUID = scope.getAttribute('uuid')
                    ? scope.getAttribute('uuid')!
                    : undefined
                cbm.data.blocks.forEach((b) => {
                    b.scopeUUID = cbm.data.scopeUUID
                    b.scopeSelector = cbm.data.scopeSelector
                        ? cbm.data.scopeSelector
                        : `[uuid=${b.scopeUUID}]`
                })
            }

            result.push(cbm)
        })
        return result
    },
}
