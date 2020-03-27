import { QuasarIconSetRating } from 'quasar'

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
