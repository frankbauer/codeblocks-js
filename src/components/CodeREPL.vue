<template>
    <div :class="`codeblock block-${typeName}`">
        <div
            v-if="allowsREPL && canStartREPL"
            class="tw-flex tw-items-center runnerState"
            id="stateBox"
            :data-question="appID"
        >
            <CButton
                v-show="!isRunning"
                id="allow_run_button"
                :loading="!isReady"
                :disabled="!isReady"
                @click="emitRun"
                :data-question="appID"
                class="tw-rounded-none"
                :icon="Play"
                fill="white"
            >
                {{ $t('CodeBlocks.start') }}
            </CButton>
            <transition
                appear
                enter-active-class="animated fadeIn"
                leave-active-class="animated fadeOut"
            >
                <div class="tw-pl-0" v-show="canStop">
                    <CButton
                        id="cancel_button"
                        variant="destructive"
                        :data-question="appID"
                        class="tw-rounded-none"
                        @click="emitStop"
                        :icon="Square"
                        fill="white"
                    >
                        {{ $t('CodeBlocks.stop') }}
                    </CButton>
                </div>
            </transition>
            <transition
                appear
                enter-active-class="animated fadeIn"
                leave-active-class="animated fadeOut"
            >
                <div
                    class="tw-flex-grow globalState"
                    style="align-self: center"
                    v-show="showGlobalMessages"
                >
                    <div id="message" v-html="globalStateMessage"></div>
                </div>
            </transition>
        </div>
        <transition
            appear
            enter-active-class="animated fadeInup"
            leave-active-class="animated fadeOutDown"
        >
            <div class="tw-mt-4" v-if="!isRunning">
                <Alert
                    variant="destructive"
                    class="tw-flex tw-justify-between tw-items-center tw-bg-yellow-100 tw-text-yellow-600"
                >
                    <AlertDescription>
                        Interpreter is not yet Ready. You may need to start it first.
                    </AlertDescription>
                    <CButton
                        variant="outline"
                        @click="emitRun"
                        v-if="isReady && !canStop"
                        :icon="Play"
                    >
                        {{ $t('CodeBlocks.start') }}
                    </CButton>
                </Alert>
            </div>
        </transition>
        <Terminal
            v-show="allowsREPL && canStartREPL"
            console-sign="$"
            allow-arbitrary
            height="500px"
            :appID="appID"
            :eventHub="eventHub"
            @run="emitRun"
            @stop="emitStop"
        ></Terminal>

        <div class="tw-mt-4" v-if="!allowsREPL">
            The current language does not support a REPL-Element
        </div>
        <div class="tw-mt-4" v-if="!canStartREPL">
            Unable to start REPL-Environment. (Code execution, message passing and keep-alive need
            to be enabled)
        </div>
    </div>
</template>

<script lang="ts" setup>
import {
    defineComponent,
    toRefs,
    computed,
    onMounted,
    onBeforeUnmount,
    PropType,
    Ref,
    ref,
} from 'vue'
import { ICompilerID, ICompilerInstance } from '@/lib/ICompilerRegistry'
import Terminal from '@/components/Terminal.vue'
import { getCurrentInstance } from 'vue'
import {
    DEFAULT_EDITABLE_BLOCK_PROPS,
    EditableBlockProps,
    useBasicBlockMounting,
} from '@/composables/basicBlock'
import { globalState } from '@/lib/globalState'
import compilerRegistry from '@/lib/CompilerRegistry'
import { EventHubType } from '@/composables/globalEvents'
import { IRandomizerSet } from '@/lib/ICodeBlocks'
import { BlockStorageType, useBlockStorage } from '@/storage/blockStorage'
import { Alert, AlertDescription } from '@/shadcn/ui/alert'
import { Play, Square } from 'lucide-vue-next'
import CButton from '@/components/ui/CButton.vue'

interface Props extends EditableBlockProps {
    eventHub: EventHubType
    isReady: boolean
    canStop: boolean
    showGlobalMessages: boolean
    globalStateMessage: string
}

const props = withDefaults(defineProps<Props>(), {
    ...DEFAULT_EDITABLE_BLOCK_PROPS,
})
const instance = getCurrentInstance()
const q = instance?.proxy?.$root?.$q
const t = instance?.proxy?.$root?.$t

const emit = defineEmits(['run', 'stop', 'ready'])
const blockStorage: BlockStorageType = useBlockStorage(props.appID)
const block = blockStorage.getBlock(props.blockID)
const { whenBlockIsReady, whenBlockIsDestroyed } = useBasicBlockMounting(
    true,
    props,
    blockStorage,
    (block) => emit('ready', block)
)

const { eventHub, isReady, canStop, showGlobalMessages, globalStateMessage } = toRefs(props)
const hasContent = computed((): boolean => {
    return false
})
const isRunning = computed((): boolean => {
    return canStop.value
})
const canStartREPL = computed((): boolean => {
    return (
        blockStorage.appInfo.value.runCode &&
        blockStorage.appInfo.value.messagePassing &&
        blockStorage.appInfo.value.keepAlive
    )
})
const allowsREPL = computed((): boolean => {
    const cmp = compilerRegistry.getCompiler(compiler.value)
    if (cmp === undefined) {
        return false
    }
    return cmp.allowsREPL
})
const compiler = computed((): ICompilerID => {
    return blockStorage.appInfo.value.compiler
})
const typeName = computed(() => {
    let s = block.value.type.toLowerCase()
    if (block.value.hidden) {
        s += '-hidden'
    }
    if (block.value.static) {
        s += '-static'
    }
    return s
})
const readyWhenMounted = computed(() => {
    return false
})
const terminal: Ref<HTMLElement | null> = ref(null)
const emitRun = () => {
    emit('run', block.value)
}
const emitStop = () => {
    emit('stop', block.value)
}
const waitReady = (cmp: ICompilerInstance | undefined) => {
    if (cmp === undefined || cmp.isReady) {
        whenBlockIsReady()
    } else {
        setTimeout(waitReady.bind(this, cmp), 500)
    }
}
const whenMounted = (): void => {
    emitRun()
}
onMounted(() => {
    if (eventHub.value) {
        eventHub.value.on('all-mounted', whenMounted)
    } else {
        whenMounted()
    }
    const cmp = compilerRegistry.getCompiler(compiler.value)
    waitReady(cmp)
})
onBeforeUnmount(() => {
    if (eventHub.value) {
        eventHub.value.off('all-mounted')
    }
    whenBlockIsDestroyed()
})
</script>

<style></style>
