<template>
    <q-layout view="hHh lpR fFf" style="min-height: 0" class="codeblocks-app-page">
        <q-page-container>
            <CodeBlocksEditor :blockInfo="blocks" :event-hub="eventHub" />
        </q-page-container>
    </q-layout>
</template>

<script>
import { defineComponent } from 'vue'
import CodeBlocksEditor from './components/CodeBlocksEditor.vue'
import { createGlobalEvent } from '@/composables/globalEvents.ts'

export default defineComponent({
    name: 'AppEditor',
    props: ['blocks'],
    components: {
        CodeBlocksEditor,
    },
    setup(props, ctx) {
        console.log('AppEditor setup', props, ctx)
        const { eventHub } = createGlobalEvent()
        return { eventHub }
    },
})
</script>

<style lang="sass">
#app
    margin-bottom: 16px
    background-color: rgba(1, 1, 1, 0)
</style>
