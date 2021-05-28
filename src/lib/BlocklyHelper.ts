import Vue from 'vue'

import {
    IBlocklyToolbox,
    IBlocklyToolboxItem,
    IBlocklyToolboxCategory,
    BlockPrimaryColors,
    KnownBlocklyTypes,
    BlockArgumentTypes,
    IBlockDefinition,
    IBlockLine,
    IBlockArgument,
    BlockSecondaryColors,
    BlockTertiaryColors,
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
    { label: 'Variables (dynamic)', value: '{!PrimaryColors.Variable_dynamic}' },
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
    { label: '345°', value: '345' },
]

export const PredefinedBlockTypes: IListItemData[] = Object.keys(KnownBlocklyTypes).map((key) => {
    const ret: IListItemData = {
        label: Vue.$l(`Blockly.BlockTypeNames.${key}`),
        value: KnownBlocklyTypes[key],
    }
    return ret
})

export const ColorSelection: IListItemData[] = [...ColorThemeSelection, ...ColorHues]

export const ColorSelectionWithNone: IListItemData[] = [
    { label: 'None', value: '' },
    ...ColorSelection,
]

export const PredefinedArgumentTypes: IListItemData[] = Object.keys(BlockArgumentTypes).map(
    (key) => {
        const ret: IListItemData = {
            label: Vue.$l(`Blockly.ArgumentTypeNames.${key}`),
            value: key,
        }
        return ret
    }
)

export const blockStyles = {
    colour_blocks: {
        colourPrimary: BlockPrimaryColors.Colour,
        colourSecondary: BlockSecondaryColors.Colour,
        colourTertiary: BlockTertiaryColors.Colour,
        hat:'cap',
    },
    list_blocks: {
        colourPrimary: BlockPrimaryColors.List,
        colourSecondary: BlockSecondaryColors.List,
        colourTertiary: BlockTertiaryColors.List,
        hat:'cap',
    },
    logic_blocks: {
        colourPrimary: BlockPrimaryColors.Logic,
        colourSecondary: BlockSecondaryColors.Logic,
        colourTertiary: BlockTertiaryColors.Logic,
        hat:'cap',
    },
    loop_blocks: {
        colourPrimary: BlockPrimaryColors.Loop,
        colourSecondary: BlockSecondaryColors.Loop,
        colourTertiary: BlockTertiaryColors.Loop,
        hat:'cap',
    },
    math_blocks: {
        colourPrimary: BlockPrimaryColors.Math,
        colourSecondary: BlockSecondaryColors.Math,
        colourTertiary: BlockTertiaryColors.Math,
        hat:'cap',
    },
    procedure_blocks: {
        colourPrimary: BlockPrimaryColors.Procedure,
        colourSecondary: BlockSecondaryColors.Procedure,
        colourTertiary: BlockTertiaryColors.Procedure,
        hat:'cap',
    },
    text_blocks: {
        colourPrimary: BlockPrimaryColors.Text,
        colourSecondary: BlockSecondaryColors.Text,
        colourTertiary: BlockTertiaryColors.Text,
        hat:'cap',
    },
    variable_blocks: {
        colourPrimary: BlockPrimaryColors.Variable,
        colourSecondary: BlockSecondaryColors.Variable,
        colourTertiary: BlockTertiaryColors.Variable,
        hat:'cap',
    },
    variable_dynamic_blocks: {
        colourPrimary: BlockPrimaryColors.Variable_dynamic,
        colourSecondary: BlockSecondaryColors.Variable_dynamic,
        colourTertiary: BlockTertiaryColors.Variable_dynamic,
        hat:'cap',
    },
    hat_blocks: {
        colourPrimary: '330',
        colourSecondary: '330',
        colourTertiary: '330',
        hat: 'cap',
    },
}

