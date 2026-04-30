import { BlockData, IMainBlock } from '@/lib/codeBlocksManager'
import JSZip from 'jszip'
import {
    CodeExpansionType,
    CodeOutputTypes,
    IRandomizerSettings,
    KnownBlockTypes,
} from './ICodeBlocks'
import MainBlock from './MainBlock'
import { ICompilerID } from './ICompilerRegistry'
import { UIThemeType } from './uiTheme'
import { z } from 'zod'
import { uuid } from 'vue-uuid'

const isTrue = (val: any): boolean =>
    val !== undefined && val !== 'false' && val !== '0' && val !== false

const booleanCoerce = z
    .union([z.boolean(), z.string()])
    .transform((val) => (typeof val === 'string' ? isTrue(val) : !!val))

const numberCoerce = z.union([z.number(), z.string()]).transform((val) => Number(val))

const jsonCoerce = z.union([z.string(), z.any()]).transform((val) => {
    if (typeof val === 'string') {
        try {
            return JSON.parse(val)
        } catch (e) {
            return val
        }
    }
    return val
})

const commonMetadataSchema = z.object({
    expanded: booleanCoerce.optional(),
})

const expandableCodeMetadataSchema = commonMetadataSchema.extend({
    codeExpanded: z
        .union([z.nativeEnum(CodeExpansionType), z.string()])
        .transform((val) => {
            if (typeof val === 'string') {
                const upper = val.toUpperCase()
                if (upper === 'TINY' || val === 'false' || val === '0') {
                    return CodeExpansionType.TINY
                }
                if (upper === 'LARGE' || val === '2') {
                    return CodeExpansionType.LARGE
                }
                return CodeExpansionType.AUTO
            }
            return val
        })
        .optional(),
})

const playgroundMetadataSchema = expandableCodeMetadataSchema.extend({
    shouldAutoreset: booleanCoerce.optional(),
    shouldReloadResources: booleanCoerce.optional(),
    generateTemplate: booleanCoerce.optional(),
    width: z.string().optional(),
    height: z.string().optional(),
    align: z.string().optional(),
    version: z.string().optional(),
})

const blockMetadataSchema = commonMetadataSchema.extend({
    static: booleanCoerce.optional(),
    hidden: booleanCoerce.optional(),
    visibleLines: z
        .union([z.number().int().min(1), z.literal('auto'), z.string()])
        .transform((val) => {
            if (val === 'auto') {
                return 'auto'
            }
            if (typeof val === 'string') {
                const parsed = parseInt(val, 10)
                return isNaN(parsed) || parsed < 1 ? 'auto' : parsed
            }
            return val
        })
        .optional(),
    hasAlternativeContent: booleanCoerce.optional(),
})

const metadataSchema = z.union([
    commonMetadataSchema,
    blockMetadataSchema,
    expandableCodeMetadataSchema,
    playgroundMetadataSchema,
])

const baseBlockSchema = z.object({
    id: numberCoerce,
    name: z.string().optional().default(''),
    file: z.string().optional(),
    isCombined: booleanCoerce.optional(),
    content: z.string().optional(),
    alternativeContent: z.string().optional().nullable(),
    hasAlternativeContent: booleanCoerce.optional(),
})

const exportBlockMetadataSchema = z
    .discriminatedUnion('type', [
        baseBlockSchema.extend({
            type: z.literal(KnownBlockTypes.PLAYGROUND),
            metadata: playgroundMetadataSchema.optional().default({}),
        }),
        baseBlockSchema.extend({
            type: z.literal(KnownBlockTypes.BLOCK),
            metadata: blockMetadataSchema.optional().default({}),
        }),
        baseBlockSchema.extend({
            type: z.literal(KnownBlockTypes.BLOCKSTATIC),
            metadata: blockMetadataSchema.optional().default({}),
        }),
        baseBlockSchema.extend({
            type: z.literal(KnownBlockTypes.BLOCKHIDDEN),
            metadata: blockMetadataSchema.optional().default({}),
        }),
        baseBlockSchema.extend({
            type: z.literal(KnownBlockTypes.LIBRARY),
            metadata: expandableCodeMetadataSchema.optional().default({}),
        }),
        baseBlockSchema.extend({
            type: z.literal(KnownBlockTypes.DATA),
            metadata: expandableCodeMetadataSchema.optional().default({}),
        }),
        baseBlockSchema.extend({
            type: z.literal(KnownBlockTypes.TEXT),
            metadata: commonMetadataSchema.optional().default({}),
        }),
    ])
    .refine((data) => data.content !== undefined || data.file !== undefined, {
        message: 'Either content or file must be provided',
        path: ['content'],
    })

