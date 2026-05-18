import { ref, computed, type Ref } from 'vue'
import type { BlockData } from '@/lib/codeBlocksManager'
import type { IRandomizerSet } from '@/lib/ICodeBlocks'

export interface CodeSplitSegment {
    before: string
    after: string
    offset: number
}

export interface CodeSplit {
    parts: string[]
    partIndex: Map<string, number>
}

export function useCodeEditor(
    block: Ref<BlockData>,
    editMode: Ref<boolean>,
    readonly: Ref<boolean>
) {
    const isEmbeddedLibrary = computed(
        () => block.value.type === 'LIBRARY' && (block.value as any).isEmbeddedLibrary
    )

    const boxClass = computed(() => {
        const classes: string[] = []
        if (block.value.hidden && !editMode.value) {
            classes.push('hiddenBox')
        } else if (block.value.hidden && editMode.value) {
            classes.push('hiddenBoxEdit')
        }
        if (block.value.readonly || readonly.value) {
            classes.push('readonlyBox')
        }
        if (block.value.static) {
            classes.push('staticBox')
        }
        return classes.join(' ')
    })

    const editorReadOnly = computed(
        () =>
            readonly.value ||
            (editMode.value
                ? isEmbeddedLibrary.value
                : block.value.readonly || block.value.static || block.value.hidden)
    )

    const code = computed({
        get: () =>
            editMode.value && !isEmbeddedLibrary.value
                ? block.value.content
                : block.value.actualContent(),
        set: (newCode) => {
            if (isEmbeddedLibrary.value) {
                return
            }
            block.value.content = newCode
        },
    })

    return {
        boxClass,
        editorReadOnly,
        code,
    }
}
