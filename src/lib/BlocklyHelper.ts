import Vue from 'vue'

import {
    IBlocklyToolbox,
    IBlocklyToolboxItem,
    IBlocklyToolboxCategory,
    BlockPrimaryColors,
    KnownBlocklyTypes
} from '@/lib/IBlocklyHelper'
import { IListItemData } from './ICompilerRegistry'

export const ColorThemeSelection: IListItemData[] = [
    { label: 'Colors', value: '{!PrimaryColors.colour}' },
    { label: 'Arrays', value: '{!PrimaryColors.list}' },
    { label: 'Logic', value: '{!PrimaryColors.logic}' },
    { label: 'Loops', value: '{!PrimaryColors.loop}' },
    { label: 'Math', value: '{!PrimaryColors.math}' },
    { label: 'Procedures', value: '{!PrimaryColors.procedure}' },
    { label: 'String', value: '{!PrimaryColors.text}' },
    { label: 'Variables', value: '{!PrimaryColors.variable}' },
    { label: 'Variables (dynamic)', value: '{!PrimaryColors.variable_dynamic}' }
]

export const ColorHues: IListItemData[] = [
    { label: '0°', value: '0' },
    { label: '15°', value: '15' },
    { label: '30°', value: '30' },
    { label: '45°', value: '45' },
    { label: '60°', value: '60' },
    { label: '75°', value: '75' },
    { label: '90°', value: '90' },
    { label: '105°', value: '105' },
    { label: '120°', value: '120' },
    { label: '135°', value: '135' },
    { label: '150°', value: '150' },
    { label: '165°', value: '165' },
    { label: '180°', value: '180' },
    { label: '195°', value: '195' },
    { label: '210°', value: '210' },
    { label: '225°', value: '225' },
    { label: '240°', value: '240' },
    { label: '255°', value: '255' },
    { label: '270°', value: '270' },
    { label: '285°', value: '285' },
    { label: '300°', value: '300' },
    { label: '315°', value: '315' },
    { label: '330°', value: '330' },
    { label: '345°', value: '345' }
]

export const PredefinedBlockTypes: IListItemData[] = Object.keys(KnownBlocklyTypes).map(key => {
    const ret: IListItemData = {
        label: Vue.$l(`Blockly.BlockTypeNames.${key}`),
        value: KnownBlocklyTypes[key]
    }
    return ret
})

export const ColorSelection: IListItemData[] = [...ColorThemeSelection, ...ColorHues]

export const ColorSelectionWithNone: IListItemData[] = [
    { label: 'None', value: '' },
    ...ColorSelection
]

export class BlocklyHelper {
    private serializeToolboxItem(i: IBlocklyToolboxItem): string {
        return `<block type="${i.type}"></block>`
    }
    private serializeToolboxItems(items: IBlocklyToolboxItem[]): string {
        return items.map(item => this.serializeToolboxItem(item)).join('\n')
    }
    private serializeToolboxCategory(i: IBlocklyToolboxCategory): string {
        let res = `<category name="${i.name}"`
        if (i.color) {
            res += ` colour="${i.color}"`
        }
        res += `>${this.serializeToolboxItems(i.items)}</category>`
        return res
    }
    private serializeToolboxCategories(items: IBlocklyToolboxCategory[]): string {
        return items.map(item => this.serializeToolboxCategory(item)).join('\n')
    }

    public serializeToolbox(toolbox: IBlocklyToolbox): string {
        if (toolbox.categories) {
            return `${this.serializeToolboxCategories(toolbox.categories)}`
        } else if (toolbox.items) {
            return `${this.serializeToolboxItems(toolbox.items)}`
        } else {
            return ''
        }
    }

    public itemForValue(items: IListItemData[], value: string): IListItemData {
        return Vue.$CodeBlock.itemForValue(items, value)
    }

    public toColorCode(color: string): string | undefined {
        if (color === '') {
            return undefined
        }
        return color
    }

    public toColor(color: string | undefined): string {
        if (color === undefined) {
            return ''
        }
        Object.keys(BlockPrimaryColors).forEach(key => {
            if (color == `{!PrimaryColors.${key}}`) {
                color = BlockPrimaryColors[key]
            }
        })
        return color
    }

    public toHTMLColor(color: string | undefined): string {
        const cl = this.toColor(color)
        if (cl.length > 0 && cl[0] != '#' && cl[0] != 'h' && cl[0] != 'r') {
            return `hsl(${cl}, 100%, 50%)`
        }
        return cl
    }
}

export const blocklyHelper = new BlocklyHelper()
