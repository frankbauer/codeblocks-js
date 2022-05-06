import { IBlockloadManager, IBlockElementData, IBlockDataBase } from '@/lib/ICodeBlocks'
export class DataLoadManager implements IBlockloadManager {
    get blockTag(): string {
        return 'DATA'
    }

    loadFromDatablock(
        bl: HTMLElement,
        inBlock: IBlockElementData,
        block: IBlockDataBase,
        editMode: boolean
    ): void {
        block.obj = null
        block.version = bl.getAttribute('data-version')
            ? bl.getAttribute('data-version')!
            : block.version

        block.name = inBlock.name !== undefined ? inBlock.name : `v${block.id}`
    }
}

export const dataLoader = new DataLoadManager()

export default function (loaders: { [index: string]: IBlockloadManager }) {
    loaders[dataLoader.blockTag] = dataLoader
}
