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
import 'reflect-metadata'

//helper to reset the canvas area if needed
import { Prop, Watch } from 'vue-property-decorator'
import { Vue, Options} from 'vue-class-component'
import BaseBlock from '@/components/BaseBlock.vue'
import { BlockData, IMainBlock } from '@/lib/codeBlocksManager'
import { ICompilerID, ICompilerInstance } from '@/lib/ICompilerRegistry'
import Terminal from '@/components/Terminal.vue'
import BlockEvent from '@/lib/events'

@Options({ components: { Terminal } })
export default class CodeREPL extends BaseBlock {
    @Prop({ required: true }) eventHub!: BlockEvent
    @Prop({ required: true }) blockInfo!: IMainBlock
    @Prop({ required: true }) isReady!: boolean
    @Prop({ required: true }) canStop!: boolean
    @Prop({ required: true }) showGlobalMessages!: boolean
    @Prop({ required: true }) globalStateMessage!: string

    get hasContent(): boolean {
        return false
    }

    get isRunning(): boolean {
        return this.canStop
    }

    get canStartREPL(): boolean {
        return this.blockInfo.runCode && this.blockInfo.messagePassing && this.blockInfo.keepAlive
    }

    get allowsREPL(): boolean {
        const cmp = this.$compilerRegistry.getCompiler(this.compiler)
        if (cmp === undefined) {
            return false
        }
        return cmp.allowsREPL
    }

    get compiler(): ICompilerID {
        return this.blockInfo.compiler
    }

    get typeName() {
        let s = this.block.type.toLowerCase()
        if (this.block.hidden) {
            s += '-hidden'
        }
        if (this.block.static) {
            s += '-static'
        }
        return s
    }

    get readyWhenMounted() {
        return false
    }

    get terminal(): Vue {
        return this.$refs.terminal as Vue
    }

    emitRun() {
        this.$emit('run', this.block)
    }

    emitStop() {
        this.$emit('stop', this.block)
    }

    mounted() {
        if (this.eventHub) {
            this.eventHub.$on('all-mounted', this.whenMounted)
        } else {
            this.whenMounted()
        }

        const cmp = this.$compilerRegistry.getCompiler(this.compiler)
        this.waitReady(cmp)
    }

    beforeDestroy() {
        if (this.eventHub) {
            this.eventHub.$off('all-mounted')
        }
        this.whenBlockIsDestroyed()
    }

    waitReady(cmp: ICompilerInstance | undefined) {
        if (cmp === undefined || cmp.isReady) {
            this.whenBlockIsReady()
        } else {
            setTimeout(this.waitReady.bind(this, cmp), 500)
        }
    }

    whenMounted(): void {
        this.emitRun()
    }
}
</script>

<style></style>
