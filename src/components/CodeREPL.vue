<template>
    <div :class="`codeblock block-${typeName}`">
        <Terminal
            console-sign="$"
            allow-arbitrary
            height="500px"
            @command="onCommand"
            :blockInfo="blockInfo"
        ></Terminal>
    </div>
</template>

<script lang="ts">
import 'reflect-metadata'

//helper to reset the canvas area if needed
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import BaseBlock from '@/components/BaseBlock.vue'
import { BlockData, IMainBlock } from '@/lib/codeBlocksManager'
import { ICompilerID, ICompilerInstance } from '@/lib/ICompilerRegistry'
import Terminal from '@/components/Terminal.vue'

@Component({ components: { Terminal } })
export default class CodeREPL extends BaseBlock {
    @Prop({ required: true }) eventHub!: Vue
    @Prop({ required: true }) blockInfo!: IMainBlock
    @Prop({ default: 'auto' }) visibleLines!: number | 'auto'
    @Prop({ default: 'base16-dark' }) theme!: string
    @Prop({ default: 'text/python' }) mode!: string

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

    get options() {
        return {
            // codemirror options
            mode: this.mode,
            theme: this.theme,
            lineNumbers: false,
            line: true,
            tabSize: 4,
            indentUnit: 4,
            autoCloseBrackets: true,
            readOnly: false,
            gutters: ['diagnostics', 'CodeMirror-linenumbers'],
        }
    }

    get readyWhenMounted() {
        return false
    }

    get terminal(): Vue {
        return this.$refs.terminal as Vue
    }

    onCommand(data, resolve, reject) {
        // typed command is available in data.text
        // don't forget to resolve or reject the Promise
        setTimeout(() => {
            resolve('')
        }, 300)
    }

    emitRun() {
        this.$emit('run', this.block)
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