const randomizerSetTagSchema = z.object({
    tag: z.string(),
    value: z.string(),
})

const randomizerSetSchema = z.object({
    uuid: z.string(),
    values: z.array(randomizerSetTagSchema),
})

const randomizerSettingsSchema = z
    .object({
        active: booleanCoerce.optional().default(false),
        previewIndex: numberCoerce.optional().default(0),
        knownTags: z.array(z.string()).optional().default([]),
        sets: z.array(randomizerSetSchema).optional().default([]),
    })
    .superRefine((data, ctx) => {
        const known = new Set(data.knownTags)
        data.sets.forEach((set) => {
            set.values.forEach((tag) => {
                if (!known.has(tag.tag)) {
                    console.warn(
                        `[CodeBlocks] Randomizer set ${set.uuid} uses unknown tag "${tag.tag}". Known tags: ${data.knownTags.join(', ')}`
                    )
                }
            })
        })
    })

const exportedSettingsSchema = z.object({
    readonly: booleanCoerce.optional().default(false),
    language: z.string().optional().default('javascript'),
    compiler: z
        .union([
            z.string().transform((val) => {
                // Handle legacy 'compiler' + 'compilerVersion' logic?
                // Actually, domToRuntimeData will handle merging them into an object first
                return val
            }),
            z.object({
                languageType: z.string().optional().default('javascript'),
                version: z.string().optional().default('v100'),
            }),
        ])
        .default({ languageType: 'javascript', version: 'v100' }) as z.ZodType<ICompilerID>,
    runCode: booleanCoerce.optional().default(true),
    emitAST: booleanCoerce.optional().default(false),
    executionTimeout: numberCoerce.optional().default(5000),
    maxCharacters: numberCoerce.optional().default(10000),
    outputParser: z
        .union([z.nativeEnum(CodeOutputTypes), z.string()])
        .transform((val) => (val as CodeOutputTypes) || CodeOutputTypes.AUTO)
        .optional()
        .default(CodeOutputTypes.AUTO),
    uiTheme: z.string().optional().default('light') as z.ZodType<UIThemeType>,
    domLibs: jsonCoerce.optional().default([]),
    workerLibs: jsonCoerce.optional().default([]),
    continuousCompilation: booleanCoerce.optional().default(false),
    messagePassing: booleanCoerce.optional().default(false),
    keepAlive: booleanCoerce.optional().default(false),
    persistentArguments: booleanCoerce.optional().default(false),
    randomizer: randomizerSettingsSchema.optional(),
    scopeUUID: z.string().optional(),
    scopeSelector: z.string().optional(),
})

export const runtimeSettingsSchema = exportedSettingsSchema.extend({
    id: z.number(),
    uuid: z.string(),
    editMode: z.boolean().default(false),
    shadowRoot: z.custom<ShadowRoot>().optional(),
    error: z.string().optional(),
})

const jsonExportSchema = z.object({
    version: z.string().optional().default('1.0'),
    settings: exportedSettingsSchema,
    blocks: z.array(exportBlockMetadataSchema),
})

export type ICommonMetadata = z.infer<typeof commonMetadataSchema>
export type IExpandableCodeMetadata = z.infer<typeof expandableCodeMetadataSchema>
export type IPlaygroundMetadata = z.infer<typeof playgroundMetadataSchema>
export type IBlockMetadata = z.infer<typeof blockMetadataSchema>
export type IMetadata = z.infer<typeof metadataSchema>

export type MetadataByType<T extends KnownBlockTypes> = T extends KnownBlockTypes.PLAYGROUND
    ? IPlaygroundMetadata
    : T extends KnownBlockTypes.BLOCK | KnownBlockTypes.BLOCKSTATIC | KnownBlockTypes.BLOCKHIDDEN
      ? IBlockMetadata
      : T extends KnownBlockTypes.LIBRARY | KnownBlockTypes.DATA
        ? IExpandableCodeMetadata
        : ICommonMetadata

export type IExportBlockMetadata = z.infer<typeof exportBlockMetadataSchema>
export type IExportedSettings = z.infer<typeof exportedSettingsSchema>
export type IJsonExport = z.infer<typeof jsonExportSchema>

