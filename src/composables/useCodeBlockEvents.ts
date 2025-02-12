import { type BlockStorageType } from '@/storage/blockStorage'
import type { IOnTypeChangeInfo, IOnVisibleLinesChangeInfo } from '@/composables/basicBlocks'
import { BlockData } from '@/lib/codeBlocksManager'
import { UnwrapRef } from 'vue'

export function useCodeBlockEvents(blockById: (id:number) => UnwrapRef<BlockData> | undefined, editMode: boolean) {    
    const onTypeChange = (nfo: IOnTypeChangeInfo): void => {
        if (!editMode) return
        const bl = blockById(nfo.id)
        if (!bl) return
        bl.type = nfo.type
        bl.hidden = nfo.hidden
        bl.static = nfo.static
        bl.hasCode = nfo.hasCode
    }

    const onVisibleLinesChange = (nfo: IOnVisibleLinesChangeInfo): void => {
        console.log('onVisibleLinesChange', nfo, editMode,  nfo.visibleLines !== 'auto', isNaN(nfo.visibleLines as number))
        if (!editMode) return
        const bl = blockById(nfo.id)
        if (!bl) return
        bl.visibleLines = nfo.visibleLines !== 'auto' && isNaN(nfo.visibleLines as number) 
            ? 'auto' 
            : nfo.visibleLines
    }

    return {
        onTypeChange,
        onVisibleLinesChange,
        // Add other event handlers as needed
    }
} 