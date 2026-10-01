import { AppContext, BlockData } from '@/lib/codeBlocksManager'
import MainBlock from '@/lib/MainBlock'
import { computed, ComputedRef, Ref, ref, UnwrapNestedRefs, UnwrapRef } from 'vue'
import { IRuntimeData } from '@/lib/importExportUtils'

const storage: Ref<UnwrapNestedRefs<MainBlock>>[] = []

export function storeBlock(data: IRuntimeData) {
    storage.push(ref(new MainBlock(data)))
    return { appID: storage.length - 1 }
}

/**
 * Finds a mounted app by its host element (or any element inside it), its uuid or its
 * question id.
 */
export function findApp(target: HTMLElement | string | number): MainBlock | undefined {
    const apps = storage.map((s) => s.value as unknown as MainBlock)
    if (target instanceof HTMLElement) {
        const root =
            target.closest<HTMLElement>('.codeblocks[uuid]') ??
            target.querySelector<HTMLElement>('.codeblocks[uuid]')
        const id = root?.getAttribute('uuid') ?? target.getAttribute('uuid')
        return id ? apps.find((a) => a.uuid === id) : undefined
    }
    const key = String(target)
    return apps.find((a) => a.uuid === key) ?? apps.find((a) => String(a.id) === key)
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
