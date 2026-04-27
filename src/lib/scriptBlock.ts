import { IScriptBlock } from '@/lib/IScriptBlock'
import { LegacyScriptBlock } from './scriptBlocks/LegacyScriptBlock'
import { ScriptBlockV101 } from './scriptBlocks/ScriptBlockV101'
import { ScriptBlockV102 } from './scriptBlocks/ScriptBlockV102'
import { LibraryScriptBlock } from './scriptBlocks/LibraryScriptBlock'

export { jsErrorParser } from './scriptBlocks/utils'

export function createScriptBlock(script: string, version: string): IScriptBlock {
    if (version === '100' || version === '' || version === undefined) {
        return new LegacyScriptBlock(script, version)
    } else if (version === '101') {
        return new ScriptBlockV101(script, version)
    } else if (version === '102') {
        return new ScriptBlockV102(script, version)
    } else {
        return new ScriptBlockV102(script, version)
    }
}

export function createLibraryScriptBlock(
    script: string,
    name: string,
    version: string = '102'
): LibraryScriptBlock {
    return new LibraryScriptBlock(script, version, name)
}
