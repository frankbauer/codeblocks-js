<template>
    <div>
        <div class="tw-flex tw-items-center tw-space-x-2">
            <SwitchComponent
                id="randomizer-active"
                :model-value="options.randomizer.active"
                @update:model-value="updateActive"
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
            <div v-show="options.randomizer.active" class="tw-mt-4 tw-space-y-6">
                <!-- Tags section -->
                <div>
                    <div class="tw-flex tw-items-center tw-justify-between tw-mb-3">
                        <span
                            class="tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wider tw-text-muted-foreground"
                        >
                            {{ $t('RandomizerSettings.Available') }}
                        </span>
                        <DialogComponent
                            :open="showAddTagDialog"
                            @update:open="showAddTagDialog = $event"
                        >
                            <DialogTrigger as-child>
                                <ButtonComponent
                                    variant="outline"
                                    size="sm"
                                    @click="addTag"
                                    class="tw-h-7 tw-w-7 tw-p-0"
                                >
                                    <Plus class="tw-h-3.5 tw-w-3.5" />
                                </ButtonComponent>
                            </DialogTrigger>
                            <DialogContent class="tw-max-w-sm">
                                <DialogHeader>
                                    <DialogTitle>Create Tag</DialogTitle>
                                </DialogHeader>
                                <div class="tw-space-y-4">
                                    <p class="tw-text-sm tw-text-muted-foreground">
                                        This will generate a new randomizer tag with the given name.
                                    </p>
                                    <InputComponent
                                        v-model="newTagName"
                                        type="text"
                                        placeholder="Tag name"
                                        @keyup.enter="handleAddTag"
                                    />
                                    <div class="tw-flex tw-justify-end tw-gap-2">
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

                    <div
                        v-if="options.randomizer.knownTags.length === 0"
                        class="tw-text-xs tw-text-muted-foreground tw-italic"
                    >
                        No tags defined yet.
                    </div>
                    <div class="tw-flex tw-flex-wrap tw-gap-2">
                        <div
                            :class="`tagItem ${tagClass}`"
                            v-for="(tag, i) in options.randomizer.knownTags"
                            :key="tag"
                        >
                            <div class="tw-flex tw-items-center tw-gap-1.5">
                                <div class="tagInfo">
                                    <div class="tagName">{{ tag }}</div>
                                    <div class="tagString">{:{{ tag }}}</div>
                                </div>
                                <ButtonComponent
                                    variant="ghost"
                                    size="sm"
                                    @click="removeTag(i)"
                                    class="tw-h-5 tw-w-5 tw-p-0 tw-text-muted-foreground hover:tw-text-destructive"
                                >
                                    <Trash2 class="tw-h-3 tw-w-3" />
                                </ButtonComponent>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Sets section -->
                <div>
                    <div class="tw-flex tw-items-center tw-justify-between tw-mb-3">
                        <span
                            class="tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wider tw-text-muted-foreground"
                        >
                            {{ $t('RandomizerSettings.Sets') }}
                        </span>
                        <ButtonComponent
                            variant="outline"
                            size="sm"
                            @click="addSet"
                            class="tw-h-7 tw-w-7 tw-p-0"
                        >
                            <Plus class="tw-h-3.5 tw-w-3.5" />
                        </ButtonComponent>
                    </div>

                    <div
                        v-if="options.randomizer.sets.length === 0"
                        class="tw-text-xs tw-text-muted-foreground tw-italic"
                    >
                        No sets defined yet.
                    </div>
                    <div class="tw-space-y-2">
                        <div
                            v-for="(s, i) in options.randomizer.sets"
                            :key="s.uuid"
                            :class="[
                                'tw-flex tw-items-start tw-gap-3 tw-p-3 tw-rounded-lg tw-border tw-transition-colors',
                                isVisible(i)
                                    ? 'tw-border-primary tw-bg-primary/5'
                                    : 'tw-border-border tw-bg-card',
                            ]"
                        >
                            <!-- Set number badge -->
                            <div
                                :class="[
                                    'tw-flex-shrink-0 tw-flex tw-items-center tw-justify-center tw-h-7 tw-w-7 tw-rounded-full tw-text-xs tw-font-semibold tw-tabular-nums',
                                    isVisible(i)
                                        ? 'tw-bg-primary tw-text-primary-foreground'
                                        : 'tw-bg-muted tw-text-muted-foreground',
                                ]"
                            >
                                {{ i + 1 }}
                            </div>

                            <!-- Tag chips preview -->
                            <div class="tw-flex-1 tw-min-w-0">
                                <div
                                    v-if="s.values.length === 0"
                                    class="tw-text-xs tw-text-muted-foreground tw-italic"
                                >
                                    Empty — click edit to fill in values.
                                </div>
                                <div class="tw-flex tw-flex-wrap tw-gap-1.5">
                                    <div
                                        :class="`tagItem ${tagClass}`"
                                        v-for="tag in s.values"
                                        :key="tag.tag"
                                    >
                                        <div class="tagInfo">
                                            <div class="tagName">{{ tag.tag }}</div>
                                            <div class="tagString">{{ tag.value || '—' }}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Actions -->
                            <div class="tw-flex-shrink-0 tw-flex tw-items-center tw-gap-0.5">
                                <component
                                    :is="isCompleteSet(s) ? Check : AlertTriangle"
                                    :class="[
                                        'tw-h-4 tw-w-4 tw-mr-1.5',
                                        isCompleteSet(s)
                                            ? 'tw-text-green-600'
                                            : 'tw-text-amber-500',
                                    ]"
                                />

                                <ButtonComponent
                                    variant="ghost"
                                    size="sm"
                                    @click="setVisible(i)"
                                    class="tw-h-7 tw-w-7 tw-p-0"
                                    :title="
                                        isVisible(i)
                                            ? 'Active preview set'
                                            : 'Use this set for preview'
                                    "
                                >
                                    <component
                                        :is="isVisible(i) ? Eye : EyeOff"
                                        class="tw-h-3.5 tw-w-3.5"
                                    />
                                </ButtonComponent>

                                <DialogComponent>
                                    <DialogTrigger as-child>
                                        <ButtonComponent
                                            variant="ghost"
                                            size="sm"
                                            class="tw-h-7 tw-w-7 tw-p-0"
                                        >
                                            <Edit class="tw-h-3.5 tw-w-3.5" />
                                        </ButtonComponent>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>
                                                {{
                                                    $t('RandomizerSetEditor.Caption', { nr: i + 1 })
                                                }}
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
                                    class="tw-h-7 tw-w-7 tw-p-0 tw-text-muted-foreground hover:tw-text-destructive"
                                >
                                    <Trash2 class="tw-h-3.5 tw-w-3.5" />
                                </ButtonComponent>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </transition>
    </div>
