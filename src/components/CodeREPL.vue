<template>
    <div :class="`codeblock block-${typeName}`">
        <div
            v-if="allowsREPL && canStartREPL"
            class="row runnerState"
            id="stateBox"
            :data-question="blockInfo.id"
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
                :data-question="blockInfo.id"
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
                        :data-question="blockInfo.id"
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
            :blockInfo="blockInfo"
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

<script lang="ts">
import Vue, {
    defineComponent,
    toRefs,
    computed,
    onMounted,
    onBeforeUnmount,
    PropType,
    Ref,
    ref,
} from 'vue'
import { BlockData, IMainBlock } from '@/lib/codeBlocksManager'
import { ICompilerID, ICompilerInstance } from '@/lib/ICompilerRegistry'
import Terminal from '@/components/Terminal.vue'
import { getCurrentInstance } from 'vue'
import { useBasicBlockMounting } from '@/composables/basicBlock'
import { globalState } from '@/lib/globalState'
import compilerRegistry from '@/lib/CompilerRegistry'
import { EventHubType } from '@/composables/globalEvents'

export default defineComponent({
    name: 'CodeREPL',
    components: { Terminal },
    props: {
        eventHub: { required: true, type: Object as PropType<EventHubType> },
        blockInfo: { required: true, type: Object as PropType<IMainBlock> },
        isReady: { required: true, type: Boolean },
        canStop: { required: true, type: Boolean },
        showGlobalMessages: { required: true, type: Boolean },
        globalStateMessage: { required: true, type: String },
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
        visibleLines: {
            type: [Number, String] as PropType<number | 'auto'>,
            default: 'auto',
        },
        theme: {
            type: String,
            default: 'base16-dark',
        },
    },
    emits: ['run', 'stop'],
    setup(props, ctx) {
        const instance = getCurrentInstance()
        const q = instance?.proxy?.$root?.$q
        const t = instance?.proxy?.$root?.$t
        const l = instance?.proxy?.$root?.$l

        const { whenBlockIsReady, whenBlockIsDestroyed } = useBasicBlockMounting(true, props, ctx)
        const { eventHub, blockInfo, isReady, canStop, showGlobalMessages, globalStateMessage } =
            toRefs(props)
        const hasContent = computed((): boolean => {
            return false
        })
        const isRunning = computed((): boolean => {
            return canStop.value
        })
        const canStartREPL = computed((): boolean => {
            return (
                blockInfo.value.runCode &&
                blockInfo.value.messagePassing &&
                blockInfo.value.keepAlive
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
            return blockInfo.value.compiler
        })
        const typeName = computed(() => {
            let s = props.block.type.toLowerCase()
            if (props.block.hidden) {
                s += '-hidden'
            }
            if (props.block.static) {
                s += '-static'
            }
            return s
        })
        const readyWhenMounted = computed(() => {
            return false
        })
        const terminal: Ref<HTMLElement | null> = ref(null)
        const emitRun = () => {
            ctx.emit('run', props.block)
        }
        const emitStop = () => {
            ctx.emit('stop', props.block)
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
        return {
            hasContent,
            isRunning,
            canStartREPL,
            allowsREPL,
            compiler,
            typeName,
            readyWhenMounted,
            terminal,
            emitRun,
            emitStop,
            waitReady,
            whenMounted,
        }
    },
})
</script>

<style></style>