const runtimeBlockExtension = z.object({
    uuid: z.string(),
    parentID: z.number(),
    readyCount: z.number().default(0),
    errors: z.array(z.any()).default([]),
    scopeUUID: z.string().optional(),
    scopeSelector: z.string().optional(),
    lineCountHint: z.number().default(-1),
    noContent: booleanCoerce.optional().default(false),
    // content is already on the export schema, but must be present at runtime
    content: z.string().default(''),
})

const baseRuntimeBlock = baseBlockSchema.merge(runtimeBlockExtension)

export const runtimeBlockSchema = z.discriminatedUnion('type', [
    baseRuntimeBlock.extend({
        type: z.literal(KnownBlockTypes.PLAYGROUND),
        metadata: playgroundMetadataSchema.optional().default({}),
    }),
    baseRuntimeBlock.extend({
        type: z.literal(KnownBlockTypes.BLOCK),
        metadata: blockMetadataSchema.optional().default({}),
    }),
    baseRuntimeBlock.extend({
        type: z.literal(KnownBlockTypes.BLOCKSTATIC),
        metadata: blockMetadataSchema.optional().default({}),
    }),
    baseRuntimeBlock.extend({
        type: z.literal(KnownBlockTypes.BLOCKHIDDEN),
        metadata: blockMetadataSchema.optional().default({}),
    }),
    baseRuntimeBlock.extend({
        type: z.literal(KnownBlockTypes.LIBRARY),
        metadata: expandableCodeMetadataSchema.optional().default({}),
    }),
    baseRuntimeBlock.extend({
        type: z.literal(KnownBlockTypes.DATA),
        metadata: expandableCodeMetadataSchema.optional().default({}),
    }),
    baseRuntimeBlock.extend({
        type: z.literal(KnownBlockTypes.TEXT),
        metadata: commonMetadataSchema.optional().default({}),
    }),
])

export const runtimeDataSchema = z.object({
    settings: runtimeSettingsSchema,
    blocks: z.array(runtimeBlockSchema),
})

export type IRuntimeSettings = z.infer<typeof runtimeSettingsSchema>
export type IRuntimeBlock = z.infer<typeof runtimeBlockSchema>
export type IRuntimeData = z.infer<typeof runtimeDataSchema>

const LANGUAGE_EXTENSIONS: Record<string, string> = {
    javascript: 'js',
    java: 'java',
    python: 'py',
    cpp: 'cpp',
    c: 'c',
    html: 'html',
    css: 'css',
    glsl: 'glsl',
}

function getExtension(language: string, block: BlockData): string {
    if (block.type === KnownBlockTypes.TEXT) {
        return 'html'
    }
    if (block.type === KnownBlockTypes.DATA) {
        return 'json'
    }
    if (block.type === KnownBlockTypes.LIBRARY) {
        return 'js'
    }
    if (block.type === KnownBlockTypes.PLAYGROUND) {
        return 'js'
    }
    return LANGUAGE_EXTENSIONS[language.toLowerCase()] || 'txt'
}

export type TypeStartLabels = 'API' | 'STATIC' | 'SOLUTION'

export enum ExportRandomizerMode {
    ORIGINAL = 'original',
    CURRENT = 'current',
    ALL = 'all',
}

export interface ExportOptions {
    randomizerMode: ExportRandomizerMode
}

