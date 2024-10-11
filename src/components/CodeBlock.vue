<template>
    <div :class="`codeblock block-${typeName}`">
        <textarea
            ref="codeBoxRaw"
            style="display: none"
            readonly
            v-model="block.content"
            :name="`${namePrefix}block[${block.parentID}][${block.id}]`"
            :id="`teQ${block.parentID}B${block.id}`"
            :data-question="block.parentID"
            :data-blocktype="iliasTypeNr"
            :is-editmode="editMode"
            :class="`accqstXmlInput noRTEditor`"
        ></textarea>
        <code-mirror
            ref="codeBox"
            :class="`accqstXmlInput noRTEditor codebox ${boxClass}`"
            :name="`${namePrefix}block[${block.parentID}][${block.id}]`"
            :id="`teQ${block.parentID}B${block.id}`"
            :data-question="block.parentID"
            :editorConfig="editorConfig"
            :extensions="editorExtensions"
            :readonly="editorReadOnly"
            :tab="true"
            :tab-size="4"
            :allow-multiple-selections="true"
            :theme="block.themeForCodeBlock"
            :language="mode"
            :first-line="block.firstLine"
            :read-only="editorReadOnly"
            :errors="block.errors"
            :model-value="code"
            :max-lines="totalLines"
            @update:modelValue="onCodeChangeDefered"
            @focus="onCodeFocus"
            @ready="onCodeReady"
        />
        <!--        <Codemirror-->
        <!--            ref="codeBox"-->
        <!--            :value="code"-->
        <!--            :options="options"-->
        <!--            :class="`accqstXmlInput noRTEditor codebox ${boxClass}`"-->
        <!--            @ready="onCodeReady"-->
        <!--            @focus="onCodeFocus"-->
        <!--            @input="onCodeChangeDefered"-->
        <!--            @input-read="onCodeKeyHandle"-->
        <!--            @keyup="onCodeKeyHandle"-->
        <!--            :original-style="true"-->
        <!--            :name="`${namePrefix}block[${block.parentID}][${block.id}]`"-->
        <!--            :id="`teQ${block.parentID}B${block.id}`"-->
        <!--            :data-question="block.parentID"-->
        <!--            :events="['keyup']"-->
        <!--        />-->

        <div v-show="hasAlternativeContent" v-if="editMode">
            <div class="q-mt-lg text-subtitle2 q-pb-xs">{{ $t('CodeBlock.Initial_Content') }}</div>
            <textarea
                ref="altBoxRaw"
                style="display: none"
                readonly
                v-model="block.altCode"
                :name="`${namePrefix}alt_block[${block.parentID}][${block.id}]`"
                :class="`accqstXmlInput noRTEditor`"
            ></textarea>
            <code-mirror
                ref="altBox"
                :class="`accqstXmlInput noRTEditor ${boxClass}`"
                :name="`${namePrefix}alt_block[${block.parentID}][${block.id}]`"
                :model-value="altCode"
                :editorConfig="editorConfigAlt"
                :extensions="editorExtensionsAlt"
                :readonly="editorReadOnly"
                :tab="false"
                :tab-size="4"
                :allow-multiple-selections="true"
                @update:modelValue="onAltCodeChangeDefered"
            />
            <!--            <Codemirror-->
            <!--                ref="altBox"-->
            <!--                :value="altCode"-->
            <!--                :options="altOptions"-->
            <!--                :class="`accqstXmlInput noRTEditor ${boxClass}`"-->
            <!--                :original-style="true"-->
            <!--                @ready="onAltCodeReady"-->
            <!--                @focus="onAltCodeFocus"-->
            <!--                @input="onAltCodeChangeDefered"-->
            <!--                :name="`${namePrefix}alt_block[${block.parentID}][${block.id}]`"-->
            <!--            />-->
        </div>
    </div>
</template>

<script lang="ts" setup>
import {
    toRefs,
    ref,
    computed,
    watch,
    onMounted,
    onBeforeUnmount,
    getCurrentInstance,
    Ref,
    nextTick,
} from 'vue'
import ErrorTip from './ErrorTip.vue'
import { IRandomizerSet } from '@/lib/ICodeBlocks'
import { ICompilerErrorDescription } from '@/lib/ICompilerRegistry'
import { BlockData } from '@/lib/codeBlocksManager'
import { ITagReplaceAction, tagger } from '@/plugins/tagger'
import CodeMirror from '@/components/CodeMirror.vue'
import { LanguageSupport } from '@codemirror/language'
import { lineNumbers } from '@codemirror/view'
import { cpp } from '@codemirror/lang-cpp'
import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { java } from '@codemirror/lang-java'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { python } from '@codemirror/lang-python'

