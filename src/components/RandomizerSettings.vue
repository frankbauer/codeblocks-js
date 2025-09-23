<template>
    <div>
        <div class="tw-flex tw-items-center tw-space-x-2">
            <SwitchComponent
                id="randomizer-active"
                :checked="options.randomizer.active"
                @update:checked="updateActive"
            />
            <LabelComponent for="randomizer-active" class="tw-text-sm tw-font-medium">
                {{ $t('RandomizerSettings.Active') }}
            </LabelComponent>
        </div>
        <transition
            name="slide"
            @before-enter="onBeforeEnter"
            @enter="onEnter"
            @after-enter="onAfterEnter"
            @before-leave="onBeforeLeave"
            @leave="onLeave"
            @after-leave="onAfterLeave"
        >
            <div v-show="options.randomizer.active" class="tw-ml-4 tw-mt-4">
                <div class="tagList">
                    <div
                        class="tw-text-sm tw-font-medium tw-text-gray-900 tw-mb-3 tw-flex tw-items-center tw-justify-between"
                    >
                        {{ $t('RandomizerSettings.Available') }}
                        <DialogComponent
                            :open="showAddTagDialog"
                            @update:open="showAddTagDialog = $event"
                        >
                            <DialogTrigger as-child>
                                <ButtonComponent
                                    variant="outline"
                                    size="sm"
                                    @click="addTag"
                                    class="tw-h-6 tw-w-6 tw-p-0"
                                >
                                    <Plus class="tw-h-3 tw-w-3" />
                                </ButtonComponent>
                            </DialogTrigger>
                            <DialogContent class="tw-sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Create Tag</DialogTitle>
                                </DialogHeader>
                                <div class="tw-space-y-4">
                                    <p class="tw-text-sm tw-text-gray-600">
                                        This will generate a new randomizer-Tag with the below name.
                                    </p>
                                    <input
                                        v-model="newTagName"
                                        type="text"
                                        placeholder="Tag name"
                                        class="tw-w-full tw-px-3 tw-py-2 tw-border tw-rounded-md tw-border-gray-300 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-blue-500"
                                        @keyup.enter="handleAddTag"
                                    />
                                    <div class="tw-flex tw-justify-end tw-space-x-2">
                                        <ButtonComponent variant="outline" @click="cancelAddTag">
                                            Cancel
                                        </ButtonComponent>
                                        <ButtonComponent @click="handleAddTag"
                                            >Create</ButtonComponent
                                        >
                                    </div>
                                </div>
                            </DialogContent>
                        </DialogComponent>
                    </div>
                    <div class="tw-flex tw-flex-wrap tw-gap-2 tw-mb-4">
                        <div
                            :class="`tagItem tw-ml-1 ${tagClass}`"
                            v-for="(tag, i) in options.randomizer.knownTags"
                            v-bind:key="tag"
                        >
                            <div class="tw-flex tw-items-center tw-justify-between tw-space-x-2">
                                <div class="tagInfo tw-flex-1">
                                    <div class="tagName">{{ tag }}</div>
                                    <div class="tagString">{:{{ tag }}}</div>
                                </div>
                                <div class="tagAction tw-flex-shrink-0">
                                    <ButtonComponent
                                        variant="ghost"
                                        size="sm"
                                        @click="removeTag(i)"
                                        class="tw-h-6 tw-w-6 tw-p-0 tw-text-gray-500 hover:tw-text-red-600"
                                    >
                                        <Trash2 class="tw-h-3 tw-w-3" />
                                    </ButtonComponent>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="tagList tw-mt-8">
                    <div
                        class="tw-text-sm tw-font-medium tw-text-gray-900 tw-mb-3 tw-flex tw-items-center tw-justify-between"
                    >
                        {{ $t('RandomizerSettings.Sets') }}
                        <ButtonComponent
                            variant="outline"
                            size="sm"
                            @click="addSet"
                            class="tw-h-6 tw-w-6 tw-p-0"
                        >
                            <Plus class="tw-h-3 tw-w-3" />
                        </ButtonComponent>
                    </div>

                    <div class="setList tw-space-y-3">
                        <div
                            v-for="(s, i) in options.randomizer.sets"
                            v-bind:key="s.uuid"
                            class="tw-flex tw-items-start tw-space-x-3 tw-p-3 tw-bg-gray-50 tw-rounded-lg"
                        >
                            <div class="tw-flex-shrink-0">
                                <Avatar
                                    :class="[
                                        'tw-h-8 tw-w-8 tw-text-sm tw-font-medium',
                                        isVisible(i)
                                            ? 'tw-bg-blue-700 tw-text-white'
                                            : 'tw-bg-gray-500 tw-text-white',
                                    ]"
                                >
                                    {{ i }}
                                </Avatar>
                            </div>
                            <div class="tw-flex-1 tw-min-w-0">
                                <div class="tw-text-sm tw-font-medium tw-text-gray-900">
                                    Set {{ i + 1 }}
                                </div>
                                <div class="tw-mt-1">
                                    <div class="tw-flex tw-flex-wrap tw-gap-1">
                                        <div
                                            :class="`tagItem tw-ml-1 ${tagClass}`"
                                            v-for="tag in s.values"
                                            v-bind:key="tag.tag"
                                        >
                                            <div class="tw-flex tw-items-center">
                                                <div class="tagInfo tw-flex-1">
                                                    <div class="tagName">{{ tag.tag }}</div>
                                                    <div class="tagString">{{ tag.value }}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="tw-flex-shrink-0 tw-flex tw-items-center tw-space-x-1">
                                <div class="tw-mr-3">
                                    <component
                                        :is="isCompleteSet(s) ? Check : AlertTriangle"
                                        :class="[
                                            'tw-h-5 tw-w-5',
                                            isCompleteSet(s)
                                                ? 'tw-text-green-600'
                                                : 'tw-text-red-600',
                                        ]"
                                    />
                                </div>

                                <ButtonComponent
                                    variant="ghost"
                                    size="sm"
                                    @click="setVisible(i)"
                                    class="tw-h-6 tw-w-6 tw-p-0"
                                    title="Use this set when running code in preview or editMode."
                                >
                                    <component
                                        :is="isVisible(i) ? Eye : EyeOff"
                                        class="tw-h-3 tw-w-3"
                                    />
                                </ButtonComponent>

                                <DialogComponent>
                                    <DialogTrigger asChild>
                                        <ButtonComponent
                                            variant="ghost"
                                            size="sm"
                                            class="tw-h-6 tw-w-6 tw-p-0"
                                        >
                                            <Edit class="tw-h-3 tw-w-3" />
                                        </ButtonComponent>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>
                                                {{ $t('RandomizerSetEditor.Caption', { nr: i }) }}
                                            </DialogTitle>
                                        </DialogHeader>
                                        <RandomizerSetEditor
                                            :options="options"
                                            :tagSet="getFullSet(s)"
                                            :nr="i"
                                        />
                                    </DialogContent>
                                </DialogComponent>

                                <ButtonComponent
                                    variant="ghost"
                                    size="sm"
                                    @click="removeSet(i)"
                                    class="tw-h-6 tw-w-6 tw-p-0 tw-text-gray-500 hover:tw-text-red-600"
                                >
                                    <Trash2 class="tw-h-3 tw-w-3" />
                                </ButtonComponent>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </transition>
    </div>
