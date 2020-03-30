import Vue from 'vue'
import Blockly from '@/plugins/blocklyEnv'

import {
    IBlocklyToolbox,
    IBlocklyToolboxItem,
    IBlocklyToolboxCategory,
    BlockPrimaryColors,
    KnownBlocklyTypes,
    BlockArgumentTypes,
    IBlockDefinition,
    IBlockLine,
    IBlockArgument
} from '@/lib/IBlocklyHelper'
import { IListItemData } from './ICompilerRegistry'

export const ColorThemeSelection: IListItemData[] = [
    { label: 'Colors', value: '{!PrimaryColors.Colour}' },
    { label: 'Arrays', value: '{!PrimaryColors.List}' },
    { label: 'Logic', value: '{!PrimaryColors.Logic}' },
    { label: 'Loops', value: '{!PrimaryColors.Loop}' },
    { label: 'Math', value: '{!PrimaryColors.Math}' },
    { label: 'Procedures', value: '{!PrimaryColors.Procedure}' },
    { label: 'String', value: '{!PrimaryColors.Text}' },
    { label: 'Variables', value: '{!PrimaryColors.Variable}' },
    { label: 'Variables (dynamic)', value: '{!PrimaryColors.Variable_dynamic}' }
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

export const PredefinedArgumentTypes: IListItemData[] = Object.keys(BlockArgumentTypes).map(key => {
    const ret: IListItemData = {
        label: Vue.$l(`Blockly.ArgumentTypeNames.${key}`),
        value: key
    }
    return ret
})

export class BlocklyHelper {
    public toArgumentDescription(a: BlockArgumentTypes) {
        const n = Vue.$l(`Blockly.ArgumentTypeNames.${a}`)
        return n ? `${n} (${a})` : a
    }
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

    public filterArgument(a: IBlockArgument): object {
        const { type, name } = a
        return { type, name }
    }
    public serializeArgument(bl: IBlockArgument): string {
        return JSON.stringify(this.filterArgument(bl))
    }

    public filterLine(l: IBlockLine, nr: number): object {
        const ret: any = {}
        ret[`message${nr}`] = l.message
        ret[`args${nr}`] = l.args.map(a => this.filterArgument(a))

        return ret
    }
    public serializeLine(l: IBlockLine, nr: number): string {
        return JSON.stringify(this.filterLine(l, nr))
    }

    public filterCustomBlock(bl: IBlockDefinition): object {
        let ret: any = { ...bl, ...this.filterLine(bl.header, 0) }
        delete ret.uuid
        delete ret.type
        delete ret.header
        delete ret.additionalLines
        delete ret.color
        delete ret.code
        delete ret.codeString

        ret.colour = this.toHTMLColor(bl.color)
        bl.additionalLines.forEach((l, i) => (ret = { ...ret, ...this.filterLine(l, i + 1) }))

        return ret
    }
    public serializeCustomBlock(bl: IBlockDefinition): string {
        return JSON.stringify(this.filterCustomBlock(bl))
    }

    public serializeCustomBlocks(bls: IBlockDefinition[]): string {
        return JSON.stringify(bls.map(bl => this.filterCustomBlock(bl)))
    }

    public prepareCode(cc: string): string {
        return `"use strict"; const window = undefined; const Window = undefined; const document = undefined; return function(){ return {o: ${cc}}.o}.call({})`
    }

    public prepareBlocklyCode(cc: string): string {
        return `return ${cc}`
    }

    public compile(bl: IBlockDefinition) {
        try {
            console.log(this.prepareBlocklyCode(bl.codeString))
            const code = new Function('BlocklyIn', this.prepareBlocklyCode(bl.codeString))
            bl.code = code(Blockly)
        } catch (e) {
            bl.code = undefined
            console.error('Error Compiling', bl.codeString, e)
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
