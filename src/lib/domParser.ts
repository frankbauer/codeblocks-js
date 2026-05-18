import { z } from 'zod'
import { uuid } from 'vue-uuid'
import { createApp, type Ref, UnwrapRef } from 'vue'
import App from '../App.vue'
import i18n from '../plugins/i18n'
import { taggedDirective, tagger } from '@/plugins/tagger'
import { highlight, highlightDirective } from '@/plugins/highlight'
import { appUseCodeMirror } from '@/plugins/codemirror'
import { storeBlock } from '@/storage/blockStorage'
import {
    IRuntimeData,
    runtimeSettingsSchema,
    runtimeBlockSchema,
    IRuntimeSettings,
    IRuntimeBlock,
    importDataToRuntimeData,
    getImportData,
    validateImportData,
    processImportData,
    IJsonExport,
} from './importExportUtils'
import { KnownBlockTypes, IRandomizerSet } from './ICodeBlocks'
import compilerRegistry from './CompilerRegistry'

let runningAppNumber = 10000

export function domToRuntimeData(el: HTMLElement, shadowRoot?: ShadowRoot): IRuntimeData {
    const dataset = el.dataset
    const isCodeBlocksEditor =
        el.tagName === 'CODEBLOCKSEDITOR' || el.hasAttribute('codeblockseditor')

    const disableCompletionInViewModeAttr =
        dataset.disableCompletionInViewMode ??
        el.getAttribute('disable-completion-in-view-mode') ??
        el.getAttribute('disableCompletionInViewMode')

    const enableCompletionInViewModeSetting =
        disableCompletionInViewModeAttr !== null && disableCompletionInViewModeAttr !== undefined
            ? disableCompletionInViewModeAttr === 'false' || disableCompletionInViewModeAttr === '0'
                ? 'true'
                : 'false'
            : dataset.enableCompletionInViewMode

    // 1. Parse compiler info (legacy attributes merge)
    const compiler = {
        languageType: dataset.compiler || 'javascript',
        version: dataset.compilerVersion || '101',
    }

    // Auto-upgrade deprecated compilers
    const c = compilerRegistry.getCompiler(compiler)
    if (c) {
        if (c.deprecated) {
            const upgraded = compilerRegistry.getCompiler({ languageType: compiler.languageType })
            if (upgraded && !upgraded.deprecated) {
                compiler.version = upgraded.version
            }
        } else {
            compiler.version = c.version
        }
    }

    // 2. Parse randomizer (legacy attributes merge)
    let randomizer: any = undefined
    if (dataset.randomizerSets) {
        const setsRaw = JSON.parse(dataset.randomizerSets)
        const sets: IRandomizerSet[] = setsRaw.map((o: Record<string, string>) => {
            const ret: IRandomizerSet = {
                uuid: uuid.v4(),
                values: Object.entries(o).map(([tag, value]) => ({ tag, value })),
            }
            return ret
        })
        randomizer = {
            active: dataset.randomizerActive !== 'false',
            previewIndex: Number(dataset.randomizerPreviewIndex || 0),
            knownTags: JSON.parse(dataset.randomizerKnownTags || '[]'),
            sets,
        }
    }

    // 3. Parse UI Theme (legacy fallback)
    let uiTheme = dataset.uiTheme
    if (!uiTheme) {
        const oldTheme = dataset.solutionTheme || dataset.codeTheme
        if (oldTheme) {
            if (/light|neo|mbo/i.test(oldTheme)) {
                uiTheme = 'light'
            } else if (/dark|blackboard/i.test(oldTheme)) {
                uiTheme = 'dark'
            }
        }
    }

    const rawSettings = {
        id: dataset.question ? Number(dataset.question) : runningAppNumber++,
        uuid: el.getAttribute('uuid') || uuid.v4(),
        editMode: isCodeBlocksEditor,
        readonly: dataset.readonly,
        language: c ? c.language : compiler.languageType,
        compiler,
        runCode: dataset.runCode,
        emitAST: dataset.emitAst,
        executionTimeout: dataset.executionTimeout,
        maxCharacters: dataset.maxCharacters,
        outputParser: dataset.outputParser,
        uiTheme: uiTheme || 'light',
        domLibs: dataset.domLibs,
        workerLibs: dataset.workerLibs,
        continuousCompilation: dataset.continuousCompilation,
        enableCompletionInViewMode: enableCompletionInViewModeSetting,
        messagePassing: dataset.messagePassing,
        keepAlive: dataset.keepAlive,
        persistentArguments: dataset.persistentArguments,
        randomizer,
        scopeUUID: dataset.scopeUUID,
        scopeSelector: dataset.scopeSelector,
        shadowRoot,
    }

    if (!el.hasAttribute('uuid')) {
        el.setAttribute('uuid', rawSettings.uuid)
    }

    const strict = el.dataset.strictDomValidation !== 'false'
    const settings = (
        strict
            ? runtimeSettingsSchema.strict().parse(rawSettings)
            : runtimeSettingsSchema.passthrough().parse(rawSettings)
    ) as IRuntimeSettings

    // 4. Parse children
    const blocks: IRuntimeBlock[] = []
    for (const childIn of el.children) {
        const child = childIn as HTMLElement
        if (child.parentElement !== el) {
            continue
        }

        const block = domToRuntimeBlock(child, settings, blocks.length, strict)
        if (block) {
            blocks.push(block)
        }
    }

    return { settings, blocks }
}

