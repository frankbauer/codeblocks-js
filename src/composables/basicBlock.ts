import { onBeforeUnmount, onMounted, onUnmounted, PropType } from 'vue'
import { BlockData } from '@/lib/codeBlocksManager'
import { BlockStorageType } from '@/storage/blockStorage'

interface OptionalBasicBlockProps {
    muteReadyState?: boolean
}

export interface BasicBlockProps extends OptionalBasicBlockProps {
    appID: number
    blockID: string
}

export const DEFAULT_BASIC_BLOCK_PROPS: OptionalBasicBlockProps = {
    muteReadyState: false,
}

export type VisibleLinesType = number | 'auto'

interface OptionalEditableBlockProps extends OptionalBasicBlockProps {
    editMode?: boolean
    visibleLines?: VisibleLinesType
    theme?: string
}

export interface EditableBlockProps extends BasicBlockProps, OptionalEditableBlockProps {}

export const DEFAULT_EDITABLE_BLOCK_PROPS: OptionalEditableBlockProps = {
    muteReadyState: false,
    editMode: false,
    visibleLines: 'auto',
    theme: 'base16-dark',
}

export const useBasicBlockProps = () => {
    const basicBlockProps = {
        muteReadyState: {
            type: Boolean,
            default: false,
        },
        block: {
            type: Object as PropType<BlockData>,
            required: true,
        },
    }

    return {
        basicBlockProps,
    }
}

export const useEditableBlockProps = () => {
    const editableBlockProps = {
        muteReadyState: {
            type: Boolean,
            default: false,
        },
        block: {
            type: Object as PropType<BlockData>,
            required: true,
        },
        editMode: {
            type: Boolean,
            default: false,
        },
        visibleLines: {
            type: [Number, String] as PropType<number | 'auto'>,
            default: 'auto',
        },
        theme: {
            type: String,
            default: 'base16-dark',
        },
    }

    return {
        editableBlockProps,
    }
}

export function useBasicBlockMounting(
    readyWhenMounted: boolean,
    props,
    blockStorage: BlockStorageType,
    onReady: (block: BlockData) => void
) {
    const block = blockStorage.getBlock(props.blockID)

    function whenBlockIsReady() {
        if (props.muteReadyState) {
            return
        }

        if (block.value !== undefined) {
            block.value.readyCount++
            onReady(block.value as BlockData)
        }
    }

    function whenBlockIsDestroyed() {
        if (props.muteReadyState) {
            return
        }
        block.value.readyCount--
    }

    onMounted(() => {
        if (readyWhenMounted) {
            whenBlockIsReady()
        }
    })

    onBeforeUnmount(() => {
        whenBlockIsDestroyed()
    })

    return {
        whenBlockIsReady,
        whenBlockIsDestroyed,
    }
}
