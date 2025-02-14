import { createHighlightStyle, HighlighterTheme } from '@/plugins/codemirror/highlightStyles'
import { basicDarkHighlightStyle, basicDarkTheme } from 'cm6-theme-basic-dark'
import { basicLightHighlightStyle, basicLightTheme } from 'cm6-theme-basic-light'
import { solarizedDarkHighlightStyle, solarizedDarkTheme } from 'cm6-theme-solarized-dark'
import { solarizedLightHighlightStyle, solarizedLightTheme } from 'cm6-theme-solarized-light'
import { Extension } from '@codemirror/state'
import { syntaxHighlighting } from '@codemirror/language'

export type Themes =
    | 'basic-light'
    | 'basic-dark'
    | 'solarized-light'
    | 'solarized-dark'
    | 'bordered-light'
    | 'bordered-dark'

export interface EditorTheme {
    highlightStyle: Extension
    editorTheme: Extension
    cssClasses: { [key: string]: boolean }
}

export const EditorThemes: { [key in Themes]: EditorTheme } = {
    'bordered-light': {
        highlightStyle: syntaxHighlighting(basicLightHighlightStyle), //createHighlightStyle('light'),
        editorTheme: basicLightTheme,
        cssClasses: {
            'system-code-box': true,
        },
    },
    'bordered-dark': {
        highlightStyle: syntaxHighlighting(basicDarkHighlightStyle), //createHighlightStyle('dark'),
        editorTheme: basicDarkTheme,
        cssClasses: {
            'system-code-box-dark': true,
        },
    },
    'basic-light': {
        highlightStyle: syntaxHighlighting(basicLightHighlightStyle), //createHighlightStyle('light'),
        editorTheme: basicLightTheme,
        cssClasses: {},
    },
    'basic-dark': {
        highlightStyle: syntaxHighlighting(basicDarkHighlightStyle), //createHighlightStyle('dark'),
        editorTheme: basicDarkTheme,
        cssClasses: {},
    },
    'solarized-light': {
        highlightStyle: syntaxHighlighting(solarizedLightHighlightStyle),
        editorTheme: solarizedLightTheme,
        cssClasses: {},
    },
    'solarized-dark': {
        highlightStyle: syntaxHighlighting(solarizedDarkHighlightStyle),
        editorTheme: solarizedDarkTheme,
        cssClasses: {},
    },
}

export const DEFAULT_EDITOR_THEME: EditorTheme = EditorThemes['basic-light']
