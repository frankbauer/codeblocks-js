import { IScriptBlock } from '@/lib/IScriptBlock'
import { LegacyScriptBlock } from './scriptBlocks/LegacyScriptBlock'
import { ScriptBlockV101 } from './scriptBlocks/ScriptBlockV101'
import { ScriptBlockV102 } from './scriptBlocks/ScriptBlockV102'

export { jsErrorParser } from './scriptBlocks/utils'

export function createScriptBlock(script: string, version: string): IScriptBlock {
    if (version === '100' || version === '' || version === undefined) {
        return new LegacyScriptBlock(script, version)
    } else if (version === '101') {
        return new ScriptBlockV101(script, version)
    } else if (version === '102') {
        return new ScriptBlockV102(script, version)
    } else {
        // Default to latest or 102 for now
        return new ScriptBlockV102(script, version)
    }
}
