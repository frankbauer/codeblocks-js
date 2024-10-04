<template>
    <div>
        <div v-if="!editMode" v-html="previewValue" v-highlight="language"></div>
        <TipTap
            v-else
            :value="value"
            @input="updatedContentDefered"
            class="editor q-my-3"
            :name="name"
            :language="language"
            :scopUUID="scopeUUID"
            :editMode="editMode"
        />
    </div>
</template>

<script lang="ts" setup>
import TipTap from './TipTap.vue'
import { computed } from 'vue'
import {
    DEFAULT_EDITABLE_BLOCK_PROPS,
    EditableBlockProps,
    useBasicBlockMounting,
} from '@/composables/basicBlock'
import { globalState } from '@/lib/globalState'
import { BlockStorageType, useBlockStorage } from '@/storage/blockStorage'

interface Props extends EditableBlockProps {
    name?: string
    scopeUUID?: string
    language?: string
}

const props = withDefaults(defineProps<Props>(), {
    ...DEFAULT_EDITABLE_BLOCK_PROPS,
    name: '',
    scopeUUID: '',
    language: 'javascript',
})

const emit = defineEmits(['ready'])
const blockStorage: BlockStorageType = useBlockStorage(props.appID)
const block = blockStorage.getBlock(props.blockID)
const value = computed({
    get: () => block.value.content,
    set: (v: string) => {
        block.value.content = v
    },
})
const previewValue = computed(() => {
    return block.value.actualContent()
})
const { whenBlockIsReady, whenBlockIsDestroyed } = useBasicBlockMounting(
    true,
    props,
    blockStorage,
    (block) => emit('ready', block)
)
let textUpdateTimer: any | null = null
let textUpdateStartTime: any = 0

function updatedContentDefered(newVal: InputEvent) {
    if (!props.editMode) {
        updatedContent(newVal)
        return
    }

    const now = new Date().getTime()

    //clear an existing update timeout
    if (textUpdateTimer !== null) {
        clearTimeout(textUpdateTimer)
        textUpdateTimer = null
    } else {
        textUpdateStartTime = now
    }

    const doIt = () => {
        textUpdateTimer = null
        updatedContent(newVal)
    }

    //did we wait for a maximum time? run
    if (now - textUpdateStartTime > globalState.VUE_APP_CODE_BLOCK_MAX_TIMEOUT) {
        doIt()
        return
    }
    textUpdateTimer = setTimeout(() => {
        doIt()
    }, globalState.VUE_APP_CODE_BLOCK_TIMEOUT)
}

function updatedContent(v: InputEvent) {
    if (v.target === undefined || v.target === null) {
        return
    }
    //this.value = v
    block.value.content = v.target.value
}
</script>

<style lang="sass" scoped></style>
