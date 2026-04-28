<template>
    <div v-if="editMode">
        <transition name="fade">
            <Alert variant="destructive" class="tw-mb-4" v-if="hasError">
                <AlertDescription>{{ error }}</AlertDescription>
                <Button variant="outline" size="sm" @click="error = ''" class="tw-ml-2">OK</Button>
            </Alert>
        </transition>
        <div
            class="tw-flex tw-justify-between tw-w-full tw-flex-nowrap tw-flex-row tw-items-center tw-content-center tw-mb-1"
        >
            <div class="tw-flex tw-items-center tw-flex-1">
                <div class="inlined-input tw-mr-2 tw-ml-6">
                    <Button variant="ghost" size="sm" @click="showInfoDialog">
                        <Info class="tw-w-4 tw-h-4" />
                    </Button>
                </div>
                <div class="tw-mr-4 inlined-input tw-mb-0 tw-flex tw-flex-1">
                    <Input
                        id="name-input"
                        v-model="name"
                        size="xs"
                        class="tw-mb-0 tw-bg-muted tw-pl-3"
                        :placeholder="$t('LibraryBlock.Name')"
                    />
                </div>
            </div>

            <div class="tw-flex tw-items-center tw-gap-2">
                <div class="inlined-input">
                    <input
                        class="jsonFileUploader"
                        type="file"
                        ref="jsonFileUploader"
                        @change="onUploadJson($event)"
                    />
                    <input
                        class="plainFileUploader"
                        type="file"
                        ref="plainFileUploader"
                        @change="onUploadPlain($event)"
                    />
                    <input
                        class="imageFileUploader"
                        type="file"
                        ref="imageFileUploader"
                        @change="onUploadImage($event)"
                    />

                    <DropdownMenu>
                        <DropdownMenuTrigger as-child>
                            <Button variant="default" size="xs">
                                <Plus class="tw-w-4 tw-h-4 tw-mr-1" />
                                {{ $t('DataBlock.Add') || 'Add...' }}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem @click="openJson">
                                <CloudUpload class="tw-w-4 tw-h-4 tw-mr-2" />
                                {{ $t('DataBlock.LoadJSON') || 'Load JSON' }}
                            </DropdownMenuItem>
                            <DropdownMenuItem @click="openPlain">
                                <FilePlus2 class="tw-w-4 tw-h-4 tw-mr-2" />
                                {{ $t('DataBlock.AddTextData') || 'Add Text Data' }}
                            </DropdownMenuItem>
                            <DropdownMenuItem @click="openImage">
                                <ImagePlus class="tw-w-4 tw-h-4 tw-mr-2" />
                                {{ $t('DataBlock.AddImageData') || 'Add Image Data' }}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div
                    class="tw-inline-flex tw-w-fit -tw-space-x-px tw-rounded-md tw-shadow-xs rtl:tw-space-x-reverse"
                >
                    <Button
                        :variant="isExpandedAuto ? 'default' : 'outline'"
                        class="tw-rounded-none tw-rounded-s-md tw-shadow-none focus-visible:tw-z-10"
                        size="xs"
                        @click="setExpandedAuto"
                    >
                        <Expand class="tw-w-4 tw-h-4 tw-mr-1" />
                        Auto
                    </Button>
                    <Button
                        :variant="isExpandedLarge ? 'default' : 'outline'"
                        class="tw-rounded-none tw-shadow-none focus-visible:tw-z-10"
                        size="xs"
                        @click="setExpandedLarge"
                    >
                        <Maximize class="tw-w-4 tw-h-4 tw-mr-1" />
                        Large
                    </Button>
                    <Button
                        :variant="isExpandedTiny ? 'default' : 'outline'"
                        class="tw-rounded-none tw-rounded-e-md tw-shadow-none focus-visible:tw-z-10"
                        size="xs"
                        @click="setExpandedTiny"
                    >
                        <Shrink class="tw-w-4 tw-h-4 tw-mr-1" />
                        Small
                    </Button>
                </div>
            </div>
        </div>
        <transition name="slide">
            <code-mirror
                ref="codeBox"
                v-model="code"
                :class="`accqstXmlInput noRTEditor codebox`"
                :name="`${namePrefix}block[${block.parentID}][${block.id}]`"
                :id="`teQ${block.parentID}B${block.id}`"
                :data-question="block.parentID"
                :theme="block.themeForCodeBlock"
                language="text/json"
                @update:model-value="onCodeChange"
                @ready="onCodeReady"
                @focus="onCodeFocus"
            />
        </transition>
        <Dialog :open="dialogOpen" @update:open="(val) => (dialogOpen = val)">
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{{ l('DataBlock.InfoCaption') }}</DialogTitle>
                    <DialogDescription
                        v-html="l('DataBlock.Info', { NAME: name })"
                    ></DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button @click="dialogOpen = false">OK</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
</template>

<script lang="ts" setup>
import CodeMirror from '@/components/CodeMirror.vue'
import {
    toRefs,
    ref,
    computed,
    onMounted,
    onBeforeUnmount,
    getCurrentInstance,
    Ref,
    watch,
} from 'vue'
import { IRandomizerSet, CodeExpansionType } from '@/lib/ICodeBlocks'
import { ICodePlaygroundOptions } from './CodePlayground.vue'

