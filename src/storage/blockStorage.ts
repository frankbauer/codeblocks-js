import { AppContext, BlockData, IAppSettings } from '@/lib/codeBlocksManager'
import MainBlock from '@/lib/MainBlock'
import { computed, ComputedRef, Ref, ref, UnwrapNestedRefs, UnwrapRef } from 'vue'

const storage: Ref<UnwrapNestedRefs<MainBlock>>[] = []

export function storeBlock(data: IAppSettings) {
    storage.push(ref(new MainBlock(data)))
    return { appID: storage.length - 1 }
}

export type BlockStorageType = ReturnType<typeof useBlockStorage>

export const useBlockStorage = (appID: number) => {
    const appInfo = computed(() => {
        console.log('appInfo', appID, storage[appID].value)
        return storage[appID].value
    })

    const blockIDs = computed(() => appInfo.value.blocks.map((v) => v.uuid))

    function getBlock(id: string): ComputedRef<BlockData> {
        return computed(() => appInfo.value.blocks.find((v) => v.uuid === id)) as ComputedRef<BlockData>
    }

    return {
        appInfo,
        blockIDs,
        getBlock,
    }
}
