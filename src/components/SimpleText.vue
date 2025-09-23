<template>
    <div>
        <div v-if="!editMode" v-html="previewValue" v-highlight="language"></div>
        <TipTap
            v-else
            :value="value"
            class="editor tw-my-3"
            :name="name"
            :language="language"
            :scopUUID="scopeUUID"
            :editMode="editMode"
            :appID="props.appID"
            :blockID="props.blockID"
            :block="block"
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
</script>

<style lang="sass" scoped></style>