import {
    DEFAULT_EDITABLE_BLOCK_PROPS,
    EditableBlockProps,
    useBasicBlockMounting,
} from '@/composables/basicBlock'
import { globalState } from '@/lib/globalState'
import { EventHubType } from '@/composables/globalEvents'
import { l } from '@/plugins/i18n'
import { BlockStorageType, useBlockStorage } from '@/storage/blockStorage'
import { IScriptOutputObject } from '@/lib/IScriptBlock'
import { useCodeEditor } from '@/composables/useCodeEditor'

// Shadcn components
import { Button } from '@/shadcn/ui/button'
import { Input } from '@/shadcn/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/shadcn/ui/alert'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shadcn/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/shadcn/ui/dropdown-menu'

// Lucide icons
import {
    Info,
    CloudUpload,
    FilePlus2,
    ImagePlus,
    Maximize,
    Expand,
    Shrink,
    Plus,
} from 'lucide-vue-next'

interface Props extends EditableBlockProps {
    namePrefix?: string
    eventHub: EventHubType
    tagSet?: IRandomizerSet | undefined
    finalOutputObject: IScriptOutputObject
}

const props = withDefaults(defineProps<Props>(), {
    ...DEFAULT_EDITABLE_BLOCK_PROPS,
    tagSet: undefined,
    namePrefix: '',
})

const emit = defineEmits(['ready'])

const instance = getCurrentInstance()
const t = instance?.proxy?.$root?.$t

// Block storage and mounting
const blockStorage: BlockStorageType = useBlockStorage(props.appID)
const block = blockStorage.getBlock(props.blockID)
const { whenBlockIsReady, whenBlockIsDestroyed } = useBasicBlockMounting(
    true,
    props,
    blockStorage,
    (block) => emit('ready', block)
)

const { namePrefix, finalOutputObject, editMode, theme, eventHub, tagSet } = toRefs(props)
const needsCodeRebuild = ref<boolean>(false)
const error = ref<string>('')
const readonyl = computed(() => !editMode.value)

const imageFileUploader: Ref<HTMLElement | null> = ref(null)
const plainFileUploader: Ref<HTMLElement | null> = ref(null)
const jsonFileUploader: Ref<HTMLElement | null> = ref(null)
const codeBox = ref<InstanceType<typeof CodeMirror> | null>(null)
const dialogOpen = ref(false)

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

const { editorReadOnly, code } = useCodeEditor(block, editMode, readonyl)

const options = computed((): ICodePlaygroundOptions => {
    return {
        mode: globalState.appState.mimeType('json'),
        theme: theme.value,
        lineNumbers: true,
        line: true,
        tabSize: 4,
        indentUnit: 4,
        autoCloseBrackets: true,
        readOnly: editorReadOnly.value,
        firstLineNumber: 1,
        gutters: ['diagnostics', 'CodeMirror-linenumbers'],
    }
})

const name = computed({
    get(): string {
        return block.value.name
    },
    set(newName: string) {
        block.value.name = newName
    },
})

//watch for changes in codeExpanded
watch(
    () => block.value.codeExpanded,
    () => updateHeight()
)
const visibleLines = computed((): 'auto' | number => {
    if (isExpandedTiny.value) {
        return 3
    } else if (isExpandedLarge.value) {
        return 33.4
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
        globalState.appState.refreshAllCodeMirrors()
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
    const tb = (codeBox.value as any).$el.querySelector('textarea[name]') as HTMLTextAreaElement
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
        el.id = (codeBox.value as any)!.$el.id
        $(el).text(block.value.content)
        el.setAttribute('data-question', `${block.value.parentID}`)
        if (editMode.value) {
            el.setAttribute('is-editmode', `${editMode.value}`)
        }
    })
    onCodeChange(block.value.content)
    updateHeight()
    whenBlockIsReady()
}
const updateHeight = () => {
    if (!codeBox.value?.view) {
        return
    }

    const height =
        visibleLines.value === 'auto' || block.value.static
            ? 'auto'
            : `${Math.round(20 * Math.max(1, visibleLines.value)) + 9}px`

    codeBox.value.view.dom.style.height = height
}
const showInfoDialog = (): void => {
    dialogOpen.value = true
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
            error.value = fr.error === undefined || fr.error === null ? '' : fr.error.message
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
    eventHub.value.on('before-run', resetBeforeRun)
    eventHub.value.on('render-diagnostics', updateErrors)
})()
onMounted(() => {
    const hasErrors = block.value && block.value.obj && block.value.obj.err.length > 0
    if (hasErrors) {
        updateErrors()
    }
    updateHeight()
})
onBeforeUnmount(() => {
    eventHub.value.off('before-run', resetBeforeRun)
    eventHub.value.off('render-diagnostics', updateErrors)
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

// Transitions
.fade-enter-active, .fade-leave-active
    transition: opacity 0.5s

.fade-enter-from, .fade-leave-to
    opacity: 0

.slide-enter-active, .slide-leave-active
    transition: all 0.3s

.slide-enter-from, .slide-leave-to
    transform: translateX(-10px)
    opacity: 0
</style>
<style lang="stylus">
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
