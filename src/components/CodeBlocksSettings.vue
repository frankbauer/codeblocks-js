<template>
    <div class="row q-pa-none q-mb-md">
        <div class="col-xs-12 col-sm-12 col-md-6">
            <q-card class="q-mb-sm q-mr-sm-none q-mr-md-sm">
                <q-card-section class="text-overline">{{
                    $t('CodeBlocksSettings.Language')
                }}</q-card-section>
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
                                class="bg-orange text-white col-12 q-mt-xs"
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
                                class="bg-yellow-12 text-black col-12 q-mt-xs"
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
                        <div class="col-12" v-if="runCode && !keepAlive">
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
                            /><q-btn
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
                            /><q-btn
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
                            /><q-btn
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
                    <q-card-section class="text-overline">{{
                        $t('CodeBlocksSettings.Output')
                    }}</q-card-section>
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
                <q-card-section class="text-overline">{{
                    $t('CodeBlocksSettings.Themes')
                }}</q-card-section>
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
                <q-card class="q-mr-sm-none q-mt-sm" v-if="runCode">
                    <q-card-section class="text-overline">{{
                        $t('CodeBlocksSettings.Libraries')
                    }}</q-card-section>
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
import 'reflect-metadata'
import { Vue, Component, Prop } from 'vue-property-decorator'
import RandomizerSettings from '@/components/RandomizerSettings.vue'
import { IListItemData, ICompilerID } from '@/lib/ICompilerRegistry'
import { CodeOutputTypes, IRandomizerSettings } from '@/lib/ICodeBlocks'

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

@Component({ components: { RandomizerSettings } })
export default class CodeBlocksSettings extends Vue {
    get themes(): IListItemData[] {
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
    }

    get outputParsers(): IListItemData[] {
        return [
            { label: this.$l('CodeBlocksSettings.PAutomatic'), value: CodeOutputTypes.AUTO },
            { label: this.$l('CodeBlocksSettings.PText'), value: CodeOutputTypes.TEXT },
            { label: this.$l('CodeBlocksSettings.PJSON'), value: CodeOutputTypes.JSON },
            { label: this.$l('CodeBlocksSettings.PData'), value: CodeOutputTypes.DATA },
            { label: this.$l('CodeBlocksSettings.PMagic'), value: CodeOutputTypes.MAGIC },
        ]
    }
    @Prop({ required: true }) options!: ICodeBlockSettingsOptions

    validNumber(v: any): boolean | string {
        if (isNaN(v)) {
            return 'Must be a valid Number.'
        }
        return true
    }

    get serializedOptions(): string {
        const o: any = {
            ...this.options,
        }
        o.randomizer = {
            ...this.options.randomizer,
        }
        o.randomizer.sets = this.options.randomizer.sets.map((s) => {
            let values = {}
            s.values.forEach((v) => (values[v.tag] = v.value))
            return values
        })
        return JSON.stringify(o)
    }
    set serializedOptions(v: string) {}

    get domLibraries(): IListItemData[] {
        return this.$compilerRegistry.domLibraries
    }
    get compiledLanguages(): IListItemData[] {
        if (this.options.runCode === false) {
            return this.languages
        }
        return this.$compilerRegistry.languages
    }
    get workerLibraries(): IListItemData[] {
        const c = this.$compilerRegistry.getCompiler({
            languageType: this.compilerLanguage,
            version: this.compilerVersion,
        })
        if (c === undefined || c.libraries === undefined) {
            return []
        }
        return c.libraries.map((l) => {
            return { label: l.displayName, value: l.key }
        })
    }
    get languages(): IListItemData[] {
        return this.$CodeBlock.knownLanguages()
    }
    get compilerVersions(): string[] {
        return this.$compilerRegistry.versionsForLanguage(this.compilerLanguage)
    }

    isExperimentalVersion(language: string, version: string): boolean {
        const c = this.$compilerRegistry.getCompiler({
            languageType: language,
            version: version,
        })
        if (c === undefined) {
            return false
        }
        return c.experimental
    }

    isDeprecatedVersion(language: string, version: string): boolean {
        const c = this.$compilerRegistry.getCompiler({
            languageType: language,
            version: version,
        })
        if (c === undefined) {
            return false
        }
        return c.deprecated
    }

    get isExperimental(): boolean {
        const cmp = this.$compilerRegistry.getCompiler(this.compiler)
        if (cmp) {
            return cmp.experimental
        }
        return false
    }

    get isDeprecated(): boolean {
        const cmp = this.$compilerRegistry.getCompiler(this.compiler)
        if (cmp) {
            return cmp.deprecated
        }
        return false
    }

    get languageHasCompiler(): boolean {
        if (this.runCode) {
            return true
        }
        const c = this.$compilerRegistry.getCompiler({ languageType: this.compilerLanguage })
        return c !== undefined
    }
    get compilerLanguage(): string {
        if (this.options.runCode === false) {
            return this.options.language
        }
        return this.options.compiler.languageType
    }
    get compilerLanguageObj(): IListItemData {
        return Vue.$CodeBlock.itemForValue(this.compiledLanguages, this.compilerLanguage)
    }
    set compilerLanguageObj(v: IListItemData) {
        if (this.options.runCode === false) {
            this.$emit('language-change', v.value)
        }
        this.$emit('compiler-change', v.value)
    }

    get compilerVersion(): string {
        return this.options.compiler.version
    }
    set compilerVersion(v: string) {
        this.$emit('compiler-version-change', v)
    }

    get runCode(): boolean {
        return this.options.runCode
    }
    set runCode(v: boolean) {
        this.$emit('run-state-change', v)
    }

