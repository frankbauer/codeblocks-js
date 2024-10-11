<template>
    <div class="row q-pa-none q-mb-md">
        <div class="col-xs-12 col-sm-12 col-md-6">
            <q-card class="q-mb-sm q-mr-sm-none q-mr-md-sm">
                <q-card-section class="text-overline"
                    >{{ $t('CodeBlocksSettings.Language') }}
                </q-card-section>
                <q-card-section class="q-ml-md">
                    <div class="row">
                        <div class="col-12">
                            <q-toggle
                                v-model="runCode"
                                :disabled="!languageHasCompiler"
                                :label="$t('CodeBlocksSettings.AllowExec')"
                            />
                        </div>
                        <div class="col-12">
                            <q-toggle
                                v-model="continuousCompile"
                                :disabled="!canContinousCompile"
                                :label="$t('CodeBlocksSettings.ContinousCompile')"
                            />
                        </div>

                        <div
                            :class="`col-xs-12 col-sm-${runCode ? 6 : 12} col-md-${
                                runCode ? 8 : 12
                            } ${runCode ? 'q-pr-md-sm' : ''}`"
                        >
                            <q-select
                                :options="compiledLanguages"
                                v-model="compilerLanguageObj"
                                :label="$t('CodeBlocksSettings.Language')"
                            />
                        </div>
                        <div class="col-xs-12 col-sm-12 col-md-6" v-if="runCode">
                            <q-select
                                :options="compilerVersions"
                                v-model="compilerVersion"
                                stack-label
                                :label="$t('CodeBlocksSettings.CVersion')"
                            >
                                <template v-slot:selected>
                                    {{ compilerVersion }}
                                    <q-avatar
                                        rounded
                                        size="xs"
                                        color="yellow"
                                        text-color="brown-10"
                                        icon="hourglass_disabled"
                                        v-if="isDeprecated"
                                        class="q-ml-xs"
                                    />
                                    <q-avatar
                                        rounded
                                        size="xs"
                                        color="orange"
                                        text-color="white"
                                        icon="whatshot"
                                        v-if="isExperimental"
                                        class="q-ml-xs"
                                    />
                                </template>
                                <template v-slot:option="scope">
                                    <q-item v-bind="scope.itemProps" v-on="scope.itemEvents">
                                        <q-item-section>
                                            <q-item-label>
                                                {{ scope.opt }}

                                                <q-avatar
                                                    rounded
                                                    size="xs"
                                                    color="yellow"
                                                    text-color="brown-10"
                                                    icon="hourglass_disabled"
                                                    v-if="
                                                        isDeprecatedVersion(
                                                            compilerLanguage,
                                                            scope.opt
                                                        )
                                                    "
                                                    class="q-ml-xs"
                                                />
                                                <q-avatar
                                                    rounded
                                                    size="xs"
                                                    color="orange"
                                                    text-color="white"
                                                    icon="whatshot"
                                                    v-if="
                                                        isExperimentalVersion(
                                                            compilerLanguage,
                                                            scope.opt
                                                        )
                                                    "
                                                    class="q-ml-xs"
                                                />
                                            </q-item-label>
                                        </q-item-section>
                                    </q-item>
                                </template>
                            </q-select>
                        </div>
                        <q-slide-transition>
                            <q-banner
                                rounded
                                dense
                                class="bg-orange text-white col-12 q-mt-xs q-mb-md"
                                v-if="isExperimental"
                            >
                                <q-item>
                                    <q-item-section avatar>
                                        <q-icon name="whatshot" style="font-size: 3em"></q-icon>
                                    </q-item-section>
                                    <q-item-section>
                                        <q-item-label overline>
                                            {{ $t('CodeBlocksSettings.ExperimentalCompiler') }}
                                        </q-item-label>
                                        <q-item-label>
                                            {{ $t('CodeBlocksSettings.ExperimentalCompilerDesc') }}
                                        </q-item-label>
                                    </q-item-section>
                                </q-item>
                            </q-banner>
                        </q-slide-transition>
                        <q-slide-transition>
                            <q-banner
                                rounded
                                dense
                                class="bg-yellow-12 text-black col-12 q-mt-xs q-mb-md"
                                v-if="isDeprecated"
                            >
                                <q-item>
                                    <q-item-section avatar>
                                        <q-icon
                                            name="hourglass_disabled"
                                            style="font-size: 3em"
                                        ></q-icon>
                                    </q-item-section>
                                    <q-item-section>
                                        <q-item-label overline>
                                            {{ $t('CodeBlocksSettings.DeprecatedCompiler') }}
                                        </q-item-label>
                                        <q-item-label>
                                            {{ $t('CodeBlocksSettings.DeprecatedCompilerDesc') }}
                                        </q-item-label>
                                    </q-item-section>
                                </q-item>
                            </q-banner>
                        </q-slide-transition>
                        <div class="col-12" v-if="showMaxRuntime">
                            <q-input
                                v-model="maxRuntime"
                                :rules="[validNumber]"
                                :label="$t('CodeBlocksSettings.RunTime')"
                                maxlength="6"
                            />
                        </div>
                        <div
                            class="col-12 text-body2"
                            v-if="runCode && (accepstArguments || allowsMessagePassing)"
                        >
                            {{ $t('CodeBlocksSettings.AllowArguments') }}
                            <q-btn
                                flat
                                round
                                color="primary"
                                icon="info"
                                size="xs"
                                @click="showArgsInfoDialog"
                            ></q-btn>
                        </div>

                        <div class="col-12" v-if="runCode && accepstArguments">
                            <q-toggle
                                v-model="persistentArguments"
                                :disabled="!canPersistentArguments"
                                :label="$t('CodeBlocksSettings.PersistentArguments')"
                            />
                            <q-btn
                                flat
                                round
                                color="primary"
                                icon="info"
                                size="xs"
                                @click="showPersistentArgsInfoDialog"
                            ></q-btn>
                        </div>
                        <div class="col-12" v-if="runCode && allowsMessagePassing">
                            <q-toggle
                                v-model="messagePassing"
                                :disabled="!allowsMessagePassing"
                                :label="$t('CodeBlocksSettings.MessagePassing')"
                            />
                            <q-btn
                                flat
                                round
                                color="primary"
                                icon="info"
                                size="xs"
                                @click="showMessagesInfoDialog"
                            ></q-btn>
                        </div>
                        <div class="col-12 q-pl-lg" v-if="runCode && allowsMessagePassing">
                            <q-toggle
                                v-model="keepAlive"
                                :disabled="!allowsMessagePassing || !messagePassing"
                                :label="$t('CodeBlocksSettings.KeepAlive')"
                            />
                            <q-btn
                                flat
                                round
                                color="primary"
                                icon="info"
                                size="xs"
                                @click="showAliveInfoDialog"
                            ></q-btn>
                        </div>
                    </div>
                </q-card-section>
            </q-card>
        </div>

        <div class="col-xs-12 col-sm-12 col-md-6">
            <q-slide-transition>
                <q-card class="q-mb-sm q-mr-none" v-if="runCode">
                    <q-card-section class="text-overline"
                        >{{ $t('CodeBlocksSettings.Output') }}
                    </q-card-section>
                    <q-card-section class="q-ml-md">
                        <div class="row">
                            <div class="col-xs-12 col-md-6 col-12 q-pr-md-sm">
                                <q-input
                                    v-model="maxCharacters"
                                    :rules="[validNumber]"
                                    :label="$t('CodeBlocksSettings.MaxCharacters')"
                                    maxlength="6"
                                />
                            </div>
                            <div class="col-xs-12 col-md-6">
                                <q-select
                                    :options="outputParsers"
                                    v-model="outputParser"
                                    :label="$t('CodeBlocksSettings.Parser')"
                                />
                            </div>
                        </div>
                    </q-card-section>
                </q-card>
            </q-slide-transition>
            <q-card class="q-mr-none">
                <q-card-section class="text-overline"
                    >{{ $t('CodeBlocksSettings.Themes') }}
                </q-card-section>
                <q-card-section class="q-ml-md">
                    <div class="row" dense>
                        <div class="col-xs-12 col-md-6 q-pr-md-sm">
                            <q-select
                                :options="themes"
                                v-model="codeTheme"
                                :label="$t('CodeBlocksSettings.TGeneral')"
                            />
                        </div>
                        <div class="col-xs-12 col-md-6">
                            <q-select
                                :options="themes"
                                v-model="solutionTheme"
                                :label="$t('CodeBlocksSettings.TSolution')"
                            />
                        </div>
                    </div>
                </q-card-section>
            </q-card>

            <q-slide-transition>
                <q-card class="q-mr-sm-none q-mt-sm">
                    <q-card-section class="text-overline"
                        >{{ $t('CodeBlocksSettings.Libraries') }}
                    </q-card-section>
                    <q-card-section class="q-ml-md">
                        <div class="row q-my-none q-py-none" dense>
                            <div class="col-xs-12 col-sm-12 q-my-none q-py-none">
                                <q-select
                                    :options="domLibraries"
                                    v-model="domLibrary"
                                    multiple
                                    use-chips
                                    stack-label
                                    deletable-chips
                                    :label="$t('CodeBlocksSettings.DomLibs')"
                                />
                            </div>
                            <div
                                class="col-xs-12 col-sm-12 q-my-none q-py-none"
                                v-if="runCode && workerLibraries.length > 0"
                            >
                                <q-select
                                    :options="workerLibraries"
                                    v-model="workerLibrary"
                                    multiple
                                    use-chips
                                    stack-label
                                    deletable-chips
                                    :label="$t('CodeBlocksSettings.WorkLibs')"
                                />
                            </div>
                        </div>
                    </q-card-section>
                </q-card>
            </q-slide-transition>
        </div>
        <div :class="`col-xs-${options.randomizer.active ? '12' : '12'} q-mt-sm`">
            <RandomizerSettings :options="options" />
        </div>
        <div class="col-xs-12">
            <textarea
                :name="`block_settings[${this.options.id}]`"
                class="blocksettings"
                v-model="serializedOptions"
            ></textarea>
        </div>
    </div>
</template>

<script lang="ts">
import RandomizerSettings from '@/components/RandomizerSettings.vue'
import { IListItemData, ICompilerID } from '@/lib/ICompilerRegistry'
import { CodeOutputTypes, IRandomizerSettings } from '@/lib/ICodeBlocks'
import Vue, { computed, ComputedRef, defineComponent, getCurrentInstance, PropType } from 'vue'
import compilerRegistry from '@/lib/CompilerRegistry'
import { globalState } from '@/lib/globalState'
import { l } from '@/plugins/i18n'
import { useQuasar } from 'quasar'

export interface ICodeBlockSettingsOptions {
    language: string
    compiler: ICompilerID
    executionTimeout: number
    maxCharacters: number
    runCode: boolean
    domLibs: string[]
    workerLibs: string[]
    id: number
    codeTheme: string
    solutionTheme: string
    outputParser: CodeOutputTypes
    randomizer: IRandomizerSettings
    continuousCompilation: boolean
    persistentArguments: boolean
    messagePassing: boolean
    keepAlive: boolean
}

export default defineComponent({
    name: 'CodeBlocksSettings',
    components: { RandomizerSettings },
    props: {
        options: {
            type: Object as PropType<ICodeBlockSettingsOptions>,
            required: true,
        },
    },
    emits: [
        'language-change',
        'compiler-change',
        'timeout-change',
        'character-limit-change',
        'run-state-change',
        'dom-libs-change',
        'worker-libs-change',
        'theme-change',
        'output-parser-change',
        'continuous-compile-change',
        'persistent-arguments-change',
        'message-passing-change',
        'keep-alive-change',
        'compiler-version-change',
    ],
    setup(props, context) {
        const instance = getCurrentInstance()
        const q = useQuasar()
        const t = instance?.proxy?.$root?.$t
        //Computed
        const themes: ComputedRef<IListItemData[]> = computed(() => {
            return [
                { label: 'Solarized', value: 'solarized light' },
                { label: 'Solarized (dark)', value: 'solarized dark' },
                { label: 'Base16 (dark)', value: 'base16-dark' },
                { label: 'Base16 (light)', value: 'base16-light' },
                { label: 'Duotone (dark)', value: 'duotone-dark' },
                { label: 'Duotone (light)', value: 'duotone-light' },
                { label: 'XQ (dark)', value: 'xq-dark' },
                { label: 'XQ (light)', value: 'xq-light' },
                { label: 'Blackboard', value: 'blackboard' },
                { label: 'neo', value: 'neo' },
                { label: 'mbo', value: 'mbo' },
                { label: 'mdn like', value: 'mdn-like' },
            ]
        })

        const outputParsers: ComputedRef<IListItemData[]> = computed(() => {
            return [
                { label: l('CodeBlocksSettings.PAutomatic'), value: CodeOutputTypes.AUTO },
                { label: l('CodeBlocksSettings.PText'), value: CodeOutputTypes.TEXT },
                { label: l('CodeBlocksSettings.PJSON'), value: CodeOutputTypes.JSON },
                { label: l('CodeBlocksSettings.PData'), value: CodeOutputTypes.DATA },
                { label: l('CodeBlocksSettings.PMagic'), value: CodeOutputTypes.MAGIC },
            ]
        })

        const serializedOptions = computed({
            get: () => {
                const o: any = {
                    ...props.options,
                }
                o.randomizer = {
                    ...props.options.randomizer,
                }
                o.randomizer.sets = props.options.randomizer.sets.map((s) => {
                    let values = {}
                    s.values.forEach((v) => (values[v.tag] = v.value))
                    return values
                })
                return JSON.stringify(o)
            },
            set: (v) => {},
        })

        const compilerLanguage: ComputedRef<string> = computed(() => {
            if (props.options.runCode === false) {
                return props.options.language
            }
            return props.options.compiler.languageType
        })

        const compilerVersion = computed({
            get: () => {
                return props.options.compiler.version
            },
            set: (v) => {
                context.emit('compiler-version-change', v)
            },
        })

        const domLibraries: ComputedRef<IListItemData[]> = computed(() => {
            return compilerRegistry.domLibraries
        })

        const workerLibraries: ComputedRef<IListItemData[]> = computed(() => {
            const c = compilerRegistry.getCompiler({
                languageType: compilerLanguage.value,
                version: compilerVersion.value,
            })
            if (c === undefined || c.libraries === undefined) {
                return []
            }
            return c.libraries.map((l) => {
                return { label: l.displayName, value: l.key }
            })
        })

        const languages: ComputedRef<IListItemData[]> = computed(() => {
            return globalState.appState.knownLanguages()
        })

        const compiledLanguages: ComputedRef<IListItemData[]> = computed(() => {
            if (props.options.runCode === false) {
                return languages.value
            }
            return compilerRegistry.languages
        })

        const compilerVersions: ComputedRef<string[]> = computed(() => {
            return compilerRegistry.versionsForLanguage(compilerLanguage.value)
        })

        const compiler: ComputedRef<ICompilerID> = computed(() => {
            return props.options.compiler
        })

        const runCode = computed({
            get: () => {
                return props.options.runCode
            },
            set: (v) => {
                context.emit('run-state-change', v)
            },
        })

        const isExperimental: ComputedRef<boolean> = computed(() => {
            const cmp = compilerRegistry.getCompiler(compiler.value)
            if (cmp) {
                return cmp.experimental
            }
            return false
        })

        const isDeprecated: ComputedRef<boolean> = computed(() => {
            const cmp = compilerRegistry.getCompiler(compiler.value)
            if (cmp) {
                return cmp.deprecated
            }
            return false
        })

        const languageHasCompiler: ComputedRef<boolean> = computed(() => {
            if (runCode.value) {
                return true
            }
            const c = compilerRegistry.getCompiler({ languageType: compilerLanguage.value })
            return c !== undefined
        })

        const compilerLanguageObj = computed({
            get: () => {
                return globalState.appState.itemForValue(
                    compiledLanguages.value,
                    compilerLanguage.value
                )
            },
            set: (v: IListItemData) => {
                if (props.options.runCode === false) {
                    context.emit('language-change', v.value)
                }
                context.emit('compiler-change', v.value)
            },
        })

        const maxRuntime = computed({
            get: () => {
                return props.options.executionTimeout
            },

            set: (v: number) => {
                context.emit('timeout-change', v)
            },
        })

        const maxCharacters = computed({
            get: () => {
                return props.options.maxCharacters
            },

            set: (v: number) => {
                context.emit('character-limit-change', v)
            },
        })

        const domLibrary = computed({
            get: () => {
                return props.options.domLibs
                    .map((d) => domLibraries.value.find((k) => k.value == d))
                    .filter((v) => v !== undefined) as IListItemData[]
            },

            set: (v: IListItemData[]) => {
                context.emit(
                    'dom-libs-change',
                    v.map((vv) => vv.value)
                )
            },
        })

        const workerLibrary = computed({
            get: () => {
                return props.options.workerLibs
                    .map((d) => workerLibraries.value.find((k) => k.value == d))
                    .filter((v) => v !== undefined) as IListItemData[]
            },

            set: (v: IListItemData[]) => {
                context.emit(
                    'worker-libs-change',
                    v.map((vv) => vv.value)
                )
            },
        })

        const solutionTheme = computed({
            get: () => {
                return globalState.appState.itemForValue(themes.value, props.options.solutionTheme)
            },

            set: (v: IListItemData) => {
                context.emit('theme-change', {
                    solution: v.value,
                    code: props.options.codeTheme,
                })
            },
        })

        const codeTheme = computed({
            get: () => {
                return globalState.appState.itemForValue(themes.value, props.options.codeTheme)
            },

            set: (v: IListItemData) => {
                context.emit('theme-change', {
                    solution: props.options.solutionTheme,
                    code: v.value,
                })
            },
        })

        const outputParser = computed({
            get: () => {
                return globalState.appState.itemForValue(
                    outputParsers.value,
                    props.options.outputParser
                )
            },

            set: (v: IListItemData) => {
                context.emit('output-parser-change', v.value)
            },
        })

        const canContinousCompile: ComputedRef<boolean> = computed(() => {
            const cmp = compilerRegistry.getCompiler(compiler.value)
            console.d(
                'Continuous Compile - ',
                'can',
                cmp,
                cmp ? cmp.allowsContinousCompilation : false,
                cmp ? cmp.canRun : false
            )
            if (cmp) {
                console.d(
                    'Continuous Compile - ',
                    'can',
                    cmp.allowsContinousCompilation && cmp.canRun
                )
                return cmp.allowsContinousCompilation && cmp.canRun
            }
            return false
        })

        const continuousCompile = computed({
            get: () => {
                return props.options.continuousCompilation
            },

            set: (v: boolean) => {
                context.emit('continuous-compile-change', v)
            },
        })

        const allowsMessagePassing: ComputedRef<boolean> = computed(() => {
            const cmp = compilerRegistry.getCompiler(compiler.value)
            if (cmp) {
                console.d('Message Passing - ', 'can', cmp.allowsContinousCompilation && cmp.canRun)
                return cmp.allowsMessagePassing && cmp.canRun
            }
            return false
        })

        const messagePassing = computed({
            get: () => {
                return props.options.messagePassing
            },

            set: (v: boolean) => {
                context.emit('message-passing-change', v)
            },
        })

        const keepAlive = computed({
            get: () => {
                return props.options.keepAlive
            },

            set: (v: boolean) => {
                context.emit('keep-alive-change', v)
            },
        })

        const showMaxRuntime: ComputedRef<boolean> = computed(() => {
            return runCode.value && !(keepAlive.value && messagePassing.value)
        })

        const allowsREPL: ComputedRef<boolean> = computed(() => {
            const cmp = compilerRegistry.getCompiler(compiler.value)
            if (cmp) {
                console.d(
                    'REPL - ',
                    'can',
                    cmp.allowsREPL && cmp.allowsMessagePassing && cmp.canRun
                )
                return cmp.allowsREPL && cmp.allowsMessagePassing && cmp.canRun
            }
            return false
        })

        const persistentArguments = computed({
            get: () => {
                return props.options.persistentArguments
            },

            set: (v: boolean) => {
                context.emit('persistent-arguments-change', v)
            },
        })

        const canPersistentArguments: ComputedRef<boolean> = computed(() => {
            const cmp = compilerRegistry.getCompiler(compiler.value)
            if (cmp) {
                console.d(
                    'Persistent Arguments - ',
                    'can',
                    cmp.acceptsJSONArgument && cmp.allowsPersistentArguments && cmp.canRun
                )
                return cmp.acceptsJSONArgument && cmp.allowsPersistentArguments && cmp.canRun
            }
            return false
        })

        const accepstArguments: ComputedRef<boolean> = computed(() => {
            const cmp = compilerRegistry.getCompiler(compiler.value)
            if (cmp) {
                return cmp.acceptsJSONArgument
            }
            return false
        })

        //local Methods
        function showInfoDialog(title, message): void {
            if (l === undefined) {
                return
            }
            q?.dialog({
                title: l(title),
                message: l(message),
                html: true,
                style: 'width:75%',
            })
                .onOk(() => {
                    // console.log('OK')
                })
                .onCancel(() => {
                    // console.log('Cancel')
                })
                .onDismiss(() => {
                    // console.log('I am triggered on both OK and Cancel')
                })
        }

        //exposed methods
        function showArgsInfoDialog(): void {
            showInfoDialog(
                'CodeBlocksSettings.AllowArgumentsCaption',
                compiler.value.languageType == 'java'
                    ? 'CodeBlocksSettings.AllowArgumentsHintJava'
                    : 'CodeBlocksSettings.AllowArgumentsHint'
            )
        }

        function showPersistentArgsInfoDialog(): void {
            showInfoDialog(
                'CodeBlocksSettings.UsePersistentArgumentsCaption',
                compiler.value.languageType == 'java'
                    ? 'CodeBlocksSettings.UsePersistentArgumentsHintJava'
                    : 'CodeBlocksSettings.UsePersistentArgumentsHint'
            )
        }

        function showMessagesInfoDialog(): void {
            showInfoDialog(
                'CodeBlocksSettings.AllowMessagePassingCaption',
                compiler.value.languageType == 'java'
                    ? 'CodeBlocksSettings.AllowMessagePassingHintJava'
                    : 'CodeBlocksSettings.AllowMessagePassingHint'
            )
        }

        function showAliveInfoDialog(): void {
            showInfoDialog(
                'CodeBlocksSettings.KeepAliveCaption',
                compiler.value.languageType == 'java'
                    ? 'CodeBlocksSettings.KeepAliveHintJava'
                    : 'CodeBlocksSettings.KeepAliveHint'
            )
        }

        function isExperimentalVersion(language: string, version: string): boolean {
            const c = compilerRegistry.getCompiler({
                languageType: language,
                version: version,
            })
            if (c === undefined) {
                return false
            }
            return c.experimental
        }

        function isDeprecatedVersion(language: string, version: string): boolean {
            const c = compilerRegistry.getCompiler({
                languageType: language,
                version: version,
            })
            if (c === undefined) {
                return false
            }
            return c.deprecated
        }

        function validNumber(v: any): boolean | string {
            if (isNaN(v)) {
                return 'Must be a valid Number.'
            }
            return true
        }

        return {
            themes,
            outputParsers,
            serializedOptions,
            compilerLanguage,
            compilerVersion,
            domLibraries,
            workerLibraries,
            languages,
            compiledLanguages,
            compilerVersions,
            compiler,
            runCode,
            isExperimental,
            isDeprecated,
            languageHasCompiler,
            compilerLanguageObj,
            maxRuntime,
            maxCharacters,
            domLibrary,
            workerLibrary,
            solutionTheme,
            codeTheme,
            outputParser,
            canContinousCompile,
            continuousCompile,
            allowsMessagePassing,
            messagePassing,
            keepAlive,
            showMaxRuntime,
            allowsREPL,
            persistentArguments,
            canPersistentArguments,
            accepstArguments,
            showArgsInfoDialog,
            showPersistentArgsInfoDialog,
            showMessagesInfoDialog,
            showAliveInfoDialog,
            isExperimentalVersion,
            isDeprecatedVersion,
            validNumber,
        }
    },
})
</script>

<style lang="sass" scoped>
textarea.blocksettings
    display: none !important
    width: 1px
    height: 1px
</style>
