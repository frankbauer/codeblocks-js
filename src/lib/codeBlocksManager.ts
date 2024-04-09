import { reactive, ref, UnwrapRef, createApp, h, type Ref } from 'vue'
import { ScriptBlock } from './scriptBlock'
import i18n from '../plugins/i18n'

import App from '../App.vue'
import AppEditor from '../AppEditor.vue'
import CodeBlock from '../components/CodeBlock.vue'
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
    IBlockloadManager,
    IBlockElementData,
    CodeExpansionType,
    IBlockDataWithSettings,
} from './ICodeBlocks'

//get loaders
import blockInstaller from '@/lib/BlockloadManagers/BlockManager'
import playgroundInstaller from '@/lib/BlockloadManagers/PlaygroundManager'
import dataInstaller from '@/lib/BlockloadManagers/DataManager'
import REPLInstaller from '@/lib/BlockloadManagers/REPLManager'

import { taggedDirective, tagger } from '@/plugins/tagger'
import { highlight, highlightDirective } from '@/plugins/highlight'
import { appUseQuasar } from '@/plugins/quasar'
import { appUseCodeMirror } from '@/plugins/codemirror'
import MainBlock from '@/lib/MainBlock'

const loaders: { [index: string]: IBlockloadManager } = {}
blockInstaller(loaders)
playgroundInstaller(loaders)
REPLInstaller(loaders)
dataInstaller(loaders)

export interface AppContext {
    blocks: IMainBlock
}

export type AppContextRef = {
    [P in keyof AppContext]: Ref<UnwrapRef<AppContext[P]>>
}

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

interface IInputElementData {
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

export class BlockData implements IBlockData {
    appSettings: IAppSettings
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
    _oac?: () => string //used by Blockly to re-place the actualContent-Method while keeping the old implementation around

    obj: ScriptBlock | null
    dataObj: any | null

    constructor(d: IBlockDataWithSettings) {
        this.obj = null
        this.dataObj = null

        this.appSettings = d.appSettings
        this.hasCode = d.hasCode
        this._type = d.type
        this.content = d.content
        this.alternativeContent = d.alternativeContent
        this.noContent = d.noContent
        this.id = d.id
        this.uuid = d.uuid
        this.parentID = d.parentID
        this.expanded = d.expanded
        this.codeExpanded = d.codeExpanded
        this.readonly = d.readonly
        this.static = d.static
        this.hidden = d.hidden
        this.version = d.version
        this.readyCount = d.readyCount
        this.errors = d.errors
        this.scopeUUID = d.scopeUUID
        this.visibleLines = d.visibleLines
        this.hasAlternativeContent = d.hasAlternativeContent
        this.shouldAutoreset = d.shouldAutoreset
        this.shouldReloadResources = d.shouldReloadResources
        this.generateTemplate = d.generateTemplate
        this.width = d.width
        this.height = d.height
        this.align = d.align
        this.lineCountHint = d.lineCountHint
        this.name = d.name

        this.created()
    }

    actualContent() {
        if (this.appSettings.randomizer.active) {
            return tagger.replaceRandomTagsInString(
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
        } else {
            console.i('recreateScriptObject - UNKNOWN')
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

    get isSourceCode(): boolean {
        return (
            this.type === KnownBlockTypes.BLOCK ||
            this.type === KnownBlockTypes.BLOCKSTATIC ||
            this.type === KnownBlockTypes.BLOCKHIDDEN
        )
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

    get type(): KnownBlockTypes {
        return this._type
    }

    set type(newType: KnownBlockTypes) {
        const oldType = this._type
        this._type = newType
        this.onTypeChanged(newType, oldType)
    }

    //@Watch('type')
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

function parseInputElement(el: HTMLElement, shadowRoot: ShadowRoot | undefined): IAppSettings {
    const inData = el.dataset as IInputElementData
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
        shadowRoot: shadowRoot,
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
        data.domLibs = JSON.parse(inData.domLibs).map((l: string) => compilerRegistry.mapLibrary(l))
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

    return data
}

function constructBlock(data: IAppSettings, bl: IBlockDataBase): BlockData {
    if (bl.type === KnownBlockTypes.PLAYGROUND || bl.type === KnownBlockTypes.DATA) {
        if (bl.content == '' || bl.content === undefined || bl.content === null) {
            bl.content = '{}'
        }
    }

    return new BlockData({
        ...bl,
        appSettings: data,
    })
}

function parseInputBlockElement(bl: HTMLElement, data: IAppSettings): IBlockDataBase | undefined {
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
            undefined || (inBlock.generateTemplate != 'false' && inBlock.generateTemplate != '0'),

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
        } else if (inBlock.codeExpanded.toUpperCase() == 'LARGE' || inBlock.codeExpanded == '2') {
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
            return undefined
        } else {
            loader.loadFromDatablock(bl, inBlock, block, data.editMode)
        }
    }
    return block
}

//this will handle the vue mounting on the dom
class InternalCodeBlocksManager {
    readonly element: HTMLElement
    private _data: IAppSettings | undefined
    readonly shadowRoot: ShadowRoot | undefined = undefined

    get data() {
        if (this._data === undefined) {
            throw new Error('Data was already consumed!')
        }
        return this._data
    }

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
        const data = parseInputElement(el, this.shadowRoot)
        //el.querySelectorAll('*').forEach((blIn) => {
        for (const blIn of el.children) {
            const bl = blIn as HTMLElement
            //only first level children
            if (bl.parentElement != el) {
                continue
            }

            const block = parseInputBlockElement(bl, data)
            if (block === undefined) {
                continue
            }

            data.blocks.push(constructBlock(data, block))
        }

        this._data = data

        console.d('INPUT DATA', data)
    }

    instantiateVue() {
        const data = this.data
        this._data = undefined
        const context: AppContextRef = {
            blocks: ref<UnwrapRef<IMainBlock>>(new MainBlock(data)),
        }
        const component = data.editMode ? AppEditor : App
        const app = createApp(component as any, context)
        app.use(i18n)
        app.directive('tagged', taggedDirective)
        app.directive('highlight', highlightDirective)
        appUseQuasar(app)
        appUseCodeMirror(app)
        app.mount(this.element)
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

            highlight.$vue.processElements(scope)
            if (cbm.data.editMode) {
                tagger.processElements(scope as HTMLElement)
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