    get maxRuntime(): number {
        return this.options.executionTimeout
    }
    set maxRuntime(v: number) {
        this.$emit('timeout-change', v)
    }

    get maxCharacters(): number {
        return this.options.maxCharacters
    }
    set maxCharacters(v: number) {
        this.$emit('character-limit-change', v)
    }

    get domLibrary(): IListItemData[] {
        return this.options.domLibs
            .map((d) => this.domLibraries.find((k) => k.value == d))
            .filter((v) => v !== undefined) as IListItemData[]
    }
    set domLibrary(v: IListItemData[]) {
        this.$emit(
            'dom-libs-change',
            v.map((vv) => vv.value)
        )
    }

    get workerLibrary(): IListItemData[] {
        return this.options.workerLibs
            .map((d) => this.workerLibraries.find((k) => k.value == d))
            .filter((v) => v !== undefined) as IListItemData[]
    }
    set workerLibrary(v: IListItemData[]) {
        this.$emit(
            'worker-libs-change',
            v.map((vv) => vv.value)
        )
    }

    get solutionTheme(): IListItemData {
        return Vue.$CodeBlock.itemForValue(this.themes, this.options.solutionTheme)
    }
    set solutionTheme(v: IListItemData) {
        this.$emit('theme-change', {
            solution: v.value,
            code: this.options.codeTheme,
        })
    }

    get codeTheme(): IListItemData {
        return Vue.$CodeBlock.itemForValue(this.themes, this.options.codeTheme)
    }
    set codeTheme(v: IListItemData) {
        this.$emit('theme-change', {
            solution: this.options.solutionTheme,
            code: v.value,
        })
    }

    get outputParser(): IListItemData {
        return Vue.$CodeBlock.itemForValue(this.outputParsers, this.options.outputParser)
    }
    set outputParser(v: IListItemData) {
        this.$emit('output-parser-change', v.value)
    }

    get continuousCompile(): boolean {
        return this.options.continuousCompilation
    }
    set continuousCompile(v: boolean) {
        this.$emit('continuous-compile-change', v)
    }
    get compiler(): ICompilerID {
        return this.options.compiler
    }
    get canContinousCompile(): boolean {
        const cmp = this.$compilerRegistry.getCompiler(this.compiler)
        console.d(
            'Continuous Compile - ',
            'can',
            cmp,
            cmp ? cmp.allowsContinousCompilation : false,
            cmp ? cmp.canRun : false
        )
        if (cmp) {
            console.d('Continuous Compile - ', 'can', cmp.allowsContinousCompilation && cmp.canRun)
            return cmp.allowsContinousCompilation && cmp.canRun
        }
        return false
    }

    get allowsMessagePassing(): boolean {
        const cmp = this.$compilerRegistry.getCompiler(this.compiler)
        if (cmp) {
            console.d('Message Passing - ', 'can', cmp.allowsContinousCompilation && cmp.canRun)
            return cmp.allowsMessagePassing && cmp.canRun
        }
        return false
    }

    get messagePassing(): boolean {
        return this.options.messagePassing
    }
    set messagePassing(v: boolean) {
        this.$emit('message-passing-change', v)
    }

    get keepAlive(): boolean {
        return this.options.keepAlive
    }
    set keepAlive(v: boolean) {
        this.$emit('keep-alive-change', v)
    }

    get persistentArguments(): boolean {
        return this.options.persistentArguments
    }
    set persistentArguments(v: boolean) {
        this.$emit('persistent-arguments-change', v)
    }
    get canPersistentArguments(): boolean {
        const cmp = this.$compilerRegistry.getCompiler(this.compiler)
        if (cmp) {
            console.d(
                'Persistent Arguments - ',
                'can',
                cmp.acceptsJSONArgument && cmp.allowsPersistentArguments && cmp.canRun
            )
            return cmp.acceptsJSONArgument && cmp.allowsPersistentArguments && cmp.canRun
        }
        return false
    }

    get accepstArguments(): boolean {
        const cmp = this.$compilerRegistry.getCompiler(this.compiler)
        if (cmp) {
            return cmp.acceptsJSONArgument
        }
        return false
    }
    showArgsInfoDialog(): void {
        this.showInfoDialog(
            'CodeBlocksSettings.AllowArgumentsCaption',
            this.compiler.languageType == 'java'
                ? 'CodeBlocksSettings.AllowArgumentsHintJava'
                : 'CodeBlocksSettings.AllowArgumentsHint'
        )
    }
    showPersistentArgsInfoDialog(): void {
        this.showInfoDialog(
            'CodeBlocksSettings.UsePersistentArgumentsCaption',
            this.compiler.languageType == 'java'
                ? 'CodeBlocksSettings.UsePersistentArgumentsHintJava'
                : 'CodeBlocksSettings.UsePersistentArgumentsHint'
        )
    }
    showMessagesInfoDialog(): void {
        this.showInfoDialog(
            'CodeBlocksSettings.AllowMessagePassingCaption',
            this.compiler.languageType == 'java'
                ? 'CodeBlocksSettings.AllowMessagePassingHintJava'
                : 'CodeBlocksSettings.AllowMessagePassingHint'
        )
    }
    showAliveInfoDialog(): void {
        this.showInfoDialog(
            'CodeBlocksSettings.KeepAliveCaption',
            this.compiler.languageType == 'java'
                ? 'CodeBlocksSettings.KeepAliveHintJava'
                : 'CodeBlocksSettings.KeepAliveHint'
        )
    }

    showInfoDialog(title, message): void {
        this.$q
            .dialog({
                title: this.$l(title),
                message: this.$l(message),
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
}
</script>

<style lang="sass" scoped>
textarea.blocksettings
    display : none !important
    width : 1px
    height : 1px
</style>
