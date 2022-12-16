import { IBlockloadManager, IBlockElementData, IBlockDataBase } from '@/lib/ICodeBlocks'

export class BlockLoadManager implements IBlockloadManager {
    get blockTag(): string {
        return 'BLOCK'
    }

    loadFromDatablock(
        bl: HTMLElement,
        inBlock: IBlockElementData,
        block: IBlockDataBase,
        editMode: boolean
    ): void {
        const alts = bl.getElementsByTagName('ALTERNATIVE')
        const codes = bl.getElementsByTagName('CODE')
        if (codes.length > 0) {
            block.content = codes[0].textContent ? codes[0].textContent : ''
        }

        if (alts.length > 0) {
            block.hasAlternativeContent = true
            block.alternativeContent = alts[0].textContent
            if (!editMode && block.noContent) {
                block.content = block.alternativeContent ? block.alternativeContent : ''
            }
        }

        block.hasCode = true
    }
}

export const blockLoader = new BlockLoadManager()

export default function(loaders: { [index: string]: IBlockloadManager }) {
    loaders[blockLoader.blockTag] = blockLoader
}
