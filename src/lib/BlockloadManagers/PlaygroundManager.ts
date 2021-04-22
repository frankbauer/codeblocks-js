import { IBlockloadManager, IBlockElementData, IBlockDataBase } from '@/lib/ICodeBlocks'
import { positioninLoadManager } from '@/lib/BlockloadManagers/PositioningManager'
import { uuid } from 'vue-uuid'
export class PlaygroundLoadManager implements IBlockloadManager {
    get blockTag(): string {
        return 'PLAYGROUND'
    }

    loadFromDatablock(
        bl: HTMLElement,
        inBlock: IBlockElementData,
        block: IBlockDataBase,
        editMode: boolean
    ): void {
        block.obj = null
        positioninLoadManager.loadFromDatablock(bl, inBlock, block)
        block.version = bl.getAttribute('data-version')
            ? bl.getAttribute('data-version')!
            : block.version
    }
}

export const playgroundLoader = new PlaygroundLoadManager()

export default function (loaders: { [index: string]: IBlockloadManager }) {
    loaders[playgroundLoader.blockTag] = playgroundLoader
}
