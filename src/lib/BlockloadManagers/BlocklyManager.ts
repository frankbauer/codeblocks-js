import { IBlockloadManager, IBlockElementData, IBlockDataBase } from '@/lib/ICodeBlocks'
import {
    IBlocklyToolbox,
    BlockPrimaryColors,
    BlockArgumentTypes,
    IBlockDefinition
} from '@/lib/IBlocklyHelper'
import { blocklyHelper } from '@/lib/BlocklyHelper'
import { positioninLoadManager } from '@/lib/BlockloadManagers/PositioningManager'
import { uuid } from 'vue-uuid'

export class BlocklyLoadManager implements IBlockloadManager {
    get blockTag(): string {
        return 'BLOCKLY'
    }

    private loadCustomBlocks(bl: HTMLElement, inBlock: IBlockElementData, block: IBlockDataBase) {
        const customBlocks = bl.querySelectorAll('script#customblocks') //bl.getElementsByTagName('CUSTOMBLOCKS')
        if (customBlocks.length > 0) {
            const str: string = customBlocks[0].innerHTML ? customBlocks[0].innerHTML : '{}'

            try {
                const arr: IBlockDefinition[] = new Function(blocklyHelper.prepareCode(str))()
                arr.forEach(bl => {
                    if (bl.JSON === undefined) {
                        bl.JSON = {
                            type: '',
                            message0: '',
                            args0: [],
                            nextStatement: null,
                            previousStatement: null,
                            colour: ''
                        }
                    }
                    if (bl.uuid === undefined || bl.uuid === '') {
                        bl.uuid = uuid.v4()
                    }

                    if (bl.codeString === undefined && bl._code !== undefined) {
                        bl.codeString = bl._code.toString()
                    }
                    bl._code = undefined
                })
                block.blockly.blocks = arr
            } catch (e) {
                console.error('Error parsing Blocks JSON', e)
            }
        }
    }

    private loadToolbox(bl: HTMLElement, inBlock: IBlockElementData, block: IBlockDataBase) {
        const toolboxInput = bl.getElementsByTagName('TOOLBOX')
        if (toolboxInput.length > 0) {
            const toolboxStr: string = toolboxInput[0].innerHTML ? toolboxInput[0].innerHTML : ''

            if (toolboxStr === '') {
                block.blockly.toolbox = this.defaultToolbox
            } else {
                try {
                    const obj: IBlocklyToolbox = new Function(
                        blocklyHelper.prepareCode(toolboxStr)
                    )()
                    obj.categories.forEach(c => {
                        if (c.uuid === undefined || c.uuid === '') {
                            c.uuid = uuid.v4()
                        }
                        if (c.color === undefined) {
                            c.color = ''
                        }
                        c.items.forEach(i => {
                            if (i.uuid === undefined || i.uuid === '') {
                                i.uuid = uuid.v4()
                            }
                        })
                    })
                    block.blockly.toolbox = obj
                } catch (e) {
                    console.error('Error Parsing ToolboxJSON', e)
                }
            }
        } else {
            block.blockly.toolbox = this.defaultToolbox
        }
    }

    private loadOverrideToolbox(
        bl: HTMLElement,
        inBlock: IBlockElementData,
        block: IBlockDataBase
    ) {
        const toolboxOverride = bl.querySelectorAll('script#toolboxoverride') //bl.getElementsByTagName('TOOLBOXOVERRIDE')
        if (toolboxOverride.length > 0) {
            block.blockly.toolboxOverride = toolboxOverride[0].innerHTML
                ? toolboxOverride[0].innerHTML
                : ''

            block.blockly.useOverride =
                toolboxOverride[0].hasAttribute('use') &&
                toolboxOverride[0].getAttribute('use') != 'false' &&
                toolboxOverride[0].getAttribute('use') != '0'
        }
    }

    private loadCode(bl: HTMLElement, inBlock: IBlockElementData, block: IBlockDataBase) {
        const codes = bl.querySelectorAll('script#content') //bl.getElementsByTagName('SCRIPT')

        if (codes.length > 0) {
            block.content = codes[0].innerHTML ? codes[0].innerHTML : ''
        } else {
            block.content = '<xml xmlns="https://developers.google.com/blockly/xml"></xml>'
        }
        block.hasCode = true
    }

    private isTrue(val: any): boolean {
        return val !== undefined && val != 'false' && val != '0'
    }

    loadFromDatablock(
        bl: HTMLElement,
        inBlock: IBlockElementData,
        block: IBlockDataBase,
        editMode: boolean
    ): void {
        block.obj = null
        positioninLoadManager.loadFromDatablock(bl, inBlock, block)

        block.blockly.showControls = this.isTrue(inBlock.showControls)

        this.loadCustomBlocks(bl, inBlock, block)
        this.loadToolbox(bl, inBlock, block)
        this.loadOverrideToolbox(bl, inBlock, block)
        this.loadCode(bl, inBlock, block)
    }

    get defaultToolbox(): IBlocklyToolbox {
        const tb: IBlocklyToolbox = {
            categories: [
                {
                    uuid: uuid.v4(),
                    name: 'Logic',
                    color: '{!PrimaryColors.Logic}',
                    items: [
                        { _expanded: false, type: 'controls_if', uuid: uuid.v4() },
                        { _expanded: false, type: 'logic_compare', uuid: uuid.v4() },
                        { _expanded: false, type: 'logic_operation', uuid: uuid.v4() },
                        { _expanded: false, type: 'logic_negate', uuid: uuid.v4() },
                        { _expanded: false, type: 'logic_boolean', uuid: uuid.v4() },
                        { _expanded: false, type: 'math_arithmetic', uuid: uuid.v4() },
                        { _expanded: false, type: 'lists_create_empty', uuid: uuid.v4() }
                    ]
                },
                {
                    uuid: uuid.v4(),
                    name: 'Loops',
                    color: '{!PrimaryColors.Loop}',
                    items: [
                        { _expanded: false, type: 'controls_repeat_ext', uuid: uuid.v4() },
                        { _expanded: false, type: 'controls_whileUntil', uuid: uuid.v4() }
                    ]
                },
                {
                    uuid: uuid.v4(),
                    name: 'Math',
                    color: '{!PrimaryColors.Math}',
                    items: [
                        { _expanded: false, type: 'math_number', uuid: uuid.v4() },
                        { _expanded: false, type: 'math_arithmetic', uuid: uuid.v4() },
                        { _expanded: false, type: 'math_single', uuid: uuid.v4() }
                    ]
                },
                {
                    uuid: uuid.v4(),
                    name: 'Text',
                    color: '{!PrimaryColors.Text}',
                    items: [
                        { _expanded: false, type: 'text', uuid: uuid.v4() },
                        { _expanded: false, type: 'text_length', uuid: uuid.v4() },
                        { _expanded: false, type: 'text_print', uuid: uuid.v4() },
                        { _expanded: false, type: 'text_join', uuid: uuid.v4() },
                        { _expanded: false, type: 'colour_rgb', uuid: uuid.v4() }
                    ]
                },
                {
                    uuid: uuid.v4(),
                    name: 'Variables',
                    custom: 'VARIABLE',
                    color: '{!PrimaryColors.Variable}',
                    items: []
                },
                {
                    uuid: uuid.v4(),
                    name: 'Procedures',
                    custom: 'PROCEDURE',
                    color: '{!PrimaryColors.Procedure}',
                    items: []
                }
            ]
        }
        return tb
    }
}

export const blocklyLoader = new BlocklyLoadManager()

export default function(loaders: { [index: string]: IBlockloadManager }) {
    loaders[blocklyLoader.blockTag] = blocklyLoader
}
