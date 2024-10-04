<template>
    <div class="vue-terminal-wrapper">
        <div id="terminal" ref="terminalElement" class="basicterm"></div>
    </div>
</template>

<script lang="ts" setup>
import jquery from 'jquery'
import terminal from 'jquery.terminal'
import 'jquery.terminal/css/jquery.terminal.css'

const $ = terminal(jquery, this)

import { PythonV102Compiler } from '@/compiler/python.v102'
import { ICompilerID } from '@/lib/ICompilerRegistry'
import { computed, ComputedRef, onBeforeUnmount, onMounted, onUnmounted, ref } from 'vue'
import compilerRegistry from '@/lib/CompilerRegistry'
import { EventHubType } from '@/composables/globalEvents'
import { BlockStorageType, useBlockStorage } from '@/storage/blockStorage'

function sleep(s) {
    return new Promise((resolve) => setTimeout(resolve, s))
}

interface Props {
    height?: string
    appID: number
    eventHub: EventHubType
}

const props = withDefaults(defineProps<Props>(), {
    height: '250px',
})
const blockStorage: BlockStorageType = useBlockStorage(props.appID)

const emit = defineEmits(['run', 'stop'])
let term: any = undefined

const compiler: ComputedRef<ICompilerID> = computed(() => {
    return blockStorage.appInfo.value.compiler
})

const welcomeMessage: ComputedRef<string> = computed(() => {
    const cmp = compilerRegistry.getCompiler(compiler.value)
    let language = ''
    if (cmp !== undefined) {
        language = cmp.language
    }
    return `{*_*} Interactive ${language} Shell\n------------------------------`
})

function emitRun() {
    if (term !== undefined) {
        clear()
    }
    emit('run')
}

function emitStop() {
    emit('stop')
}

function clear() {
    if (term !== undefined) {
        term.clear()
        term.echo(welcomeMessage.value)
    }
}

const terminalElement = ref<HTMLElement | null>(null)

onMounted(() => {
    const self = this
    const cmp = compilerRegistry.getCompiler(compiler.value) as PythonV102Compiler
    let ps1 = cmp.language === 'python' ? 'py> ' : '>>> ',
        ps2 = '... '

    async function lock() {
        let resolve
        let ready = term.ready
        term.ready = new Promise((res) => (resolve = res))
        await ready
        return resolve
    }

    async function interpreter(command) {
        let unlock = await lock()
        try {
            term.pause()

            for (const c of command.split('\n')) {
                try {
                    if (c === '.stop') {
                        emitStop()
                        return
                    }
                    if (c === '.restart') {
                        emitStop()
                        clear()
                        await sleep(1000)
                        emitRun()
                        return
                    }
                    if (c === '.clear') {
                        term.clear()
                        return
                    }
                    term.set_prompt(ps2)
                    await cmp.interpreter(
                        c,
                        (incomplete) => {
                            term.set_prompt(incomplete ? ps2 : ps1)
                        },
                        (msg) => {
                            term.echo(msg, { newline: false })
                        },
                        (err) => {
                            term.error(err)
                        }
                    )
                } catch (e) {
                    term.error(e)
                }
            }
        } finally {
            term.resume()
            await sleep(10)
            unlock()
        }
    }

    if (terminalElement.value === null) {
        console.error('Terminal element not found')
        return
    }

    const el = $(terminalElement.value)

    if (el.terminal === undefined) {
        console.error('jQuery terminal plugin not found')
        return
    }
    term = el.terminal(interpreter, {
        greetings: welcomeMessage.value,
        name: 'codeblocks_repl',
        height: props.height,
        prompt: ps1,
    })

    term.ready = Promise.resolve()

    if (props.eventHub) {
        props.eventHub.on('console-log', (msg) => term.echo(msg))
        props.eventHub.on('console-err', (msg) => term.error(msg))
        props.eventHub.on('clicked-run', () => clear())
    }
})

onUnmounted(() => {
    if (term !== undefined) {
        term.destroy()
    }
})
onBeforeUnmount(() => {
    if (props.eventHub) {
        props.eventHub.off('console-log')
        props.eventHub.off('console-err')
        props.eventHub.off('clicked-run')
    }
})
</script>

<style lang="css">
.terminal {
    --size: 1.5;
    border-radius: 0px 0px 4px 4px;
}

.visually-hidden {
    display: none;
}
</style>
