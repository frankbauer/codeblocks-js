import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

export type HighlighterTheme = 'light' | 'dark'
const getThemeColors = (theme: HighlighterTheme) => {
    const themes = {
        light: {
            propertyColor: '#0550AE', // Darker blue
            stringColor: '#116329', // Dark green
            numberColor: '#CF222E', // Dark red
            keywordColor: '#8250DF', // Deep purple
            functionColor: '#6639BA', // Rich purple
            commentColor: '#6E7781', // Medium gray
            variableColor: '#24292F', // Near black
            typeColor: '#953800', // Brown
            operatorColor: '#CF222E', // Dark red
            punctuationColor: '#24292F', // Near black
            invalidColor: '#CF222E', // Error red
        },
        dark: {
            propertyColor: '#79B8FF', // Bright blue
            stringColor: '#85E89D', // Bright green
            numberColor: '#F97583', // Salmon red
            keywordColor: '#F692CE', // Pink
            functionColor: '#B392F0', // Light purple
            commentColor: '#959DA5', // Light gray
            variableColor: '#E1E4E8', // Off white
            typeColor: '#F8C555', // Orange
            operatorColor: '#F97583', // Salmon red
            punctuationColor: '#E1E4E8', // Off white
            invalidColor: '#FF5370', // Bright red
        },
    }

    return themes[theme]
}

export const createHighlightStyle = (theme: HighlighterTheme) => {
    const colors = getThemeColors(theme)

    const highlightStyle = HighlightStyle.define([
        // Base text
        { tag: t.content, color: colors.variableColor },
        { tag: t.variableName, color: colors.variableColor },
        { tag: t.propertyName, color: colors.propertyColor },

        // Literals
        { tag: t.string, color: colors.stringColor },
        { tag: t.number, color: colors.numberColor },
        { tag: t.bool, color: colors.numberColor },
        { tag: t.regexp, color: colors.stringColor },
        { tag: t.null, color: colors.numberColor },

        // Keywords & Control
        { tag: t.keyword, color: colors.keywordColor },
        { tag: t.definitionKeyword, color: colors.keywordColor },
        { tag: t.moduleKeyword, color: colors.keywordColor },
        { tag: t.controlKeyword, color: colors.keywordColor },
        { tag: t.operatorKeyword, color: colors.keywordColor },

        // Functions
        { tag: t.function(t.variableName), color: colors.functionColor },
        { tag: t.function(t.propertyName), color: colors.functionColor },
        { tag: t.angleBracket, color: colors.punctuationColor },

        // Comments
        { tag: t.comment, color: colors.commentColor, fontStyle: 'italic' },
        { tag: t.docComment, color: colors.commentColor, fontStyle: 'italic' },

        // Types
        { tag: t.typeName, color: colors.typeColor },
        { tag: t.typeOperator, color: colors.typeColor },
        { tag: t.className, color: colors.typeColor },
        { tag: t.namespace, color: colors.typeColor },

        // Operators & Punctuation
        { tag: t.operator, color: colors.operatorColor },
        { tag: t.punctuation, color: colors.punctuationColor },
        { tag: t.bracket, color: colors.punctuationColor },
        { tag: t.squareBracket, color: colors.punctuationColor },
        { tag: t.paren, color: colors.punctuationColor },
        { tag: t.brace, color: colors.punctuationColor },

        // Special highlights
        { tag: t.invalid, color: colors.invalidColor },
        { tag: t.meta, color: colors.punctuationColor },
        { tag: t.attributeName, color: colors.propertyColor },
        { tag: t.attributeValue, color: colors.stringColor },
    ])

    return syntaxHighlighting(highlightStyle)
}

// Usage example:
// import { EditorState } from '@codemirror/state'
// import { EditorView } from '@codemirror/view'
//
// const editor = new EditorView({
//   state: EditorState.create({
//     extensions: [
//       // ... other extensions
//       createHighlightStyle('dark') // or 'light'
//     ]
//   }),
//   parent: document.querySelector('#editor')
// });
