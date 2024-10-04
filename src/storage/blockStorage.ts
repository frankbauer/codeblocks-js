import { AppContext, IAppSettings } from '@/lib/codeBlocksManager'
import MainBlock from '@/lib/MainBlock'
import { computed, Ref, ref, UnwrapNestedRefs, UnwrapRef } from 'vue'
import { codeBlockSetup } from '@/composables/basicBlocks'

const storage: Ref<UnwrapNestedRefs<MainBlock>>[] = []

export function storeBlock(block: IAppSettings): AppContext {
    storage.push(ref(new MainBlock(block)))
    return {
        appID: storage.length - 1,
    }
}

export type BlockStorage = ReturnType<typeof useBlockStorage>

export const useBlockStorage = (appID: number) => {
    const appInfo = computed(() => storage[appID].value)

    const blockIDs = computed(() => appInfo.value.blocks.map((v) => v.uuid))

    function getBlock(id: string) {
        return computed(() => appInfo.value.blocks.find((v) => v.uuid === id))
    }

    return {
        appInfo,
        blockIDs,
        getBlock,
    }
}
