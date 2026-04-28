import { AppContext, BlockData } from '@/lib/codeBlocksManager'
import MainBlock from '@/lib/MainBlock'
import { computed, ComputedRef, Ref, ref, UnwrapNestedRefs, UnwrapRef } from 'vue'
import { IRuntimeData } from '@/lib/importExportUtils'

const storage: Ref<UnwrapNestedRefs<MainBlock>>[] = []

export function storeBlock(data: IRuntimeData) {
    storage.push(ref(new MainBlock(data)))
    return { appID: storage.length - 1 }
}

export type BlockStorageType = ReturnType<typeof useBlockStorage>

export const useBlockStorage = (appID: number) => {
    const appInfo: ComputedRef<MainBlock> = computed(() => {
        console.i('appInfo', appID, storage[appID].value)
        return storage[appID].value as unknown as MainBlock
    })

    const blockIDs = computed(() => appInfo.value.blocks.map((v) => v.uuid))

    function getBlock(id: string): ComputedRef<BlockData> {
        return computed(() =>
            appInfo.value.blocks.find((v) => v.uuid === id)
        ) as ComputedRef<BlockData>
    }

    return {
        appInfo,
        blockIDs,
        getBlock,
    }
}