export async function exportToZip(
    mainBlock: MainBlock,
    selectedBlockUuids: string[],
    options: ExportOptions = { randomizerMode: ExportRandomizerMode.ORIGINAL },
    setIndex?: number
): Promise<Blob> {
    const zip = new JSZip()
    const blocksToExport = mainBlock.blocks.filter((b) => selectedBlockUuids.includes(b.uuid))

    const exportedBlocks: IExportBlockMetadata[] = []

    let i = 0
    while (i < blocksToExport.length) {
        const block = blocksToExport[i]

        const extension = getExtension(mainBlock.language, block)

        let blockContent = block.content
        let blockAltContent = block.alternativeContent

        if (options.randomizerMode === ExportRandomizerMode.CURRENT) {
            blockContent = block.actualContent()
            blockAltContent = block.actualAlternativeContent()
        } else if (options.randomizerMode === ExportRandomizerMode.ALL && setIndex !== undefined) {
            blockContent = block.randomizerContent(setIndex) || block.content
            blockAltContent =
                block.randomizerAlternativeContent(setIndex) ?? block.alternativeContent
        }

        if (block.isSourceCode) {
            // Try to combine continuous source code blocks
            const continuous: BlockData[] = [block]
            let j = i + 1
            while (j < blocksToExport.length && blocksToExport[j].isSourceCode) {
                if (blocksToExport[j].id === blocksToExport[j - 1].id + 1) {
                    continuous.push(blocksToExport[j])
                    j++
                } else {
                    break
                }
            }

            if (continuous.length > 1) {
                const first = continuous[0]
                const metaSupplier =
                    continuous.find((cb) => getSourceBlockTypeLabel(cb) === 'SOLUTION') || first
                const combinedFileName = `${String(block.id).padStart(2, '0')}_combined.${extension}`
                let combinedContent = ''
                continuous.forEach((cb, index) => {
                    const typeLabel = getSourceBlockTypeLabel(cb)
                    let blockSettingString = ''
                    if (typeLabel === 'SOLUTION') {
                        if (cb.visibleLines !== 'auto' && cb.visibleLines !== undefined) {
                            blockSettingString += ` [${cb.visibleLines}]`
                        }
                    }
                    if (cb.name) {
                        blockSettingString += `:: ${cb.name}`
                    }

                    combinedContent += `//#START ${typeLabel}${blockSettingString} \n`

                    let cbContent = cb.content
                    let cbAltContent = cb.alternativeContent

                    if (options.randomizerMode === ExportRandomizerMode.CURRENT) {
                        cbContent = cb.actualContent()
                        cbAltContent = cb.actualAlternativeContent()
                    } else if (
                        options.randomizerMode === ExportRandomizerMode.ALL &&
                        setIndex !== undefined
                    ) {
                        cbContent = cb.randomizerContent(setIndex) || cb.content
                        cbAltContent =
                            cb.randomizerAlternativeContent(setIndex) ?? cb.alternativeContent
                    }

                    if (cbAltContent !== null && cb.hasAlternativeContent) {
                        combinedContent += cbAltContent + '\n'
                        combinedContent += `//#END STUDENT\n`
                    }

                    combinedContent += cbContent
                    if (!cbContent.endsWith('\n')) {
                        combinedContent += '\n'
                    }
                })

                exportedBlocks.push({
                    id: metaSupplier.id,
                    type: metaSupplier.type,
                    name: metaSupplier.name,
                    file: combinedFileName,
                    isCombined: true,
                    metadata: getBlockMetadata(metaSupplier),
                } as IExportBlockMetadata)

                zip.file(combinedFileName, combinedContent)
                i = j
                continue
            }
        }

        // Single block
        const fileName = `${String(block.id).padStart(2, '0')}_${block.name || 'block'}.${extension}`
        zip.file(fileName, blockContent)
        exportedBlocks.push({
            id: block.id,
            type: block.type,
            name: block.name,
            file: fileName,
            alternativeContent: blockAltContent,
            hasAlternativeContent: block.hasAlternativeContent,
            metadata: getBlockMetadata(block),
        } as IExportBlockMetadata)
        i++
    }

    const settings: IExportedSettings = {
        readonly: mainBlock.readonly,
        language: mainBlock.language,
        compiler: mainBlock.compiler,
        runCode: mainBlock.runCode,
        emitAST: mainBlock.emitAST,
        executionTimeout: mainBlock.executionTimeout,
        maxCharacters: mainBlock.maxCharacters,
        outputParser: mainBlock.outputParser,
        uiTheme: mainBlock.uiTheme,
        domLibs: mainBlock.domLibs,
        workerLibs: mainBlock.workerLibs,
        continuousCompilation: mainBlock.continuousCompilation,
        messagePassing: mainBlock.messagePassing,
        keepAlive: mainBlock.keepAlive,
        persistentArguments: mainBlock.persistentArguments,
        randomizer:
            options.randomizerMode === ExportRandomizerMode.ORIGINAL
                ? mainBlock.randomizer
                : { ...mainBlock.randomizer, active: false },
    }

    const exportData: IJsonExport = {
        version: '1.0',
        settings,
        blocks: exportedBlocks,
    }

    try {
        jsonExportSchema.parse(exportData)
    } catch (e) {
        console.error('Validation error during export:', e)
        if (e instanceof z.ZodError) {
            throw new Error(
                `Failed to validate export data: ${e.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ')}`
            )
        }
        throw e
    }

    console.log('Exporting with data', exportData)

    zip.file('blocks.json', JSON.stringify(exportData, null, 2))

    return await zip.generateAsync({ type: 'blob' })
}