import {
    DEFAULT_EDITABLE_BLOCK_PROPS,
    EditableBlockProps,
    useBasicBlockMounting,
} from '@/composables/basicBlock'
import { globalState } from '@/lib/globalState'
import { BlockStorageType, useBlockStorage } from '@/storage/blockStorage'

interface Props extends EditableBlockProps {
    namePrefix?: string
    emitWhenTypingInViewMode?: boolean
    readonly?: boolean
    mode?: string
    tagSet?: IRandomizerSet | undefined
}

const props = withDefaults(defineProps<Props>(), {
    ...DEFAULT_EDITABLE_BLOCK_PROPS,
    namePrefix: '',
    emitWhenTypingInViewMode: false,
    readonly: false,
    mode: 'text/javascript',
    tagSet: undefined,
})

const emit = defineEmits([
    'code-changed-in-edit-mode',
    'code-changed-in-view-mode',
    'build',
    'ready',
])

const instance = getCurrentInstance()
const q = instance?.proxy?.$root?.$q
const t = instance?.proxy?.$root?.$t

const blockStorage: BlockStorageType = useBlockStorage(props.appID)
const block = blockStorage.getBlock(props.blockID)
const { whenBlockIsReady, whenBlockIsDestroyed } = useBasicBlockMounting(
    true,
    props,
    blockStorage,
    (block) => emit('ready', block)
)

const {
    namePrefix,
    emitWhenTypingInViewMode,
    readonly,
    editMode,
    visibleLines,
    theme,
    mode,
    tagSet,
} = toRefs(props)

const totalLines = computed(() => {
    return blockStorage.appInfo.value.totalLines()
})
let codeUpdateTimer: any = null
const codeUpdateStartTime = ref<number>(0)
let continuousCodeUpdateTimer: any = null
const codeNeedsTagUpdate = ref<boolean>(true)
let altCodeUpdateTimer: any = null
const altCodeUpdateStartTime = ref<number>(0)

const codeBox: Ref<HTMLElement | null> = ref(null)
const altBox: Ref<HTMLElement | null> = ref(null)