function domToRuntimeBlock(
    el: HTMLElement,
    settings: IRuntimeSettings,
    id: number,
    strict: boolean
): IRuntimeBlock | undefined {
    const dataset = el.dataset
    const asAttr = el.getAttribute('as')?.trim().toUpperCase()
    const type =
        (asAttr && KnownBlockTypes[asAttr as keyof typeof KnownBlockTypes]) ||
        (el.tagName.toUpperCase() as KnownBlockTypes)

    if (type !== KnownBlockTypes.TEXT && !KnownBlockTypes[type as keyof typeof KnownBlockTypes]) {
        return undefined
    }

    const rawBlock: any = {
        type,
        id,
        name: dataset.name || '',
        content: el.textContent || '',
        uuid: uuid.v4(),
        parentID: settings.id,
        noContent: dataset.noContent,
        scopeUUID: dataset.scopeUUID || settings.scopeUUID,
        scopeSelector: dataset.scopeSelector || settings.scopeSelector,
        metadata: {
            expanded: dataset.expanded,
            codeExpanded: dataset.codeExpanded,
            static: dataset.static,
            hidden: dataset.hidden,
            visibleLines: dataset.visibleLines,
            shouldAutoreset: dataset.shouldAutoreset,
            shouldReloadResources: dataset.shouldReloadResources,
            generateTemplate: dataset.generateTemplate,
            width: dataset.width || '100%',
            height: dataset.height || '200px',
            align: dataset.align || 'center',
            version: dataset.version || '101',
            hasAlternativeContent: dataset.alternativeContent !== undefined,
        },
    }

    if (
        dataset.alternativeContent !== undefined &&
        !rawBlock.metadata.static &&
        !rawBlock.metadata.hidden
    ) {
        rawBlock.alternativeContent = dataset.alternativeContent
        if (!settings.editMode && rawBlock.noContent) {
            rawBlock.content = rawBlock.alternativeContent
        }
    }

    if (!settings.editMode && rawBlock.noContent && !rawBlock.alternativeContent) {
        rawBlock.content = ''
    }

    // Discriminated union doesn't have .strict() or .passthrough() directly
    return runtimeBlockSchema.parse(rawBlock)
}

const useShadowDOM = false

//this will handle the vue mounting on the dom
export class InternalCodeBlocksManager {
    readonly element: HTMLElement
    private _data: IRuntimeData | undefined
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

            //append original element to shadowDOM
            shadow.appendChild(el)
            this.element = el
        } else {
            this.shadowRoot = undefined
            this.element = el
        }
        this.initialize()
    }

    initialize() {
        this._data = domToRuntimeData(this.element, this.shadowRoot)
        console.d('INPUT DATA', this._data)
    }

    async resolveSrc() {
        const src = this.element.getAttribute('src')
        if (src) {
            try {
                const response = await fetch(src)
                if (!response.ok) {
                    throw new Error(
                        `Failed to fetch ${src}: ${response.status} ${response.statusText}`
                    )
                }
                let json: IJsonExport
                if (src.toLowerCase().endsWith('.zip')) {
                    const blob = await response.blob()
                    json = await getImportData(blob)
                } else {
                    json = validateImportData(await response.json(), false)
                    // Handle deferred loading for JSON exports
                    const baseUrl = src.substring(0, src.lastIndexOf('/') + 1)
                    await Promise.all(
                        json.blocks.map(async (block) => {
                            if (block.file && !block.content) {
                                try {
                                    const fileResponse = await fetch(baseUrl + block.file)
                                    if (fileResponse.ok) {
                                        block.content = await fileResponse.text()
                                    } else {
                                        console.error(
                                            `Failed to load referenced file ${block.file}: ${fileResponse.status}`
                                        )
                                    }
                                } catch (fileError) {
                                    console.error(
                                        `Failed to load referenced file ${block.file} for block ${block.id}`,
                                        fileError
                                    )
                                }
                            }
                        })
                    )
                    json = processImportData(json, true) // validate JSON and throw if invalid
                }

                this._data = importDataToRuntimeData(json, {
                    id: this.data.settings.id,
                    uuid: this.data.settings.uuid,
                    editMode: this.data.settings.editMode,
                    shadowRoot: this.data.settings.shadowRoot,
                    scopeUUID: this.data.settings.scopeUUID,
                    scopeSelector: this.data.settings.scopeSelector,
                })
                this.element.removeAttribute('src') // avoid re-loading
            } catch (e: any) {
                console.error(`Failed to load codeblocks from ${src}`, e)
                this.data.settings.error = e.message || String(e)
            }
        }
    }

    instantiateVue() {
        const data = this.data
        this._data = undefined

        // No need to check attribute again - data.editMode is already set correctly
        const storeageInfo = storeBlock(data)
        const context = {
            appID: storeageInfo.appID,
        }

        const app = createApp(App, context)
        app.use(i18n)
        app.directive('tagged', taggedDirective)
        app.directive('highlight', highlightDirective)
        appUseCodeMirror(app)
        app.mount(this.element)
    }
}
