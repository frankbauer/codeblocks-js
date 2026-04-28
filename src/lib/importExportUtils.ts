import JSZip from 'jszip'
import { KnownBlockTypes } from './ICodeBlocks'
import MainBlock from './MainBlock'
import { BlockData } from './codeBlocksManager'

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

function getExtension(language: string): string {
    return LANGUAGE_EXTENSIONS[language.toLowerCase()] || 'txt'
}

interface IExportBlockMetadata {
    id: number
    uuid: string
    type: KnownBlockTypes
    name: string
    file: string
    isCombined?: boolean
    combinedIndex?: number
    metadata: any
}

export async function exportToZip(mainBlock: MainBlock, selectedBlockUuids: string[]): Promise<Blob> {
    const zip = new JSZip()
    const blocksToExport = mainBlock.blocks.filter((b) => selectedBlockUuids.includes(b.uuid))

    const exportedBlocks: IExportBlockMetadata[] = []
    const extension = getExtension(mainBlock.language)

    let i = 0
    while (i < blocksToExport.length) {
        const block = blocksToExport[i]

        if (isSourceCodeBlock(block)) {
            // Try to combine continuous source code blocks
            const continuous: BlockData[] = [block]
            let j = i + 1
            while (j < blocksToExport.length && isSourceCodeBlock(blocksToExport[j])) {
                if (blocksToExport[j].id === blocksToExport[j - 1].id + 1) {
                    continuous.push(blocksToExport[j])
                    j++
                } else {
                    break
                }
            }

            if (continuous.length > 1) {
                const combinedFileName = `${String(block.id).padStart(2, '0')}_combined.${extension}`
                let combinedContent = ''
                continuous.forEach((cb, index) => {
                    const typeLabel = getSourceBlockTypeLabel(cb)
                    combinedContent += `//#START ${typeLabel}${cb.name ? ' ' + cb.name : ''}\n`
                    combinedContent += cb.content
                    if (!cb.content.endsWith('\n')) combinedContent += '\n'

                    exportedBlocks.push({
                        id: cb.id,
                        uuid: cb.uuid,
                        type: cb.type,
                        name: cb.name,
                        file: combinedFileName,
                        isCombined: true,
                        combinedIndex: index,
                        metadata: getBlockMetadata(cb),
                    })
                })
                zip.file(combinedFileName, combinedContent)
                i = j
                continue
            }
        }

        // Single block
        const fileName = `${String(block.id).padStart(2, '0')}_${block.name || 'block'}.${block.type === KnownBlockTypes.TEXT ? 'md' : extension}`
        zip.file(fileName, block.content)
        exportedBlocks.push({
            id: block.id,
            uuid: block.uuid,
            type: block.type,
            name: block.name,
            file: fileName,
            metadata: getBlockMetadata(block),
        })
        i++
    }

    const settings = {
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

    zip.file(
        'blocks.json',
        JSON.stringify(
            {
                version: '1.0',
                settings,
                blocks: exportedBlocks,
            },
            null,
            2
        )
    )

    return await zip.generateAsync({ type: 'blob' })
}

function isSourceCodeBlock(block: BlockData): boolean {
    return (
        block.type === KnownBlockTypes.BLOCK ||
        block.type === KnownBlockTypes.BLOCKHIDDEN ||
        block.type === KnownBlockTypes.BLOCKSTATIC
    )
}

function getSourceBlockTypeLabel(block: BlockData): string {
    if (block.type === KnownBlockTypes.BLOCKHIDDEN) return 'HIDDEN'
    if (block.type === KnownBlockTypes.BLOCKSTATIC) return 'STATIC'
    return 'BLOCK'
}

function getBlockMetadata(block: BlockData): any {
    return {
        expanded: block.expanded,
        visibleLines: block.visibleLines,
        hasAlternativeContent: block.hasAlternativeContent,
        alternativeContent: block.alternativeContent,
        shouldAutoreset: block.shouldAutoreset,
        shouldReloadResources: block.shouldReloadResources,
        generateTemplate: block.generateTemplate,
        width: block.width,
        height: block.height,
        align: block.align,
        version: block.version,
    }
}

function getSourceBlockTypeLabelFromType(type: KnownBlockTypes): string {
    if (type === KnownBlockTypes.BLOCKHIDDEN) return 'HIDDEN'
    if (type === KnownBlockTypes.BLOCKSTATIC) return 'STATIC'
    return 'BLOCK'
}

export async function getImportData(file: File) {
    const zip = await JSZip.loadAsync(file)
    const blocksJsonFile = zip.file('blocks.json')
    if (!blocksJsonFile) throw new Error('Invalid codeblocks zip: missing blocks.json')

    const data = JSON.parse(await blocksJsonFile.async('text'))
    const fileCache: Record<string, string> = {}

    for (const block of data.blocks) {
        if (!fileCache[block.file]) {
            fileCache[block.file] = await zip.file(block.file)!.async('text')
        }

        if (block.isCombined) {
            const fullContent = fileCache[block.file]
            const typeLabel = getSourceBlockTypeLabelFromType(block.type)
            const expectedHeaderStart = `//#START ${typeLabel}${block.name ? ' ' + block.name : ''}`
            
            // Find the start of our specific block
            const blockStartIdx = fullContent.indexOf(expectedHeaderStart)
            if (blockStartIdx !== -1) {
                // The content starts after the header line
                const contentStartIdx = fullContent.indexOf('\n', blockStartIdx) + 1
                // The content ends before the next //#START marker or the end of the file
                let nextStartIdx = fullContent.indexOf('//#START ', contentStartIdx)
                
                let content = ''
                if (nextStartIdx !== -1) {
                    content = fullContent.substring(contentStartIdx, nextStartIdx)
                } else {
                    content = fullContent.substring(contentStartIdx)
                }
                block.content = content.replace(/\n$/, '')
            }
        } else {
            block.content = fileCache[block.file]
        }
    }
    return data
}
