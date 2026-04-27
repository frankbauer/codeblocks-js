import { IBlockloadManager, IBlockElementData, IBlockDataBase } from '@/lib/ICodeBlocks'
import { positioninLoadManager } from '@/lib/BlockloadManagers/PositioningManager'

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

export class LibraryLoadManager implements IBlockloadManager {
    get blockTag(): string {
        return 'LIBRARY'
    }

    loadFromDatablock(
        bl: HTMLElement,
        inBlock: IBlockElementData,
        block: IBlockDataBase,
        _editMode: boolean
    ): void {
        block.obj = null
        block.version = bl.getAttribute('data-version') ?? block.version
    }
}

export const playgroundLoader = new PlaygroundLoadManager()
export const libraryLoader = new LibraryLoadManager()

export default function (loaders: { [index: string]: IBlockloadManager }) {
    loaders[playgroundLoader.blockTag] = playgroundLoader
    loaders[libraryLoader.blockTag] = libraryLoader
}
