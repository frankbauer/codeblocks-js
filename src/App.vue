<template>
    <div class="tw-min-h-0 codeblocks-app-page tw-flex tw-flex-col">
        <main class="tw-flex-1 tw-p-0">
            <CodeBlocks :blockInfo="blocks" :event-hub="eventHub" :appID="appID" />
        </main>
    </div>
</template>

<script setup lang="ts">
import { toRefs } from 'vue'
import CodeBlocks from './components/CodeBlocks.vue'
import { createGlobalEvent } from '@/composables/globalEvents'
import { AppContext } from '@/lib/codeBlocksManager'
import { useBlockStorage } from '@/storage/blockStorage'

const props = defineProps<AppContext>()
const { appID } = toRefs(props)
const blockStorage = useBlockStorage(appID.value)
const blocks = blockStorage.appInfo

const { eventHub } = createGlobalEvent()

console.log('App setup', props, blocks.value)
</script>

<style lang="sass">
.codeblocks-app-page
    @apply tw-mb-4 tw-bg-transparent
</style>
