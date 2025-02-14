import { EditorTheme, EditorThemes, Themes } from '@/plugins/codemirror/editorThemes'

export interface UITheme {
    name: string
    solutionBlock: EditorTheme
    codeBlock: EditorTheme
    otherBlocks: EditorTheme
}

export type UIThemeType = 'light' | 'dark'
const UIThemeData: { [key in UIThemeType]: UITheme } = {
    light: {
        name: 'Light',
        solutionBlock: EditorThemes['solarized-light'],
        codeBlock: EditorThemes['basic-light'],
        otherBlocks: EditorThemes['bordered-light'],
    },
    dark: {
        name: 'Dark',
        solutionBlock: EditorThemes['solarized-dark'],
        codeBlock: EditorThemes['basic-dark'],
        otherBlocks: EditorThemes['bordered-light'],
    },
}

export const UIThemeTypes: UIThemeType[] = Object.keys(UIThemeData) as UIThemeType[]

export function getUITheme(theme: UIThemeType): UITheme {
    return UIThemeData[theme] ?? UIThemeData.light
}
