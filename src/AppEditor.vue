<template>
    <q-layout view="hHh lpR fFf" style="min-height: 0" class="codeblocks-app-page">
        <q-page-container>
            <CodeBlocksEditor :blockInfo="blocks" :event-hub="eventHub" />
        </q-page-container>
    </q-layout>
</template>

<script setup lang="ts">
import { toRefs } from 'vue'
import CodeBlocksEditor from './components/CodeBlocksEditor.vue'
import { createGlobalEvent } from '@/composables/globalEvents'
import { defineProps } from 'vue'
import { AppContext, IMainBlock } from '@/lib/codeBlocksManager'

// Define props
const props = defineProps<AppContext>()
const { blocks } = toRefs(props)

// Use the composable for global events
const { eventHub } = createGlobalEvent()

console.log('AppEditor setup', props, blocks.value)
</script>

<style lang="sass">
#app
    margin-bottom: 16px
    background-color: rgba(1, 1, 1, 0)
</style>