</template>

<script lang="ts">
import RandomizerSetEditor from '@/components/RandomizerSetEditor.vue'
import { IRandomizerSet } from '@/lib/ICodeBlocks'
import { computed, ComputedRef, defineComponent, PropType, ref } from 'vue'
import { uuid } from 'vue-uuid'
import { TAG_CLASS_NAMES } from '@/plugins/tagHighlighter'
import { useSlideTransition } from '@/composables/useSlideTransition'

// shadcn components
import { Switch } from '@/shadcn/ui/switch'
import { Label } from '@/shadcn/ui/label'
import { Button } from '@/shadcn/ui/button'
import { Avatar } from '@/shadcn/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/shadcn/ui/dialog'

// Lucide icons
import { Plus, Trash2, Check, AlertTriangle, Eye, EyeOff, Edit } from 'lucide-vue-next'

// Define the interface directly here for now
interface ICodeBlockSettingsOptions {
    randomizer: {
        active: boolean
        previewIndex: number
        knownTags: string[]
        sets: IRandomizerSet[]
    }
}

export default defineComponent({
    name: 'RandomizerSettings',
    components: {
        RandomizerSetEditor,
        SwitchComponent: Switch,
        LabelComponent: Label,
        ButtonComponent: Button,
        Avatar,
        DialogComponent: Dialog,
        DialogContent,
        DialogHeader,
        DialogTitle,
        DialogTrigger,
        Plus,
        Trash2,
        Check,
        AlertTriangle,
        Eye,
        EyeOff,
        Edit,
    },
    props: {
        options: {
            type: Object as PropType<ICodeBlockSettingsOptions>,
            required: true,
        },
    },
    emits: ['update:options'],
    setup(props, { emit }) {
        const showAddTagDialog = ref(false)
        const newTagName = ref('')

        const { onBeforeEnter, onEnter, onAfterEnter, onBeforeLeave, onLeave, onAfterLeave } =
            useSlideTransition()

        const tagClass: ComputedRef<String> = computed(() => {
            return TAG_CLASS_NAMES.rnd + ' tag-mark-start tag-mark-end tag-mark-shadow'
        })

        function isVisible(nr: number): boolean {
            return nr == props.options.randomizer.previewIndex
        }

        function setVisible(nr: number): void {
            const updatedOptions = { ...props.options }
            updatedOptions.randomizer.previewIndex = nr
            emit('update:options', updatedOptions)
        }

        function updateActive(checked: boolean): void {
            const updatedOptions = { ...props.options }
            updatedOptions.randomizer.active = checked
            emit('update:options', updatedOptions)
        }

        function isValidTag(tag: string): boolean {
            return props.options.randomizer.knownTags.find((t) => t == tag) !== undefined
        }

        function isCompleteSet(s: IRandomizerSet): boolean {
            if (
                s.values.filter((v) => props.options.randomizer.knownTags.indexOf(v.tag) < 0)
                    .length > 0
            ) {
                return false
            }
            if (
                props.options.randomizer.knownTags.filter(
                    (t) => s.values.find((v) => v.tag == t) === undefined
                ).length > 0
            ) {
                return false
            }
            return true
        }

        function getFullSet(s: IRandomizerSet): IRandomizerSet {
            return s
        }

        function removeSet(nr: number): void {
            const updatedOptions = { ...props.options }
            updatedOptions.randomizer.sets.splice(nr, 1)
            emit('update:options', updatedOptions)
        }

        function addSet(): void {
            const updatedOptions = { ...props.options }
            updatedOptions.randomizer.sets.push({ uuid: uuid.v4(), values: [] })
            emit('update:options', updatedOptions)
        }

        function removeTag(nr: number): void {
            const updatedOptions = { ...props.options }
            updatedOptions.randomizer.knownTags.splice(nr, 1)
            emit('update:options', updatedOptions)
        }

        function addTag(): void {
            showAddTagDialog.value = true
        }

        function handleAddTag(): void {
            let data = newTagName.value.replace(/\W/g, '_')

            // Check if this name already exists
            if (props.options.randomizer.knownTags.filter((t) => t == data).length > 0) {
                let ct = 1
                const odata = data
                do {
                    data = odata + '_' + ct
                    ct++
                } while (props.options.randomizer.knownTags.filter((t) => t == data).length > 0)
            }

            const updatedOptions = { ...props.options }
            updatedOptions.randomizer.knownTags.push(data)
            emit('update:options', updatedOptions)
            showAddTagDialog.value = false
            newTagName.value = ''
        }

        function cancelAddTag(): void {
            showAddTagDialog.value = false
            newTagName.value = ''
        }

        return {
            tagClass,
            isVisible,
            setVisible,
            updateActive,
            isValidTag,
            isCompleteSet,
            getFullSet,
            removeSet,
            addSet,
            removeTag,
            addTag,
            handleAddTag,
            cancelAddTag,
            showAddTagDialog,
            newTagName,
            onBeforeEnter,
            onEnter,
            onAfterEnter,
            onBeforeLeave,
            onLeave,
            onAfterLeave,
            // Icon components
            Plus,
            Trash2,
            Check,
            AlertTriangle,
            Eye,
            EyeOff,
            Edit,
        }
    },
})
</script>

<style scoped>
.tagItem {
    width: auto;
    padding-bottom: 2px;
    min-height: 24px;
}

.tagItem .tagInfo {
    padding-left: 4px;
}

.tagItem .tagInfo .tagName {
    font-weight: bold;
}

.tagItem .tagInfo .tagString {
    margin-top: -4px;
    color: #94a3b8;
    font-size: 75%;
}

.tagItem .tagAction {
    padding-top: 2px;
    color: #475569;
    min-width: 36px;
}

.setList .tagItem .tagInfo {
    padding-right: 4px;
}

.setList .tagItem .tagInfo .tagName {
    font-weight: normal;
    font-size: 75%;
}

.setList .tagItem .tagInfo .tagString {
    font-weight: bold;
    color: black;
    font-size: inherit;
}
</style>
