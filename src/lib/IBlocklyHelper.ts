import { QuasarIconSetRating } from 'quasar'

export enum BlockPrimaryColors {
    colour = '#cf63cf',
    list = '#5cb1d6',
    logic = '#ffab19',
    loop = '#ffbf00',
    math = '#4c97ff',
    procedure = '#ff6680',
    text = '#bbbbca',
    variable = '#59c059',
    variable_dynamic = '#0fbd8c'
}

export enum BlockSecondaryColors {
    colour = '#c55ec5',
    list = '#57a8cb',
    logic = '#f2a218',
    loop = '#f2b500',
    math = '#488ff2',
    procedure = '#f2617a',
    text = '#b2b2c0',
    variable = '#55b655',
    variable_dynamic = '#0eb485'
}
export enum BlockTertiaryColors {
    colour = '#ba59ba',
    list = '#539fc1',
    logic = '#e69a17',
    loop = '#e6ac00',
    math = '#4488e6',
    procedure = '#e65c73',
    text = '#a8a8b6',
    variable = '#50ad50',
    variable_dynamic = '#0eaa7e'
}

export enum BlockOutputTypes {
    Number = 'Number',
    Boolean = 'Boolean',
    String = 'String',
    Array = 'Array',
    Color = 'Colour',
    Any = ''
}

export enum BlockSequenceTypes {
    Action = 'Action'
}

export enum BlockArgumentTypes {
    field_input = 'field_input',
    field_dropdown = 'field_dropdown',
    field_checkbox = 'field_checkbox',
    field_colour = 'field_colour',
    field_number = 'field_number',
    field_angle = 'field_angle',
    field_variable = 'field_variable',
    field_date = 'field_date',
    field_label = 'field_label',
    field_image = 'field_image',
    input_value = 'input_value',
    input_statement = 'input_statement',
    input_dummy = 'input_dummy'
}

export interface IBlockArgument {
    type: BlockArgumentTypes
    name: string
    check?: BlockOutputTypes
    variable?: string
    variableTypes?: string[]
}

export interface IBlocklyToolboxItem {
    uuid: string
    type: string
}
export interface IBlocklyToolboxCategory {
    uuid: string
    items: IBlocklyToolboxItem[]
    color?: string
    name: string
}
export interface IBlocklyToolbox {
    itemsOnly: boolean
    items: IBlocklyToolboxItem[]
    categories: IBlocklyToolboxCategory[]
}

export interface IBlockDefinition {
    type: string
    message0: string
    arg0: IBlockArgument[]
    message1?: string
    arg1?: IBlockArgument[]
    message2?: string
    arg2?: IBlockArgument[]
    message3?: string
    arg3?: IBlockArgument[]
    message4?: string
    arg4?: IBlockArgument[]
    message5?: string
    arg5?: IBlockArgument[]

    output?: BlockOutputTypes
    previousStatement: BlockSequenceTypes | null
    nextStatement: BlockSequenceTypes | null
    colour: number
    tooltip?: string
    helpUrl?: string
}

export enum KnownBlocklyTypes {
    controls_if = 'controls_if',
    logic_compare = 'logic_compare',
    logic_operation = 'logic_operation',
    logic_negate = 'logic_negate',
    logic_boolean = 'logic_boolean',
    logic_null = 'logic_null',
    logic_ternary = 'logic_ternary',
    controls_repeat_ext = 'controls_repeat_ext',
    controls_whileUntil = 'controls_whileUntil',
    controls_for = 'controls_for',
    controls_forEach = 'controls_forEach',
    controls_flow_statements = 'controls_flow_statements',
    math_number = 'math_number',
    math_arithmetic = 'math_arithmetic',
    math_single = 'math_single',
    math_trig = 'math_trig',
    math_constant = 'math_constant',
    math_number_property = 'math_number_property',
    math_round = 'math_round',
    math_on_list = 'math_on_list',
    math_modulomath_constrain = 'math_modulo',
    math_constrain = 'math_constrain',
    math_random_int = 'math_random_int',
    math_random_float = 'math_random_float',
    text = 'text',
    text_join = 'text_join',
    text_append = 'text_append',
    text_length = 'text_length',
    text_isEmpty = 'text_isEmpty',
    text_indexOf = 'text_indexOf',
    variables_get = 'variables_get',
    text_charAt = 'text_charAt',
    text_getSubstring = 'text_getSubstring',
    text_changeCase = 'text_changeCase',
    text_trim = 'text_trim',
    text_print = 'text_print',
    text_prompt_ext = 'text_prompt_ext',
    lists_create_with = 'lists_create_with',
    lists_repeat = 'lists_repeat',
    lists_length = 'lists_length',
    lists_isEmpty = 'lists_isEmpty',
    lists_indexOf = 'lists_indexOf',
    lists_getIndex = 'lists_getIndex',
    lists_setIndex = 'lists_setIndex',
    lists_getSublist = 'lists_getSublist',
    lists_split = 'lists_split',
    lists_sort = 'lists_sort',
    colour_picker = 'colour_picker',
    colour_random = 'colour_random',
    colour_rgb = 'colour_rgb',
    colour_blend = 'colour_blend'
}
