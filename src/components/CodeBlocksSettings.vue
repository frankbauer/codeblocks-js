<template>
    <div class="row q-pa-none q-mb-md">
        <div class="col-xs-12 col-sm-4">
            <q-card class="q-mb-sm q-mr-sm-xs">
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
                                v-model="continousCompile"
                                :disabled="!canContinousCompile"
                                :label="$t('CodeBlocksSettings.ContinousCompile')"
                            />
                        </div>

                        <div
                            :class="
                                `col-xs-12 col-md-${runCode ? 8 : 12} ${
                                    runCode ? 'q-pr-md-sm' : ''
                                }`
                            "
                        >
                            <q-select
                                :options="compiledLanguages"
                                v-model="compilerLanguageObj"
                                :label="$t('CodeBlocksSettings.Language')"
                            />
                        </div>
                        <div class="col-xs-12 col-md-4" v-if="runCode">
                            <q-select
                                :options="compilerVersions"
                                v-model="compilerVersion"
                                :label="$t('CodeBlocksSettings.CVersion')"
                            />
                        </div>
                        <div class="col-12" v-if="runCode">
                            <q-input
                                v-model="maxRuntime"
                                :rules="[validNumber]"
                                :label="$t('CodeBlocksSettings.RunTime')"
                                maxlength="6"
                            />
                        </div>
                    </div>
                </q-card-section>
            </q-card>
        </div>

        <div class="col-xs-12 col-sm-4">
            <q-slide-transition>
                <q-card class="q-mb-sm q-mr-sm-xs" v-if="runCode">
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
            <q-card class="q-mr-sm-xs">
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
        </div>

        <q-slide-transition>
            <div class="col-xs-12 col-sm-4" v-if="runCode">
                <q-card>
                    <q-card-section class="text-overline">{{
                        $t('CodeBlocksSettings.Libraries')
                    }}</q-card-section>
                    <q-card-section class="q-ml-md">
                        <div class="row q-my-none q-py-none" dense>
                            <div class="col-xs-12 q-my-none q-py-none">
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
                                class="col-xs-12 q-my-none q-py-none"
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
            </div>
        </q-slide-transition>
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
    continousCompilation: boolean
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
            { label: 'mdn like', value: 'mdn-like' }
        ]
    }

    get outputParsers(): IListItemData[] {
        return [
            { label: this.$l('CodeBlocksSettings.PAutomatic'), value: CodeOutputTypes.AUTO },
            { label: this.$l('CodeBlocksSettings.PText'), value: CodeOutputTypes.TEXT },
            { label: this.$l('CodeBlocksSettings.PJSON'), value: CodeOutputTypes.JSON },
            { label: this.$l('CodeBlocksSettings.PMagic'), value: CodeOutputTypes.MAGIC }
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
            ...this.options
        }
        o.randomizer = {
            ...this.options.randomizer
        }
        o.randomizer.sets = this.options.randomizer.sets.map(s => {
            let values = {}
            s.values.forEach(v => (values[v.tag] = v.value))
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
            version: this.compilerVersion
        })
        if (c === undefined || c.libraries === undefined) {
            return []
        }
        return c.libraries.map(l => {
            return { label: l.displayName, value: l.key }
        })
    }
    get languages(): IListItemData[] {
        return this.$CodeBlock.knownLanguages()
    }
    get compilerVersions(): string[] {
        return this.$compilerRegistry.versionsForLanguage(this.compilerLanguage)
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
            .map(d => this.domLibraries.find(k => k.value == d))
            .filter(v => v !== undefined) as IListItemData[]
    }
    set domLibrary(v: IListItemData[]) {
        this.$emit(
            'dom-libs-change',
            v.map(vv => vv.value)
        )
    }

    get workerLibrary(): IListItemData[] {
        return this.options.workerLibs
            .map(d => this.workerLibraries.find(k => k.value == d))
            .filter(v => v !== undefined) as IListItemData[]
    }
    set workerLibrary(v: IListItemData[]) {
        this.$emit(
            'worker-libs-change',
            v.map(vv => vv.value)
        )
    }

    get solutionTheme(): IListItemData {
        return Vue.$CodeBlock.itemForValue(this.themes, this.options.solutionTheme)
    }
    set solutionTheme(v: IListItemData) {
        this.$emit('theme-change', {
            solution: v.value,
            code: this.options.codeTheme
        })
    }

    get codeTheme(): IListItemData {
        return Vue.$CodeBlock.itemForValue(this.themes, this.options.codeTheme)
    }
    set codeTheme(v: IListItemData) {
        this.$emit('theme-change', {
            solution: this.options.solutionTheme,
            code: v.value
        })
    }

    get outputParser(): IListItemData {
        return Vue.$CodeBlock.itemForValue(this.outputParsers, this.options.outputParser)
    }
    set outputParser(v: IListItemData) {
        this.$emit('output-parser-change', v.value)
    }

    get continousCompile(): boolean {
        return this.options.continousCompilation
    }
    set continousCompile(v: boolean) {
        this.$emit('continous-compile-change', v)
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
            cmp ? cmp.canCompileOnType : false,
            cmp ? cmp.canRun : false
        )
        if (cmp) {
            console.d('Continuous Compile - ', 'can', cmp.canCompileOnType && cmp.canRun)
            return cmp.canCompileOnType && cmp.canRun
        }
        return false
    }
}
</script>

<style lang="sass" scoped>
textarea.blocksettings
    display : none !important
    width : 1px
    height : 1px
</style>
