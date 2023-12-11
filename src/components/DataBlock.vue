<template>
    <div v-if="editMode">
        <transition enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
            <q-banner inline-actions class="text-white bg-red q-mb-md" v-if="hasError">
                {{ error }}
                <template v-slot:action>
                    <q-btn flat color="white" label="OK" @click="error = ''" />
                </template>
            </q-banner>
        </transition>
        <div class="row justify-between controlContainer" v-if="editMode">
            <div class="multiDiv">
                <div class="inlined-input q-mr-sm">
                    <q-btn
                        flat
                        round
                        color="primary"
                        icon="info"
                        size="xs"
                        @click="showInfoDialog"
                    ></q-btn>
                </div>
                <div class="q-mr-lg inlined-input noMoreBottomMargin">
                    <q-input label="Name" v-model="name" rounded filled class="noMoreBottomMargin">
                    </q-input>
                </div>
                <div class="inlined-input q-mr-sm">
                    <input
                        class="jsonFileUploader"
                        type="file"
                        ref="jsonFileUploader"
                        @change="onUploadJson($event)"
                    />

                    <q-btn
                        color="teal-9"
                        filled
                        size="sm"
                        label="Load JSON"
                        class="q-mb-sm"
                        icon="cloud_upload"
                        @click="openJson"
                    >
                    </q-btn>
                </div>
                <div class="inlined-input q-mr-sm">
                    <input
                        class="plainFileUploader"
                        type="file"
                        ref="plainFileUploader"
                        @change="onUploadPlain($event)"
                    />

                    <q-btn
                        color="teal-8"
                        filled
                        size="sm"
                        class="q-mb-sm"
                        label="Add Text Data"
                        icon="post_add"
                        @click="openPlain"
                    >
                    </q-btn>
                </div>
                <div class="inlined-input">
                    <input
                        class="imageFileUploader"
                        type="file"
                        ref="imageFileUploader"
                        @change="onUploadImage($event)"
                    />

                    <q-btn
                        color="teal"
                        filled
                        size="sm"
                        label="Add Image Data"
                        class="q-mb-sm"
                        icon="add_photo_alternate"
                        @click="openImage"
                    >
                    </q-btn>
                </div>
            </div>
            <div class="col-grow"></div>
            <div>
                <q-btn-group rounded dense class="q-mb-sm" v-if="editMode">
                    <q-btn
                        :color="isExpandedAuto ? 'primary' : 'blue-grey-4'"
                        size="sm"
                        label="Auto"
                        icon="video_label"
                        @click="setExpandedAuto"
                    />
                    <q-btn
                        :color="isExpandedLarge ? 'primary' : 'blue-grey-4'"
                        size="sm"
                        label="Large"
                        icon="call_to_action"
                        @click="setExpandedLarge"
                    />
                    <q-btn
                        :color="isExpandedTiny ? 'primary' : 'blue-grey-4'"
                        size="sm"
                        label="Small"
                        icon="visibility_off"
                        @click="setExpandedTiny"
                    />
                </q-btn-group>
            </div>
        </div>
        <q-slide-transition>
            <codemirror
                ref="codeBox"
                :value="code"
                :options="options"
                :class="`accqstXmlInput noRTEditor codebox`"
                @ready="onCodeReady"
                @focus="onCodeFocus"
                @input="onCodeChange"
                :name="`${namePrefix}block[${block.parentID}][${block.id}]`"
                :id="`teQ${block.parentID}B${block.id}`"
                :data-question="block.parentID"
            ></codemirror>
        </q-slide-transition>
    </div>
</template>

<script lang="ts">
import Vue, {
    defineComponent,
    toRefs,
    ref,
    computed,
    onMounted,
    onBeforeUnmount,
    PropType,
    getCurrentInstance,
    Ref,
} from 'vue'
import { BlockData } from '@/lib/codeBlocksManager'
import { IRandomizerSet, CodeExpansionType } from '@/lib/ICodeBlocks'
import { IScriptOutputObject } from '@/lib/IScriptBlock'
import { ICodePlaygroundOptions } from './CodePlayground.vue'

