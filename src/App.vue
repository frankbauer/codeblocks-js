<template>
    <q-layout view="hHh lpR fFf" style="min-height: 0" class="codeblocks-app-page">
        <q-page-container>
            <CodeBlocks :blockInfo="blocks" :event-hub="eventHub" :appID="appID" />
        </q-page-container>
    </q-layout>
</template>

<script setup lang="ts">
import { toRefs } from 'vue'
import CodeBlocksEditor from './components/CodeBlocksEditor.vue'
import { createGlobalEvent } from '@/composables/globalEvents'
import { defineProps } from 'vue'
import { AppContext, IMainBlock } from '@/lib/codeBlocksManager'
import { useBlockStorage } from '@/storage/blockStorage'

// Define props
const props = defineProps<AppContext>()
const { appID } = toRefs(props)
const blockStorage = useBlockStorage(appID.value)
const blocks = blockStorage.appInfo

// Use the composable for global events
const { eventHub } = createGlobalEvent()

console.log('App setup', props, blocks.value)
</script>

<style lang="sass">
#app
    margin-bottom: 16px
    background-color: rgba(1, 1, 1, 0)
</style>
