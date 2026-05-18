// Load library content from files in src/lib/playgroundLibraries/ at build time
const libraryModules = import.meta.glob('./playgroundLibraries/*.js', { as: 'raw', eager: true })

export interface EmbeddedLibraryDefinition {
    id: string
    nameKey: string // i18n key for the display name (e.g., 'EmbeddedLibraries.objectManager')
    content: string
}

export const CUSTOM_LIBRARY_ID = 'custom'

// Build library registry from loaded files
function buildLibraryRegistry(): EmbeddedLibraryDefinition[] {
    const libraries: EmbeddedLibraryDefinition[] = []

    for (const [path, content] of Object.entries(libraryModules)) {
        // Extract filename without extension and path
        const filename = path.split('/').pop() || ''
        const id = filename.replace('.js', '')

        if (typeof content === 'string') {
            libraries.push({
                id,
                nameKey: `EmbeddedLibraries.${id}`,
                content,
            })
        }
    }

    return libraries
}

export const EMBEDDED_LIBRARIES: EmbeddedLibraryDefinition[] = buildLibraryRegistry()

export function getEmbeddedLibraryDefinition(
    id: string | undefined | null
): EmbeddedLibraryDefinition | undefined {
    if (!id || id === CUSTOM_LIBRARY_ID) {
        return undefined
    }
    return EMBEDDED_LIBRARIES.find((lib) => lib.id === id)
}