import 'codemirror/lib/codemirror.css'
import 'codemirror/theme/solarized.css'
import 'codemirror/theme/base16-dark.css'
import 'codemirror/theme/base16-light.css'
import 'codemirror/theme/duotone-dark.css'
import 'codemirror/theme/duotone-light.css'
import 'codemirror/theme/xq-dark.css'
import 'codemirror/theme/xq-light.css'
import 'codemirror/theme/blackboard.css'
import 'codemirror/theme/midnight.css'
import 'codemirror/theme/neo.css'
import 'codemirror/theme/mbo.css'
import 'codemirror/theme/mdn-like.css'
import 'codemirror/mode/javascript/javascript.js'
import { useBasicBlockMounting } from '@/composables/basicBlock'
import { globalState } from '@/lib/globalState'

export default defineComponent({
    name: 'DataBlock',
    components: {},
    props: {
        namePrefix: { default: '', type: String },
        finalOutputObject: {
            required: true,
            type: Object as PropType<IScriptOutputObject>,
        },
        block: { required: true, type: Object as PropType<BlockData> },
        editMode: { default: false, type: Boolean },
        theme: { default: 'base16-dark', type: String },
        eventHub: { required: true, type: Object as PropType<Vue> },
        tagSet: { type: Object as PropType<IRandomizerSet> },
    },
    setup(props, ctx) {
        const instance = getCurrentInstance()
        const q = instance?.proxy?.$root?.$q
        const t = instance?.proxy?.$root?.$t
        const l = instance?.proxy?.$root?.$l

        const { whenBlockIsReady, whenBlockIsDestroyed } = useBasicBlockMounting(true, props, ctx)
        const { namePrefix, finalOutputObject, block, editMode, theme, eventHub, tagSet } =
            toRefs(props)
        const needsCodeRebuild = ref<boolean>(false)
        const error = ref<string>('')

        const imageFileUploader: Ref<HTMLElement | null> = ref(null)
        const plainFileUploader: Ref<HTMLElement | null> = ref(null)
        const jsonFileUploader: Ref<HTMLElement | null> = ref(null)
        const codeBox: Ref<HTMLElement | null> = ref(null)

        const codemirror = computed((): any | undefined => {
            if (codeBox.value === undefined || codeBox.value === null) {
                return undefined
            }
            return (codeBox.value as any).codemirror
        })
        const originalMode = computed((): boolean => {
            if (block.value.obj === null) {
                return false
            }
            return block.value.obj.requestsOriginalVersion()
        })
        const options = computed((): ICodePlaygroundOptions => {
            return {
                mode: globalState.codeBlocks.mimeType('javascript'),
                theme: theme.value,
                lineNumbers: true,
                line: true,
                tabSize: 4,
                indentUnit: 4,
                autoCloseBrackets: true,
                readOnly: !editMode.value,
                firstLineNumber: 1,
                gutters: ['diagnostics', 'CodeMirror-linenumbers'],
            }
        })
        const code = computed(() => {
            if (!editMode.value) {
                return block.value.actualContent()
            }
            return block.value.content
        })
        const name = computed({
            get(): string {
                return block.value.name
            },
            set(newName: string) {
                block.value.name = newName
            },
        })
        const visibleLines = computed((): 'auto' | string => {
            if (block.value.codeExpanded == CodeExpansionType.TINY) {
                return '2.4'
            } else if (block.value.codeExpanded == CodeExpansionType.LARGE) {
                return '33.4'
            }
            return 'auto'
        })
        const isExpandedLarge = computed((): boolean => {
            return block.value.codeExpanded == CodeExpansionType.LARGE
        })
        const isExpandedTiny = computed((): boolean => {
            return block.value.codeExpanded == CodeExpansionType.TINY
        })
        const isExpandedAuto = computed((): boolean => {
            return block.value.codeExpanded == CodeExpansionType.AUTO
        })
        const hasError = computed((): boolean => {
            return error.value !== ''
        })
        const images = computed({
            get(): any {
                return []
            },
            set(val: any) {
                console.log('IMAGES:' + val)
            },
        })
        const setExpandedLarge = (): void => {
            setExpanded(CodeExpansionType.LARGE)
        }
        const setExpandedTiny = (): void => {
            setExpanded(CodeExpansionType.TINY)
        }
        const setExpandedAuto = (): void => {
            setExpanded(CodeExpansionType.AUTO)
        }
        const setExpanded = (val: CodeExpansionType): void => {
            block.value.codeExpanded = val
            if (block.value.codeExpanded != CodeExpansionType.TINY) {
                globalState.codeBlocks.refreshAllCodeMirrors()
            }
            updateHeight()
        }
        const updateErrors = (): boolean => {
            return false
        }
        const resetBeforeRun = (): void => {}
        const onCodeChange = (newCode) => {
            if (codeBox.value === null) {
                return
            }
            const tb = (codeBox.value as any).$el.querySelector(
                'textarea[name]'
            ) as HTMLTextAreaElement
            tb.value = newCode
            block.value.content = newCode
            if (editMode.value) {
                needsCodeRebuild.value = true
            }
        }
        const onCodeFocus = (editor) => {}
        const onDidInit = (): void => {
            updateErrors()
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
            (codeBox.value as any)!.$el.querySelectorAll('textarea[name]').forEach((el) => {
                el.className = (el.className + ' accqstXmlInput noRTEditor').trim()
                el.id = codeBox.value!.id
                $(el).text(block.value.content)
                el.setAttribute('data-question', `${block.value.parentID}`)
                if (editMode.value) {
                    el.setAttribute('is-editmode', `${editMode.value}`)
                }
            })
            onCodeChange(block.value.content)
            whenBlockIsReady()
        }
        const updateHeight = () => {
            if (visibleLines.value === 'auto') {
                if (codemirror.value) {
                    codemirror.value.setSize('height', 'auto')
                }
            } else {
                if (codemirror.value) {
                    codemirror.value.setSize(
                        null,
                        Math.round(20 * Math.max(1, +visibleLines.value)) + 9
                    )
                }
            }
        }
        const showInfoDialog = (): void => {
            if (l === undefined || q === undefined) {
                return
            }
            q?.dialog({
                title: l('DataBlock.InfoCaption'),
                message: l('DataBlock.Info').replace('{NAME}', name.value),
                html: true,
                style: 'width:75%',
            })
                .onOk(() => {})
                .onCancel(() => {})
                .onDismiss(() => {})
        }
        const onUpload = (
            uploader: any,
            validateFileType: (type: string) => boolean,
            processor: (fl: File, fr: FileReader) => void,
            action: (name: string, content: string | ArrayBuffer | null) => void
        ): void => {
            if (uploader.files === undefined || uploader.files.length < 1) {
                return
            }
            const files = uploader.files
            for (let i = 0; i < files.length; i++) {
                const fl = files[i]
                let type: string = fl.type
                if (fl.type == '') {
                    const ext = fl.name.split('.').pop()
                    const knownTextExtensions = ['obj', 'mat', 'vsh', 'fsh', 'ply']
                    if (knownTextExtensions.indexOf(ext) === 0) {
                        type = 'text/' + ext
                    }
                    console.log(ext, type)
                }
                if (!validateFileType(type)) {
                    error.value = `Uploads of type '${type}' are not allowed.`
                    console.error(error.value)
                    break
                }
                if (fl.size > 500 * 1025) {
                    error.value = `Maximum allowed upload size are 500kB.`
                    console.error(error.value)
                    break
                }
                const fr = new FileReader()
                fr.onload = () => {
                    action(fl.name, fr.result)
                }
                fr.onerror = (e) => {
                    console.error(fr.error)
                    error.value =
                        fr.error === undefined || fr.error === null ? '' : fr.error.message
                }
                processor(fl, fr)
            }
            uploader.value = ''
        }
        const openImage = (): void => {
            if (imageFileUploader.value !== null) {
                imageFileUploader.value.click()
            }
        }
        const openPlain = (): void => {
            if (plainFileUploader.value !== null) {
                plainFileUploader.value.click()
            }
        }
        const openJson = (): void => {
            if (jsonFileUploader.value !== null) {
                jsonFileUploader.value.click()
            }
        }
        const onUploadImage = (event): void => {
            onUpload(
                imageFileUploader,
                (type) => type.startsWith('image/'),
                (fl, fr) => fr.readAsDataURL(fl),
                (fileName, content) => addImageURL(fileName, content)
            )
        }
        const onUploadPlain = (event): void => {
            onUpload(
                plainFileUploader,
                (type) => type.startsWith('text/'),
                (fl, fr) => fr.readAsText(fl),
                (fileName, content) => loadPlain(fileName, content)
            )
        }
        const onUploadJson = (event): void => {
            onUpload(
                jsonFileUploader,
                (type) => type.trim() === 'application/json' || type.trim() === 'text/json',
                (fl, fr) => fr.readAsText(fl),
                (fileName, content) => loadJson(fileName, content)
            )
        }
        const loadJson = (fileName, txt) => {
            block.value.content = txt
        }
        const loadPlain = (fileName, txt) => {
            addToContent(fileName, txt)
        }
        const addImageURL = (fileName, img) => {
            addToContent(fileName, img)
        }
        const addToContent = (fileName: string, data: string) => {
            let json = {}
            try {
                json = JSON.parse(block.value.content)
            } catch (e) {
                console.error(e)
            }
            let i = -1
            let name
            do {
                i++
                if (i == 0) {
                    name = fileName
                } else {
                    name = `${fileName}_${i}`
                }
            } while (json[name] !== undefined)
            json[name] = data
            block.value.content = JSON.stringify(json, undefined, 2)
        }
        ;(() => {
            eventHub.value.$on('before-run', resetBeforeRun)
            eventHub.value.$on('render-diagnostics', updateErrors)
        })()
        onMounted(() => {
            const hasErrors = block.value && block.value.obj && block.value.obj.err.length > 0
            if (hasErrors) {
                updateErrors()
            }
            updateHeight()
        })
        onBeforeUnmount(() => {
            eventHub.value.$off('before-run', resetBeforeRun)
            eventHub.value.$off('render-diagnostics', updateErrors)
        })
        return {
            needsCodeRebuild,
            error,
            codeBox,
            codemirror,
            originalMode,
            options,
            code,
            name,
            visibleLines,
            isExpandedLarge,
            isExpandedTiny,
            isExpandedAuto,
            hasError,
            images,
            setExpandedLarge,
            setExpandedTiny,
            setExpandedAuto,
            setExpanded,
            updateErrors,
            resetBeforeRun,
            onCodeChange,
            onCodeFocus,
            onDidInit,
            onCodeReady,
            updateHeight,
            showInfoDialog,
            onUpload,
            openImage,
            openPlain,
            openJson,
            onUploadImage,
            onUploadPlain,
            onUploadJson,
            loadJson,
            loadPlain,
            addImageURL,
            addToContent,
        }
    },
})
</script>

<style lang="sass" scoped>
.noMoreBottomMargin
    margin-bottom: 0px !important

.controlContainer
    display: flex
    justify-content: space-between
    width: 100%
    flex-wrap: nowrap
    flex-direction: row
    align-content: flex-end
    align-items: flex-end

.multiDiv
    display: flex
    align-items: flex-end

.imageFileUploader
    display: none !important

.plainFileUploader
    display: none !important

.jsonFileUploader
    display: none !important

.inlined-input
    display: inline-block

.playgroundedit
    border-radius: 5px

.hiddenBlock
    display: none !important

.hiddenBlock
    opacity: 0
    visibility: hidden
</style>
<style lang="stylus">
@import '../styles/quasar.variables.styl'
.jsonErrObj, .jsonErr
    margin-left: 16px
    font-weight: bold

.jsonErrObj
    padding-left: 4px
    padding-right: 4px
    font-family: monospace
    margin-bottom: 20px
    background-color: $amber-2

.jsonErr
    font-weight: bold
    color: $deep-orange-14

.jsonErrTitle
    padding-left: 8px
    text-transform: uppercase
</style>