</template>

<script setup lang="ts">
import RandomizerSetEditor from '@/components/RandomizerSetEditor.vue'
import { IRandomizerSet } from '@/lib/ICodeBlocks'
import { computed, PropType, ref } from 'vue'
import { uuid } from 'vue-uuid'
import { TAG_CLASS_NAMES } from '@/plugins/tagHighlighter'
import { useSlideTransition } from '@/composables/useSlideTransition'

import { Switch } from '@/shadcn/ui/switch'
import { Label } from '@/shadcn/ui/label'
import { Button } from '@/shadcn/ui/button'
import { Input } from '@/shadcn/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/shadcn/ui/dialog'
const SwitchComponent = Switch
const LabelComponent = Label
const ButtonComponent = Button
const InputComponent = Input
const DialogComponent = Dialog

import { Plus, Trash2, Check, AlertTriangle, Eye, EyeOff, Edit } from 'lucide-vue-next'
import { ICodeBlockSettingsOptions } from './CodeBlocksSettings.vue'

const props = defineProps({
    options: {
        type: Object as PropType<ICodeBlockSettingsOptions>,
        required: true,
    },
})

const emit = defineEmits(['update:options'])

const showAddTagDialog = ref(false)
const newTagName = ref('')

const { onBeforeEnter, onEnter, onAfterEnter, onBeforeLeave, onLeave, onAfterLeave } =
    useSlideTransition()

const tagClass = computed(() => {
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

function isCompleteSet(s: IRandomizerSet): boolean {
    if (s.values.filter((v) => props.options.randomizer.knownTags.indexOf(v.tag) < 0).length > 0) {
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
</script>

<style scoped>
.tagItem {
    width: auto;
    padding: 2px 4px 2px 0;
    min-height: 24px;
}

.tagItem .tagInfo {
    padding-left: 4px;
}

.tagItem .tagInfo .tagName {
    font-weight: bold;
    line-height: 1.2;
}

.tagItem .tagInfo .tagString {
    margin-top: -2px;
    color: #94a3b8;
    font-size: 75%;
    line-height: 1.2;
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
