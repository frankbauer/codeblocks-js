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

<script lang="ts">
import TipTap from './TipTap.vue'
import { defineComponent, PropType } from 'vue'
import { useBasicBlockMounting } from '@/composables/basicBlock'
import { BlockData } from '@/lib/codeBlocksManager'

export default defineComponent({
    name: 'SimpleText',
    components: { TipTap },
    props: {
        value: { type: String, default: '' },
        name: { type: String, default: '' },
        scopeUUID: { type: String, default: '' },
        previewValue: { type: String, default: '' },
        language: { type: String, default: 'javascript' },
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
    },
    setup(props, context) {
        const { whenBlockIsReady, whenBlockIsDestroyed } = useBasicBlockMounting(
            true,
            props,
            context
        )

        let textUpdateTimer: number | null = null
        let textUpdateStartTime: number = 0

        function updatedContentDefered(newVal: string) {
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
            if (now - textUpdateStartTime > process.env.VUE_APP_CODE_BLOCK_MAX_TIMEOUT) {
                doIt()
                return
            }
            textUpdateTimer = setTimeout(() => {
                doIt()
            }, process.env.VUE_APP_CODE_BLOCK_TIMEOUT)
        }

        function updatedContent(v: string) {
            //console.log('Updating')
            //this.value = v
            context.emit('input', v)
        }

        return {
            whenBlockIsReady,
            whenBlockIsDestroyed,
            updatedContent,
            updatedContentDefered,
        }
    },
})
</script>

<style lang="sass" scoped></style>
