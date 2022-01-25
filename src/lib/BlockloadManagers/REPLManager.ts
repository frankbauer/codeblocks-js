import { IBlockloadManager, IBlockElementData, IBlockDataBase } from '@/lib/ICodeBlocks'

export class REPLLoadManager implements IBlockloadManager {
    get blockTag(): string {
        return 'REPL'
    }

    loadFromDatablock(
        bl: HTMLElement,
        inBlock: IBlockElementData,
        block: IBlockDataBase,
        editMode: boolean
    ): void {}
}

export const REPLLoader = new REPLLoadManager()

export default function (loaders: { [index: string]: IBlockloadManager }) {
    loaders[REPLLoader.blockTag] = REPLLoader
}
