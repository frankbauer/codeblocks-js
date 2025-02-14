import { createHighlightStyle, HighlighterTheme } from '@/plugins/codemirror/highlightStyles'
import { basicDarkTheme } from 'cm6-theme-basic-dark'
import { basicLightTheme } from 'cm6-theme-basic-light'
import { solarizedDarkHighlightStyle, solarizedDarkTheme } from 'cm6-theme-solarized-dark'
import { solarizedLightHighlightStyle, solarizedLightTheme } from 'cm6-theme-solarized-light'
import { Extension } from '@codemirror/state'
import { syntaxHighlighting } from '@codemirror/language'

export type Themes = 'basic-light' | 'basic-dark' | 'solarized-light' | 'solarized-dark'

export interface EditorTheme {
    highlightStyle: Extension
    editorTheme: Extension
}

export const EditorThemes: { [key in Themes]: EditorTheme } = {
    'basic-light': {
        highlightStyle: createHighlightStyle('light'),
        editorTheme: basicLightTheme,
    },
    'basic-dark': {
        highlightStyle: createHighlightStyle('dark'),
        editorTheme: basicDarkTheme,
    },
    'solarized-light': {
        highlightStyle: syntaxHighlighting(solarizedLightHighlightStyle),
        editorTheme: solarizedLightTheme,
    },
    'solarized-dark': {
        highlightStyle: syntaxHighlighting(solarizedDarkHighlightStyle),
        editorTheme: solarizedDarkTheme,
    },
}

export const DEFAULT_EDITOR_THEME = EditorThemes['basic-light']
