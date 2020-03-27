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

export interface IBlockDefinition {
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
}
