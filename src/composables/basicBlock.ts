import { onBeforeUnmount, onMounted, onUnmounted, PropType } from 'vue'
import { BlockData } from '@/lib/codeBlocksManager'

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

export function useBasicBlockMounting(readyWhenMounted: boolean, props, context) {
    function whenBlockIsReady() {
        if (props.muteReadyState) {
            return
        }
        props.block.readyCount++
        context.emit('ready', props.block)
    }

    function whenBlockIsDestroyed() {
        if (props.muteReadyState) {
            return
        }
        props.block.readyCount--
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
