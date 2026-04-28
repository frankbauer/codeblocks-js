import { IAppSettings, BlockData, constructBlock } from '@/lib/codeBlocksManager'
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

const commonMetadataSchema = z.object({
    expanded: z.boolean().optional(),
})

const expandableCodeMetadataSchema = commonMetadataSchema.extend({
    codeExpanded: z.nativeEnum(CodeExpansionType).optional(),
})

const playgroundMetadataSchema = expandableCodeMetadataSchema.extend({
    shouldAutoreset: z.boolean().optional(),
    shouldReloadResources: z.boolean().optional(),
    generateTemplate: z.boolean().optional(),
    width: z.string().optional(),
    height: z.string().optional(),
    align: z.string().optional(),
    version: z.string().optional(),
})

const blockMetadataSchema = commonMetadataSchema.extend({
    static: z.boolean().optional(),
    hidden: z.boolean().optional(),
    visibleLines: z
        .union([z.number().int().min(1), z.literal('auto'), z.string()])
        .optional()
        .transform((val) => {
            if (val === 'auto') {
                return 'auto'
            }
            if (typeof val === 'string') {
                const parsed = parseInt(val, 10)
                return isNaN(parsed) || parsed < 1 ? 'auto' : parsed
            }
            return val
        }),
    hasAlternativeContent: z.boolean().optional(),
})

const metadataSchema = z.union([
    commonMetadataSchema,
    blockMetadataSchema,
    expandableCodeMetadataSchema,
    playgroundMetadataSchema,
])

const exportBlockMetadataSchema = z.object({
    id: z.number(),
    type: z.nativeEnum(KnownBlockTypes),
    name: z.string().optional().default(''),
    file: z.string().optional(),
    isCombined: z.boolean().optional(),
    metadata: blockMetadataSchema.optional().default({}),
    content: z.string().optional(),
    alternativeContent: z.string().optional().nullable(),
    hasAlternativeContent: z.boolean().optional(),
})

