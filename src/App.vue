<template>
    <q-layout view="hHh lpR fFf" style="min-height: 0">
        <q-page-container>
            <CodeBlocks :blockInfo="blocks" />
        </q-page-container>
    </q-layout>
</template>

<script>
import { defineComponent, toRefs } from 'vue'
import CodeBlocks from './components/CodeBlocks'

export default defineComponent({
    name: 'App',
    props: ['blocks'],
    components: {
        CodeBlocks,
    },
    setup(props, ctx) {
        const { blocks } = toRefs(props)
        return {}
    },
})
</script>

<style lang="sass">
#app
    margin-bottom: 16px
    background-color: rgba(1, 1, 1, 0)
</style>
