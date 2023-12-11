<template>
    <q-layout view="hHh lpR fFf" style="min-height: 0">
        <q-page-container>
            <CodeBlocksEditor :blockInfo="blocks" :event-hub="eventHub" />
        </q-page-container>
    </q-layout>
</template>

<script>
import { defineComponent, toRefs } from 'vue'
import CodeBlocksEditor from './components/CodeBlocksEditor'
import { createGlobalEvent } from '@/composables/globalEvents'

export default defineComponent({
    name: 'AppEditor',
    props: ['blocks'],
    components: {
        CodeBlocksEditor,
    },
    setup(props, ctx) {
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
