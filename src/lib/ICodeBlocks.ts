import { ICompilerID } from './ICompilerRegistry'

export enum KnownBlockTypes {
    PLAYGROUND = 'PLAYGROUND',
    TEXT = 'TEXT',
    BLOCKHIDDEN = 'BLOCK-hidden',
    BLOCKSTATIC = 'BLOCK-static',
    BLOCK = 'BLOCK',
    BLOCKLY = 'BLOCKLY'
}

export enum CodeOutputTypes {
    AUTO = 'auto',
    TEXT = 'text',
    JSON = 'json',
    MAGIC = 'magic'
}
export interface IRandomizerSet {
    uuid: string
    values: IRandomizerSetTag[]
}

export interface IRandomizerSetTag {
    tag: string
    value: string
}
export interface IRandomizerSettings {
    active: boolean
    previewIndex: number
    knownTags: string[]
    sets: IRandomizerSet[]
}

export interface IBlockDataPlayground {
    width: string
    height: string
    align: string
}
export interface IBlockDataBlockly {
    toolbox: string | null
}
export interface IBlockData extends IBlockDataPlayground, IBlockDataBlockly {
    hasCode: boolean
    type: KnownBlockTypes
    content: string
    alternativeContent: string | null
    noContent: boolean
    id: number
    uuid: string
    parentID: number
    expanded: boolean
    codeExpanded: boolean
    obj: object | null
    readonly: boolean
    static: boolean
    hidden: boolean
    version: string
    readyCount: number
    errors: any[]
    scopeUUID?: string
    scopeSelector?: string
    visibleLines: number | 'auto'
    hasAlternativeContent: boolean
    shouldAutoreset: boolean
}