function getSourceBlockTypeLabel(block: BlockData): TypeStartLabels {
    if (block.type === KnownBlockTypes.BLOCKHIDDEN || block.hidden) {
        return 'API'
    }
    if (block.type === KnownBlockTypes.BLOCKSTATIC || block.static) {
        return 'STATIC'
    }
    return 'SOLUTION'
}

function getBlockMetadata<T extends KnownBlockTypes>(
    block: BlockData & { type: T }
): MetadataByType<T> {
    const commonMetadata: ICommonMetadata = {
        expanded: block.expanded,
    }

    if (block.type === KnownBlockTypes.PLAYGROUND) {
        return {
            ...commonMetadata,
            version: block.version,
            codeExpanded: block.codeExpanded,
            shouldAutoreset: block.shouldAutoreset,
            shouldReloadResources: block.shouldReloadResources,
            generateTemplate: block.generateTemplate,
            width: block.width,
            height: block.height,
            align: block.align,
        } as MetadataByType<T>
    } else if (
        block.type === KnownBlockTypes.BLOCK ||
        block.type === KnownBlockTypes.BLOCKSTATIC ||
        block.type === KnownBlockTypes.BLOCKHIDDEN
    ) {
        return {
            ...commonMetadata,
            visibleLines: block.visibleLines,
            hasAlternativeContent: block.hasAlternativeContent,
            static: block.type === KnownBlockTypes.BLOCKSTATIC || block.static,
            hidden: block.type === KnownBlockTypes.BLOCKHIDDEN || block.hidden,
        } as MetadataByType<T>
    } else if (block.type === KnownBlockTypes.LIBRARY || block.type === KnownBlockTypes.DATA) {
        return {
            ...commonMetadata,
            codeExpanded: block.codeExpanded,
        } as MetadataByType<T>
    }
    return commonMetadata as MetadataByType<T>
}

export async function getImportData(file: File | Blob): Promise<IJsonExport> {
    const zip = await JSZip.loadAsync(file)
    const blocksJsonFile = zip.file('blocks.json')
    if (!blocksJsonFile) {
        throw new Error('Invalid codeblocks zip: missing blocks.json')
    }

    let data: IJsonExport
    try {
        const rawData = JSON.parse(await blocksJsonFile.async('text'))
        data = validateImportData(rawData, false)
    } catch (e) {
        if (e instanceof z.ZodError) {
            console.error('Validation error in blocks.json:', e.issues)
            throw new Error(
                `Invalid codeblocks.json structure: ${e.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ')}`
            )
        }
        throw e
    }

    const fileCache: Record<string, string> = {}

    //resolve file references in parallel first to speed up imports with many blocks
    await Promise.all(
        data.blocks.map(async (block) => {
            if (block.file && !block.content) {
                if (!fileCache[block.file]) {
                    const zipFile = zip.file(block.file)
                    if (zipFile) {
                        fileCache[block.file] = await zipFile.async('text')
                    } else {
                        console.warn(`Referenced file ${block.file} not found in zip.`)
                        fileCache[block.file] = ''
                    }
                }
                block.content = fileCache[block.file]
                delete block.file
            }
        })
    )
    return processImportData(data, false) // skip validation here since we already validated the structure with zod
}

export function validateImportData(data: any, strict = true): IJsonExport {
    let parsedData: IJsonExport
    try {
        if (strict) {
            parsedData = jsonExportSchema.strict().parse(data)
        } else {
            parsedData = jsonExportSchema.parse(data)
        }
    } catch (e) {
        console.error('Validation error during import processing:', e)
        if (e instanceof z.ZodError) {
            throw new Error(
                `Failed to validate import data: ${e.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ')}`
            )
        }
        throw e
    }
    return parsedData
}