export const categoryStyles = {
    colour_category: { colour: blockStyles.colour_blocks.colourPrimary },
    list_category: { colour: blockStyles.list_blocks.colourPrimary },
    logic_category: { colour: blockStyles.logic_blocks.colourPrimary },
    loop_category: { colour: blockStyles.loop_blocks.colourPrimary },
    math_category: { colour: blockStyles.math_blocks.colourPrimary },
    procedure_category: { colour: blockStyles.procedure_blocks.colourPrimary },
    text_category: { colour: blockStyles.text_blocks.colourPrimary },
    variable_category: { colour: blockStyles.variable_blocks.colourPrimary },
    variable_dynamic_category: {
        colour: blockStyles.variable_dynamic_blocks.colourPrimary,
    },
}

//export const theme = new Blockly.Theme('CodeBlocks', blockStyles as any, categoryStyles)

export class BlocklyHelper {
    
    public toArgumentDescription(a: BlockArgumentTypes) {
        const n = Vue.$l(`Blockly.ArgumentTypeNames.${a}`)
        return n ? `${n} (${a})` : a
    }
    private serializeToolboxItem(i: IBlocklyToolboxItem): string {
        return `<block type="${i.type}"></block>`
    }
    private serializeToolboxItems(items: IBlocklyToolboxItem[]): string {
        return items.map((item) => this.serializeToolboxItem(item)).join('\n')
    }
    private serializeToolboxCategory(i: IBlocklyToolboxCategory): string {
        let res = `<category name="${i.name}"`
        if (i.color && i.color != '') {
            res += ` colour="${i.color}"`
        }
        if (i.custom && i.custom != '') {
            res += ` custom="${i.custom}"`
        }
        res += `>${this.serializeToolboxItems(i.items)}</category>`
        return res
    }
    private serializeToolboxCategories(items: IBlocklyToolboxCategory[]): string {
        return items.map((item) => this.serializeToolboxCategory(item)).join('\n')
    }

    public serializeToolbox(toolbox: IBlocklyToolbox): string {
        const catCount = toolbox.categories.length
        if (toolbox.categories && catCount > 1) {
            return `${this.serializeToolboxCategories(toolbox.categories)}`
        } else if (catCount === 1) {
            const cat = toolbox.categories[0]
            if (cat.color === undefined || cat.color == '' || cat.name == '') {
                return '' + this.serializeToolboxItems(cat.items)
            } else {
                return '' + this.serializeToolboxCategories(toolbox.categories)
            }
        } else {
            return ''
        }
    }

    public getBlockDescription(bl: IBlockDefinition): object {
        const cp = { ...bl.JSON }
        cp.colour = this.toHTMLColor(cp.colour)
        return cp
    }

    public serializeCustomBlock(bl: IBlockDefinition): string {
        return JSON.stringify(this.getBlockDescription(bl))
    }

    public serializeCustomBlocks(bls: IBlockDefinition[]): string {
        return JSON.stringify(bls.map((bl) => this.getBlockDescription(bl)))
    }

    get codeUndefines(): string {
        return 'const window = undefined; const Window = undefined; const document = undefined;const $ = undefined;const _ = undefined;'
    }

    public removeSelfClosingTags(xml: string): string {
        //console.log(xml, '\n', xml.replace(/<(\w+)([^<]*)\/>/g, '<$1$2></$1>'))
        return xml.replace(/<(\w+)([^<]*)\/>/g, '<$1$2></$1>')
    }

    public prepareCode(cc: string): string {
        return `"use strict"; ${this.codeUndefines} return function(){ return {o: ${cc}}.o}.call({})`
    }

    public prepareBlocklyCode(cc: string): string {
        return `var Blockly = B;${this.codeUndefines}return { o:function(block) { ${cc} }}.o`
    }

    public compile(bl: IBlockDefinition, Blockly: any): any | undefined {
        const cc = this.prepareBlocklyCode(bl.codeString)
        bl._code = undefined
        try {
            //console.log(cc, Blockly)
            const code = new Function('B', cc)
            bl._code = code(Blockly)
        } catch (e) {
            bl._code = undefined
            console.error('Error Compiling', cc, e)
            return e + ''
        }
        return undefined
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
        Object.keys(BlockPrimaryColors).forEach((key) => {
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

    mounted() {}
}

export const blocklyHelper = new BlocklyHelper()
