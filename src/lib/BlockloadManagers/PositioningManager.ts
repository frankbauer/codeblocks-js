import { IBlockloadManager, IBlockElementData, IBlockDataBase } from '@/lib/ICodeBlocks'

export class PositioninLoadManager {
    loadFromDatablock(bl: HTMLElement, inBlock: IBlockElementData, block: IBlockDataBase): boolean {
        block.width = bl.getAttribute('width')
            ? bl.getAttribute('width')!
            : inBlock.width
            ? inBlock.width
            : '100%'
        block.height = bl.getAttribute('height')
            ? bl.getAttribute('height')!
            : inBlock.height
            ? inBlock.height
            : '300px'
        block.align = bl.getAttribute('align')
            ? bl.getAttribute('align')!
            : inBlock.align
            ? inBlock.align
            : 'center'

        return true
    }
}

export const positioninLoadManager = new PositioninLoadManager()
