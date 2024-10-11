<template>
    <div>
        <q-card>
            <q-card-section class="text-overline"
                >{{ $t('RandomizerSettings.Caption') }}
                <q-toggle v-model="options.randomizer.active" />
            </q-card-section>

            <q-slide-transition>
                <q-card-section class="q-ml-md" v-show="options.randomizer.active">
                    <div class="tagList">
                        <div class="text-subtitle2">
                            {{ $t('RandomizerSettings.Available') }}
                            <q-btn
                                color="primary"
                                class="gt-xs"
                                size="12px"
                                flat
                                dense
                                round
                                icon="add"
                                @click="addTag"
                            />
                        </div>
                        <div class="row q-mb-sm">
                            <div
                                :class="`tagItem q-ml-sm ${tagClass}`"
                                v-for="(tag, i) in options.randomizer.knownTags"
                                v-bind:key="tag"
                            >
                                <div class="row no-wrap">
                                    <div class="tagInfo col-shrink">
                                        <div class="tagName">{{ tag }}</div>
                                        <div class="tagString">{:{{ tag }}}</div>
                                    </div>
                                    <div class="tagAction col-4 q-pl-sm text-right">
                                        <q-btn
                                            class="gt-xs"
                                            size="12px"
                                            flat
                                            dense
                                            round
                                            icon="delete"
                                            @click="removeTag(i)"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="tagList q-mt-lg">
                        <div class="text-subtitle2">
                            {{ $t('RandomizerSettings.Sets') }}
                            <q-btn
                                color="primary"
                                class="gt-xs"
                                size="12px"
                                flat
                                dense
                                round
                                icon="add"
                                @click="addSet"
                            />
                        </div>

                        <q-list class="setList">
                            <q-item v-for="(s, i) in options.randomizer.sets" v-bind:key="s.uuid">
                                <q-item-section avatar>
                                    <q-avatar
                                        color="primary"
                                        text-color="white"
                                        :disabled="!isVisible(i)"
                                    >
                                        {{ i }}
                                    </q-avatar>
                                </q-item-section>
                                <q-item-section>
                                    <q-item-label>{{ s.title }}</q-item-label>
                                    <q-item-label caption lines="2">
                                        <div class="row q-mb-sm">
                                            <div
                                                :class="`tagItem q-ml-sm ${tagClass}`"
                                                v-for="tag in s.values"
                                                v-bind:key="tag.name"
                                            >
                                                <div class="row no-wrap">
                                                    <div class="tagInfo col-shrink">
                                                        <div class="tagName">{{ tag.tag }}</div>
                                                        <div class="tagString">{{ tag.value }}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </q-item-label>
                                </q-item-section>

                                <q-item-section side top>
                                    <div class="text-grey-8 q-gutter-xs">
                                        <q-icon
                                            :name="isCompleteSet(s) ? 'check' : 'warning'"
                                            :color="isCompleteSet(s) ? 'positive' : 'negative'"
                                            size="24px"
                                            class="q-mr-lg"
                                        />

                                        <q-btn
                                            class="gt-xs"
                                            size="12px"
                                            flat
                                            dense
                                            round
                                            :icon="isVisible(i) ? 'visibility' : 'visibility_off'"
                                            @click="setVisible(i)"
                                        >
                                            <q-tooltip :delay="200" :offset="[0, 10]">
                                                Use this set when running code in preview or
                                                editMode.
                                            </q-tooltip>
                                        </q-btn>

                                        <q-btn
                                            class="gt-xs"
                                            size="12px"
                                            flat
                                            dense
                                            round
                                            icon="edit"
                                        >
                                            <RandomizerSetEditor
                                                :options="options"
                                                :tagSet="getFullSet(s)"
                                                :nr="i"
                                            />
                                        </q-btn>
                                        <q-btn
                                            class="gt-xs"
                                            size="12px"
                                            flat
                                            dense
                                            round
                                            icon="delete"
                                            @click="removeSet(i)"
                                        />
                                    </div>
                                </q-item-section>
                            </q-item>
                        </q-list>
                    </div>
                </q-card-section>
            </q-slide-transition>
        </q-card>
    </div>
</template>

<script lang="ts">
import RandomizerSetEditor from '@/components/RandomizerSetEditor.vue'
import { IRandomizerSet } from '@/lib/ICodeBlocks'
import { ICodeBlockSettingsOptions } from '@/components/CodeBlocksSettings.vue'
import Vue, { computed, ComputedRef, defineComponent, getCurrentInstance, PropType } from 'vue'
import { tagger } from '@/plugins/tagger'
import { uuid } from 'vue-uuid'
import { useQuasar } from 'quasar'

export default defineComponent({
    name: 'RandomizerSettings',
    components: { RandomizerSetEditor },
    props: {
        options: {
            type: Object as PropType<ICodeBlockSettingsOptions>,
            required: true,
        },
    },
    setup(props, context) {
        const instance = getCurrentInstance()
        const q = useQuasar()

        let _newTagName: string = ''

        const tagClass: ComputedRef<String> = computed(() => {
            return tagger.className.rnd + ' tag-mark-start tag-mark-end tag-mark-shadow'
        })

        function isVisible(nr: number): boolean {
            return nr == props.options.randomizer.previewIndex
        }

        function setVisible(nr: number): void {
            props.options.randomizer.previewIndex = nr
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
            props.options.randomizer.sets.splice(nr, 1)
        }

        function addSet(): void {
            props.options.randomizer.sets.push({ uuid: uuid.v4(), values: [] })
        }

        function removeTag(nr: number): void {
            props.options.randomizer.knownTags.splice(nr, 1)
        }

        function addTag(): void {
            q?.dialog({
                title: 'Create Tag',
                message: 'This will generate a new randomizer-Tag with the below name.',
                html: true,
                persistent: true,
                prompt: {
                    model: 'tag_name',
                    type: 'text',
                },
                ok: {
                    push: true,
                },
                cancel: {
                    flat: true,
                    color: 'gray',
                },
            })
                .onOk((data) => {
                    data = data.replace(/\W/g, '_')
                    //have this name
                    if (props.options.randomizer.knownTags.filter((t) => t == data).length > 0) {
                        let ct = 1
                        const odata = data
                        do {
                            data = odata + '_' + ct
                            ct++
                        } while (
                            props.options.randomizer.knownTags.filter((t) => t == data).length > 0
                        )
                    }
                    props.options.randomizer.knownTags.push(data)
                })
                .onCancel(() => {})
                .onDismiss(() => {
                    //self.highlighted = false;
                })
        }

        return {
            tagClass,
            isVisible,
            setVisible,
            isValidTag,
            isCompleteSet,
            getFullSet,
            removeSet,
            addSet,
            removeTag,
            addTag,
        }
    },
})
</script>

<style lang="stylus" scoped>
//@import '../styles/quasar.variables.styl'
.tagItem
    width: auto
    padding-bottom: 1px
    min-height: 24px

    .tagInfo
        padding-left: 4px

        .tagName
            font-weight: bold

        .tagString
            margin-top: -4px
            color: $blue-grey-4
            font-size: 75%

    .tagAction
        padding-top: 2px
        color: $blue-grey-8
        min-width: 36px

.setList
    .tagItem

        .tagInfo
            padding-right: 4px

            .tagName
                font-weight: inherit
                font-size: 75%

            .tagString
                font-weight: bold
                color: black
                font-size: inherit
</style>
