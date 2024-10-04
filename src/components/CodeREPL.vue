<template>
    <div :class="`codeblock block-${typeName}`">
        <div
            v-if="allowsREPL && canStartREPL"
            class="row runnerState"
            id="stateBox"
            :data-question="appID"
        >
            <q-btn
                v-show="!isRunning"
                id="allow_run_button"
                :loading="!isReady"
                :disabled="!isReady"
                color="primary"
                class="white--text q-pr-sm"
                @click="emitRun"
                :ripple="{ center: true }"
                style="border-radius: 0px"
                :data-question="appID"
            >
                {{ $t('CodeBlocks.start') }}
                <q-icon right dark name="play_arrow"></q-icon>
            </q-btn>
            <div class="animated fadeIn"></div>
            <transition
                appear
                enter-active-class="animated fadeIn"
                leave-active-class="animated fadeOut"
            >
                <div class="q-pl-0" v-show="canStop">
                    <q-btn
                        id="cancel_button"
                        color="negative"
                        :ripple="{ center: true }"
                        style="border-radius: 0px"
                        :data-question="appID"
                        @click="emitStop"
                    >
                        {{ $t('CodeBlocks.stop') }}
                        <q-icon right dark name="stop"></q-icon>
                    </q-btn>
                </div>
            </transition>
            <transition
                appear
                enter-active-class="animated fadeIn"
                leave-active-class="animated fadeOut"
            >
                <div
                    class="globalState col-grow"
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
            <div class="q-mt-md" v-if="!isRunning">
                <q-banner class="bg-warning" inline-actions>
                    Interpreter is not yet Ready. You may need to start it first.
                    <template v-slot:action>
                        <q-btn flat color="white" @click="emitRun" v-if="isReady && !canStop">
                            {{ $t('CodeBlocks.start') }}
                            <q-icon right dark name="play_arrow"></q-icon>
                        </q-btn>
                    </template>
                </q-banner>
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

        <div class="q-mt-md" v-if="!allowsREPL">
            The current language does not support a REPL-Element
        </div>
        <div class="q-mt-md" v-if="!canStartREPL">
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