const exportedSettingsSchema = z.object({
    readonly: z.boolean().optional().default(false),
    language: z.string().optional().default('javascript'),
    compiler: z
        .object({
            languageType: z.string().optional().default('javascript'),
            version: z.string().optional().default('v100'),
        })
        .default({ languageType: 'javascript', version: 'v100' }) as z.ZodType<ICompilerID>,
    runCode: z.boolean().optional().default(true),
    emitAST: z.boolean().optional().default(false),
    executionTimeout: z.number().optional().default(5000),
    maxCharacters: z.number().optional().default(10000),
    outputParser: z.nativeEnum(CodeOutputTypes).optional().default(CodeOutputTypes.AUTO),
    uiTheme: z.string().optional().default('light') as z.ZodType<UIThemeType>,
    domLibs: z.array(z.string()).optional().default([]),
    workerLibs: z.array(z.string()).optional().default([]),
    continuousCompilation: z.boolean().optional().default(false),
    messagePassing: z.boolean().optional().default(false),
    keepAlive: z.boolean().optional().default(false),
    persistentArguments: z.boolean().optional().default(false),
    randomizer: z.any().optional(), // IRandomizerSettings
    scopeUUID: z.string().optional(),
    scopeSelector: z.string().optional(),
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
export type IExportBlockMetadata = z.infer<typeof exportBlockMetadataSchema>
export type IExportedSettings = z.infer<typeof exportedSettingsSchema>
export type IJsonExport = z.infer<typeof jsonExportSchema>

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

type TypeStartLabels = 'API' | 'STATIC' | 'SOLUTION'

export async function exportToZip(
    mainBlock: MainBlock,
    selectedBlockUuids: string[]
): Promise<Blob> {
    const zip = new JSZip()
    const blocksToExport = mainBlock.blocks.filter((b) => selectedBlockUuids.includes(b.uuid))

    const exportedBlocks: IExportBlockMetadata[] = []

    let i = 0
    while (i < blocksToExport.length) {
        const block = blocksToExport[i]

        const extension = getExtension(mainBlock.language, block)

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
                    if (cb.hasAlternativeContent) {
                        combinedContent += cb.alternativeContent + '\n'
                        combinedContent += `//#END STUDENT\n`
                    }

                    combinedContent += cb.content
                    if (!cb.content.endsWith('\n')) {
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
                })

                zip.file(combinedFileName, combinedContent)
                i = j
                continue
            }
        }

        // Single block
        const fileName = `${String(block.id).padStart(2, '0')}_${block.name || 'block'}.${extension}`
        zip.file(fileName, block.content)
        exportedBlocks.push({
            id: block.id,
            type: block.type,
            name: block.name,
            file: fileName,
            metadata: getBlockMetadata(block),
        })
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
        randomizer: mainBlock.randomizer,
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

function getBlockMetadata(block: BlockData): IMetadata {
    const commonMetadata: any = {
        expanded: block.expanded,
        version: block.version,
        static: block.static,
        hidden: block.hidden,
    }
    if (block.type === KnownBlockTypes.PLAYGROUND) {
        return {
            ...commonMetadata,
            codeExpanded: block.codeExpanded,
            shouldAutoreset: block.shouldAutoreset,
            shouldReloadResources: block.shouldReloadResources,
            generateTemplate: block.generateTemplate,
            width: block.width,
            height: block.height,
            align: block.align,
        }
    } else if (block.isSourceCode) {
        return {
            ...commonMetadata,
            visibleLines: block.visibleLines,
            hasAlternativeContent: block.hasAlternativeContent,
        }
    } else if (block.type === KnownBlockTypes.LIBRARY) {
        return {
            ...commonMetadata,
            codeExpanded: block.codeExpanded,
        }
    } else if (block.type === KnownBlockTypes.DATA) {
        return {
            ...commonMetadata,
            codeExpanded: block.codeExpanded,
        }
    }
    return commonMetadata
}

function getSourceBlockTypeLabelFromType(type: KnownBlockTypes): TypeStartLabels {
    if (type === KnownBlockTypes.BLOCKHIDDEN) {
        return 'API'
    }
    if (type === KnownBlockTypes.BLOCKSTATIC) {
        return 'STATIC'
    }
    return 'SOLUTION'
}

export async function getImportData(file: File) {
    const zip = await JSZip.loadAsync(file)
    const blocksJsonFile = zip.file('blocks.json')
    if (!blocksJsonFile) {
        throw new Error('Invalid codeblocks zip: missing blocks.json')
    }

    let data: IJsonExport
    try {
        const rawData = JSON.parse(await blocksJsonFile.async('text'))
        data = jsonExportSchema.parse(rawData)
    } catch (e) {
        if (e instanceof z.ZodError) {
            console.error('Validation error in blocks.json:', e.issues)
            throw new Error(
                `Invalid codeblocks.json structure: ${e.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ')}`
            )
        }
        throw e
    }

    const expandedBlocks: IExportBlockMetadata[] = []
    const fileCache: Record<string, string> = {}

    for (const block of data.blocks) {
        if (!fileCache[block.file]) {
            fileCache[block.file] = await zip.file(block.file)!.async('text')
        }

        if (block.isCombined) {
            const fullContent = fileCache[block.file]
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
                    const metadata = { ...block.metadata }

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

                    const newBlock: IExportBlockMetadata = {
                        id: block.id + index, // approximate
                        type: blockType,
                        name: name || block.name,
                        file: block.file,
                        metadata: metadata,
                    }

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
            block.content = fileCache[block.file]
            expandedBlocks.push(block)
        }
    }
    data.blocks = expandedBlocks
    return data
}

export function applyImportToMainBlock(
    importData: IJsonExport,
    main: MainBlock,
    mode: 'append' | 'prepend' | 'override' = 'append',
    importSettings = true
) {
    if (importSettings) {
        const s = importData.settings
        main.language = s.language
        main.compiler = s.compiler
        main.runCode = s.runCode
        main.emitAST = s.emitAST
        main.executionTimeout = s.executionTimeout
        main.maxCharacters = s.maxCharacters
        main.outputParser = s.outputParser
        main.uiTheme = s.uiTheme
        main.domLibs = s.domLibs
        main.workerLibs = s.workerLibs
        main.continuousCompilation = s.continuousCompilation
        main.messagePassing = s.messagePassing
        main.keepAlive = s.keepAlive
        main.persistentArguments = s.persistentArguments
        main.randomizer = s.randomizer
    }

    const newBlocks: BlockData[] = importData.blocks.map((b) => {
        const data: any = {
            ...b.metadata,
            type: b.type,
            name: b.name,
            content: b.content || '',
            alternativeContent: b.alternativeContent || null,
            hasAlternativeContent: b.hasAlternativeContent || false,
            id: 0, // temporary
            uuid: uuid.v4(),
            parentID: main.id,
            noContent: !b.content,
            readyCount: 0,
            errors: [],
            lineCountHint: -1,
        }

        // Ensure flags are set, prioritizing metadata if available, otherwise inferring from type
        data.static = data.static ?? b.type === KnownBlockTypes.BLOCKSTATIC
        data.hidden = data.hidden ?? b.type === KnownBlockTypes.BLOCKHIDDEN
        data.readonly = data.readonly ?? (data.static || data.hidden)
        data.hasCode =
            data.hasCode ??
            (b.type === KnownBlockTypes.BLOCK ||
                b.type === KnownBlockTypes.BLOCKSTATIC ||
                b.type === KnownBlockTypes.BLOCKHIDDEN)
        // Default to '101' only if it's truly missing, to avoid '100' which is deprecated
        if (!data.version) {
            data.version = '101'
        }

        return constructBlock(main, data)
    })

    if (mode === 'override') {
        main.blocks = newBlocks
    } else if (mode === 'prepend') {
        main.blocks.unshift(...newBlocks)
    } else {
        main.blocks.push(...newBlocks)
    }

    // Re-index
    main.blocks.forEach((b, i) => (b.id = i))
}