const hasAlternativeContent = computed(() => {
    return block.value.hasAlternativeContent && typeName.value == 'block'
})
const errors = computed((): ICompilerErrorDescription[] => {
    return block.value.errors
})
const randomizerActive = computed(() => {
    return tagSet.value !== undefined
})
const boxClass = computed(() => {
    let cl = ''
    if (block.value.hidden && !editMode.value) {
        cl += 'hiddenBox '
    }
    if (block.value.readonly || readonly.value) {
        cl += 'readonlyBox '
    }
    if (block.value.static) {
        cl += 'staticBox '
    }
    return cl
})
const iliasTypeNr = computed(() => {
    const t = typeName.value
    if (t == 'text') {
        return 0
    }
    if (t == 'block-static') {
        return 1
    }
    if (t == 'block') {
        return 2
    }
    if (t == 'block-hidden') {
        return 3
    }
    if (t == 'playground') {
        return 4
    }
    if (t == 'blockly') {
        return 5
    }
    if (t == 'repl') {
        return 6
    }
    if (t == 'data') {
        return 7
    }
    return -1
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
const altCode = computed(() => {
    if (block.value.alternativeContent === null) {
        return ''
    }
    return block.value.alternativeContent
})
const code = computed({
    get: () => {
        if (!editMode.value) {
            return block.value.actualContent()
        }
        return block.value.content
    },
    set: (newCode) => {
        block.value.content = newCode
    },
})

const options = computed(() => {
    return {
        mode: mode.value,
        theme: theme.value,
        lineNumbers: true,
        line: true,
        tabSize: 4,
        indentUnit: 4,
        autoCloseBrackets: true,
        readOnly:
            !editMode.value &&
            (block.value.readonly || block.value.static || block.value.hidden || readonly.value),
        gutters: ['diagnostics', 'CodeMirror-linenumbers'],
    }
})
const editorLanguage = computed(() => {
    switch (mode.value) {
        case 'text/css':
            return css
        case 'text/html':
            return html
        case 'text/javascript':
            return javascript
        case 'text/json':
            return json
        case 'text/python':
            return python
        case 'text/x-java':
            return java
        case 'text/java':
            return java
        case 'text/cpp':
            return cpp
        default:
            return undefined
    }
})
const editorReadOnly = computed(() => {
    return (
        !editMode.value &&
        (block.value.readonly || block.value.static || block.value.hidden || readonly.value)
    )
})
const editorConfig = computed(() => ({}))

const editorExtensions = computed(() => {
    return [
        editorLanguage.value,
        lineNumbers({
            formatNumber: (n, state) => `${n + (block.value.firstLine - 1)}`,
        }),
    ]
})

const editorConfigAlt = computed(() => editorConfig.value)
const editorExtensionsAlt = computed(() => editorExtensions.value)
const altOptions = computed(() => {
    return options.value
})
const codemirror = computed((): any | undefined => {
    if (codeBox.value === null || codeBox.value === undefined) {
        return undefined
    }
    return (codeBox.value as any).codemirror
})

const altcodemirror = computed((): any | undefined => {
    if (altBox.value === undefined) {
        return undefined
    }
    return (altBox.value as any).codemirror
})
const readyWhenMounted = computed(() => {
    return false
})
const clearTagMarkers = () => {
    if (codemirror.value === undefined) {
        return
    }
    let allMarks = codemirror.value.getDoc().getAllMarks()
    allMarks.forEach((e) => {
        if (e.className == tagger.className.rnd || e.className == tagger.className.templ) {
            e.clear()
        }
    })
    if (altcodemirror.value) {
        allMarks = altcodemirror.value.getDoc().getAllMarks()
        allMarks.forEach((e) => {
            if (e.className == tagger.className.rnd || e.className == tagger.className.templ) {
                e.clear()
            }
        })
    }
}
const clearErrorDisplay = () => {
    if (codemirror.value === undefined) {
        return
    }
    let allMarks = codemirror.value.getDoc().getAllMarks()
    allMarks.forEach((e) => {
        if (e.className == 'red-wave') {
            e.clear()
        }
    })
    codemirror.value.getDoc().clearGutter('diagnostics')
}
const onCodeReady = (editor) => {
    if (
        codemirror.value &&
        codemirror.value.display &&
        codemirror.value.display.input &&
        codemirror.value.display.input.textarea
    ) {
        codemirror.value.display.input.textarea.className = 'noRTEditor'
    }
    const h = codeBox.value as any
    h!.$el.querySelectorAll('textarea[name]').forEach((el) => {
        el.className = (el.className + ' accqstXmlInput noRTEditor').trim()
        el.id = (codeBox.value as any)!.$el.id
        $(el).text(block.value.content)
        el.setAttribute('data-question', `${block.value.parentID}`)
        el.setAttribute('data-blocktype', `${iliasTypeNr.value}`)
        if (editMode.value) {
            el.setAttribute('is-editmode', `${editMode.value}`)
        }
    })
    updateDiagnosticDisplay()
    onCodeChange(block.value.content)
    whenBlockIsReady()
}
const onAltCodeReady = (editor) => {
    console.d('READY')
    if (
        altcodemirror.value &&
        altcodemirror.value.display &&
        altcodemirror.value.display.input &&
        altcodemirror.value.display.input.textarea
    ) {
        altcodemirror.value.display.input.textarea.className = 'noRTEditor'
    }
    const a = altBox.value as any
    a!.$el.querySelectorAll('textarea[name]').forEach((el) => {
        el.className = (el.className + ' accqstXmlInput noRTEditor').trim()
    })
    nextTick(() => {
        onAltCodeChange(block.value.alternativeContent)
        updateTagDisplay()
        updateHeight()
    })
}
const onCodeFocus = (editor) => {}
const onAltCodeFocus = (editor) => {}
const onCodeChangeDefered = (newCode) => {
    if (!editMode.value) {
        onCodeChange(newCode)
        return
    }
    const now = new Date().getTime()
    if (codeUpdateTimer !== null) {
        clearTimeout(codeUpdateTimer)
        codeUpdateTimer = null
    } else {
        codeUpdateStartTime.value = now
    }
    const doIt = () => {
        codeUpdateTimer = null
        onCodeChange(newCode)
    }
    if (now - codeUpdateStartTime.value > globalState.VUE_APP_CODE_BLOCK_MAX_TIMEOUT) {
        doIt()
        return
    }
    codeUpdateTimer = setTimeout(() => {
        doIt()
    }, globalState.VUE_APP_CODE_BLOCK_TIMEOUT)
}
const onCodeChange = (newCode) => {
    if (codeBox.value === null || codeBox.value === undefined) {
        return
    }

    block.value.lineCountHint = codeBox.value.lineCount()
    block.value.content = newCode
    updateTagDisplay()
    if (editMode.value) {
        emit('code-changed-in-edit-mode', undefined)
    } else if (emitWhenTypingInViewMode.value) {
        if (continuousCodeUpdateTimer !== null) {
            clearTimeout(continuousCodeUpdateTimer)
            continuousCodeUpdateTimer = null
        }
        continuousCodeUpdateTimer = setTimeout(() => {
            emit('code-changed-in-view-mode', undefined)
        }, globalState.VUE_APP_CODE_BLOCK_TIMEOUT)
    }
}
const didAddText = (t: string): void => {
    if (
        t.indexOf('!') >= 0 ||
        t.indexOf(':') >= 0 ||
        t.indexOf('+') >= 0 ||
        t.indexOf('{') >= 0 ||
        t.indexOf('}') >= 0 ||
        t.indexOf('\n') >= 0
    ) {
        console.log("TAGGER: '" + t + "' needs update")
        codeNeedsTagUpdate.value = true
    }
}
const onCodeKeyHandle = (e, kEvent?: any) => {
    if (kEvent !== undefined) {
        if (kEvent.text !== undefined) {
            kEvent.text.forEach((t) => {
                didAddText(t)
            })
        } else if (kEvent.key !== undefined) {
            if (kEvent.keyCode === 13) {
                didAddText('\n')
            } else {
                didAddText(kEvent.key)
            }
        }
    }
}
const onAltCodeChangeDefered = (newCode) => {
    const now = new Date().getTime()
    if (altCodeUpdateTimer.value !== null) {
        clearTimeout(altCodeUpdateTimer.value)
        altCodeUpdateTimer.value = null
    } else {
        altCodeUpdateStartTime.value = now
    }
    const doIt = () => {
        altCodeUpdateTimer.value = null
        onAltCodeChange(newCode)
    }
    if (now - altCodeUpdateStartTime.value > globalState.VUE_APP_CODE_BLOCK_MAX_TIMEOUT) {
        doIt()
        return
    }
    altCodeUpdateTimer = setTimeout(() => {
        doIt()
    }, globalState.VUE_APP_CODE_BLOCK_TIMEOUT)
}
const onAltCodeChange = (newCode) => {
    if (altBox.value !== undefined && altBox.value !== null) {
        const tb = (altBox.value as any).$el.querySelector('textarea[name]') as HTMLTextAreaElement
        tb.value = newCode
    }
    block.value.alternativeContent = newCode
    updateTagDisplay()
}
const updateHeight = () => {
    if (visibleLines.value === 'auto' || block.value.static) {
        if (codemirror.value) {
            codemirror.value.setSize('height', 'auto')
        }
        if (altcodemirror.value) {
            altcodemirror.value.setSize('height', 'auto')
        }
    } else {
        if (codemirror.value) {
            codemirror.value.setSize(null, Math.round(20 * Math.max(1, visibleLines.value)) + 9)
        }
        if (altcodemirror.value) {
            altcodemirror.value.setSize(null, Math.round(20 * Math.max(1, visibleLines.value)) + 9)
        }
    }
}
const replaceTemplateTags = (o: ITagReplaceAction) => {
    if (!editMode.value) {
        return
    }
    if (o.scopeUUID != block.value.scopeUUID) {
        return
    }
    block.value.content = tagger.replaceTemplateTagInString(block.value.content, o.name, o.newValue)
}
const updateTagDisplay = () => {
    if (
        !editMode.value ||
        block.value === undefined ||
        block.value.appSettings === undefined ||
        block.value.appSettings.randomizer === undefined ||
        !block.value.appSettings.randomizer.active ||
        !codeNeedsTagUpdate.value
    ) {
        return
    }
    codeNeedsTagUpdate.value = false
    clearTagMarkers()
    tagger.getMarkers(block.value.content).forEach((m) => {
        codemirror.value.getDoc().markText(m.start, m.end, {
            className: tagger.className[m.type],
            inclusiveLeft: true,
            inclusiveRight: true,
            title: m.name,
            startStyle: 'tag-mark-start',
            endStyle: 'tag-mark-end',
        })
    })
    nextTick(() => {
        tagger.hookClick((codeBox.value as any).$el, block.value.scopeUUID)
    })
    if (altcodemirror.value) {
        tagger.getMarkers(block.value.alternativeContent).forEach((m) => {
            altcodemirror.value.getDoc().markText(m.start, m.end, {
                className: tagger.className[m.type],
                inclusiveLeft: true,
                inclusiveRight: true,
                title: m.name,
                startStyle: 'tag-mark-start',
                endStyle: 'tag-mark-end',
            })
        })
        nextTick(() => {
            if (altBox.value !== undefined && altBox.value !== null) {
                tagger.hookClick((altBox.value as any).$el, block.value.scopeUUID)
            }
        })
    }
}
const updateDiagnosticDisplay = () => {
    const val = errors.value
    if (val !== undefined) {
        clearErrorDisplay()
        const first = block.value.firstLine
        val.forEach((error) => {
            if (error.start.column >= 0) {
                codemirror.value.getDoc().markText(
                    { line: error.start.line - first, ch: error.start.column },
                    { line: error.end.line - first, ch: error.end.column },
                    {
                        className: 'red-wave',
                        inclusiveLeft: true,
                        inclusiveRight: true,
                        title: error.message,
                    }
                )
            }
            let info = codemirror.value.getDoc().lineInfo(error.start.line - first)
            let element =
                info && info.gutterMarkers ? info.gutterMarkers['diagnostics'].$component : null
            if (element == null) {
                element = document.createElement('span')
                codemirror.value
                    .getDoc()
                    .setGutterMarker(error.start.line - first, 'diagnostics', element)
                // element.$component = new ErrorTipCtor({
                //     propsData: {
                //         errors: [],
                //         severity: error.severity,
                //     },
                // }).$mount(element)
                // element = element.$component
            }
            element.severity = Math.max(error.severity, element.severity)
            if (element.errors.indexOf(error) == -1) {
                element.errors.push(error)
            }
        })
    } else {
        clearErrorDisplay()
    }
}
const onFirstLineChanged = (val) => {
    if (codemirror.value) {
        if (codemirror.value.options.firstLineNumber != block.value.firstLine) {
            codemirror.value.options.firstLineNumber = block.value.firstLine
            codemirror.value.refresh()
        }
    }
}
const onVisibleLinesChanged = (val) => {
    updateHeight()
}
const onErrorsChanged = (val) => {
    updateDiagnosticDisplay()
}

const firstLine = computed(() => {
    return block.value.firstLine
})

watch(firstLine, onFirstLineChanged)
watch(visibleLines, onVisibleLinesChanged)
watch(errors, onErrorsChanged)
;(() => {
    console.d('ReadyWhenMounted in CodeBlock', readyWhenMounted.value)
})()
onMounted(() => {
    updateHeight()
    if (editMode.value && codemirror.value) {
        console.d('Attach')
        const buildIt = () => {
            console.log('EMIT')
            emit('build')
        }
        codemirror.value.addKeyMap({
            'Cmd-B': function (cMirror) {
                buildIt()
            },
            'Ctrl-B': function (cMirror) {
                buildIt()
            },
        })
        codemirror.value.addKeyMap({
            Tab: function (cMirror) {
                cMirror.execCommand('insertSoftTab')
            },
        })
    }
    tagger.onReplaceTemplateTag(replaceTemplateTags)
    codeNeedsTagUpdate.value = true
    updateTagDisplay()
})
onBeforeUnmount(() => {
    tagger.offReplaceTemplateTag(replaceTemplateTags)
})
</script>
<style scoped lang="sass">
.hiddenBox
    display: none !important

.staticBox
    opacity: 0.8
    filter: grayscale(20%)
</style>