export function processImportData(data: IJsonExport, validate = false): IJsonExport {
    if (validate) {
        data = validateImportData(data)
    }

    const expandedBlocks: IExportBlockMetadata[] = []
    for (const block of data.blocks) {
        if (block.isCombined) {
            const fullContent = block.content
            if (!fullContent) {
                console.warn(
                    `Combined block ${block.id} has no content and no valid file reference.`
                )
                continue
            }
            const sections = fullContent.split(new RegExp('^//#START ', 'm')).slice(1)

            sections.forEach((section, index) => {
                const firstNewline = section.indexOf('\n')
                const header = section.substring(0, firstNewline).trim()
                let content = section.substring(firstNewline + 1)

                // Regex to parse: TYPE [visibleLines]:: Name
                const headerMatch = header.match(
                    /^(API|STATIC|SOLUTION)(?:\s+\[(\d+|auto)\])?(?:\s*::\s*(.*))?/
                )
                if (headerMatch) {
                    const typeLabel = headerMatch[1]
                    const visibleLines = headerMatch[2]
                    const name = headerMatch[3] || ''

                    let blockType = KnownBlockTypes.BLOCK
                    const metadata: any = { ...block.metadata }

                    if (typeLabel === 'API') {
                        blockType = KnownBlockTypes.BLOCKHIDDEN
                        metadata.hidden = true
                        metadata.static = false
                        delete metadata.visibleLines
                    } else if (typeLabel === 'STATIC') {
                        blockType = KnownBlockTypes.BLOCKSTATIC
                        metadata.static = true
                        metadata.hidden = false
                        delete metadata.visibleLines
                    } else {
                        blockType = KnownBlockTypes.BLOCK
                        metadata.static = false
                        metadata.hidden = false
                        if (visibleLines) {
                            metadata.visibleLines =
                                visibleLines === 'auto' ? 'auto' : parseInt(visibleLines, 10)
                        }
                    }

                    const newBlock = {
                        id: block.id + index, // approximate
                        type: blockType,
                        name: name || block.name,
                        file: block.file,
                        metadata: metadata,
                    } as IExportBlockMetadata

                    if (content.match(/\/\/#END STUDENT\r?\n/)) {
                        const parts = content.split(/\/\/#END STUDENT\r?\n/)
                        newBlock.alternativeContent = parts[0].replace(/\r?\n$/, '')
                        newBlock.content = parts
                            .slice(1)
                            .join('//#END STUDENT\n')
                            .replace(/\r?\n$/, '')
                        newBlock.hasAlternativeContent = true
                    } else {
                        newBlock.content = content.replace(/\r?\n$/, '')
                        newBlock.hasAlternativeContent = false
                    }
                    expandedBlocks.push(newBlock)
                }
            })
        } else {
            expandedBlocks.push(block)
        }
    }
    data.blocks = expandedBlocks
    return data
}

export function importDataToRuntimeData(
    importData: IJsonExport,
    overrideSettings?: Partial<IRuntimeSettings>
): IRuntimeData {
    const settings: IRuntimeSettings = {
        ...importData.settings,
        id: overrideSettings?.id ?? 0,
        uuid: overrideSettings?.uuid ?? uuid.v4(),
        editMode: overrideSettings?.editMode ?? false,
        shadowRoot: overrideSettings?.shadowRoot,
        error: overrideSettings?.error,
        ...overrideSettings,
    }

    const blocks: IRuntimeBlock[] = importData.blocks.map((b) => {
        return {
            ...b,
            uuid: uuid.v4(),
            parentID: settings.id,
            readyCount: 0,
            errors: [],
            lineCountHint: -1,
            noContent: !b.content,
            content: b.content || '',
        } as IRuntimeBlock
    })

    return runtimeDataSchema.parse({
        settings,
        blocks,
    })
}

export function applyImportToMainBlock(
    importData: any, // accept any for validation
    main: MainBlock,
    mode: 'append' | 'prepend' | 'override' = 'append',
    importSettings = true
) {
    const validatedData = validateImportData(importData)
    const runtimeData = importDataToRuntimeData(validatedData, {
        id: main.id,
        uuid: main.uuid,
        editMode: main.editMode,
        shadowRoot: main.shadowRoot,
    })

    if (mode === 'override') {
        main.applyRuntimeData(runtimeData, importSettings)
    } else {
        const newBlocks: BlockData[] = runtimeData.blocks.map((b) => new BlockData(b, main))

        if (mode === 'prepend') {
            main.blocks.unshift(...newBlocks)
        } else {
            main.blocks.push(...newBlocks)
        }

        if (importSettings) {
            const settingsOnly = { ...runtimeData, blocks: [] }
            main.applyRuntimeData(settingsOnly, true)
        }
    }

    // Re-index
    main.blocks.forEach((b, i) => (b.id = i))
}
