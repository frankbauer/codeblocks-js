import { inject, type InjectionKey } from 'vue'

/**
 * How the names of the form fields of an app are built (container attribute `data-field-names`):
 * - `array` (default): `block[1][0]`, which PHP parses into nested arrays (`$_POST['block'][1][0]`)
 * - `flat`: `block_1_0`, a plain key. Use it when the surrounding form is processed by code that
 *   expects every posted value to be a string.
 */
export type FieldNameStyle = 'array' | 'flat'

export const FieldNameStyleKey: InjectionKey<FieldNameStyle> = Symbol('codeblocks.fieldNameStyle')

export function fieldNameStyleFromAttribute(value: string | undefined): FieldNameStyle {
    return value === 'flat' ? 'flat' : 'array'
}

/** Returns a function that builds a form field name, e.g. fieldName('block', 1, 0) */
export function useFieldName() {
    const style = inject(FieldNameStyleKey, 'array')
    return (base: string, ...keys: (string | number)[]): string =>
        style === 'flat' ? [base, ...keys].join('_') : base + keys.map((k) => `[${k}]`).join('')
}
