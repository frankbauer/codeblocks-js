<template>
    <div class="tw-w-full">
        <div class="tw-flex tw-flex-col tw-gap-2">
            <div
                class="tw-flex tw-justify-between tw-items-center tw-p-3 tw-bg-card tw-rounded-lg tw-border"
            >
                <div class="tw-flex tw-items-center tw-gap-2 tw-flex-wrap">
                    <Badge>
                        <Code2 class="tw-w-4 tw-h-4 tw-mr-2" />
                        {{ compilerLanguage.label }}
                    </Badge>
                    <Badge variant="outline">
                        <span class="tw-flex tw-items-center">
                            {{
                                runCode
                                    ? `v${compilerVersion}`
                                    : `(${$t('CodeBlocksSettings.NoExecution')})`
                            }}
                            <HoverCard v-if="isDeprecated">
                                <HoverCardTrigger>
                                    <AlertTriangle
                                        v-if="isDeprecated"
                                        class="tw-w-4 tw-h-4 tw-ml-2 tw-text-gray-400"
                                    />
                                </HoverCardTrigger>
                                <HoverCardContent class="tw-w-80">
                                    <h4
                                        class="tw-text-xs tw-font-medium tw-mb-0 tw-text-yellow-600"
                                    >
                                        {{ $t('CodeBlocksSettings.DeprecatedCompiler') }}
                                    </h4>
                                    <p class="tw-text-xs tw-mt-2 tw-text-yellow-500">
                                        {{ $t('CodeBlocksSettings.DeprecatedCompilerDesc') }}
                                    </p>
                                </HoverCardContent>
                            </HoverCard>

                            <HoverCard v-if="isExperimental">
                                <HoverCardTrigger>
                                    <Flame
                                        v-if="isExperimental"
                                        class="tw-w-4 tw-h-4 tw-ml-2 tw-text-orange-500"
                                    />
                                </HoverCardTrigger>
                                <HoverCardContent class="tw-w-80">
                                    <h4
                                        class="tw-text-xs tw-font-medium tw-mb-0 tw-text-orange-600"
                                    >
                                        {{ $t('CodeBlocksSettings.ExperimentalCompiler') }}
                                    </h4>
                                    <p class="tw-text-xs tw-mt-2 tw-text-orange-500">
                                        {{ $t('CodeBlocksSettings.ExperimentalCompilerDesc') }}
                                    </p>
                                </HoverCardContent>
                            </HoverCard>
                        </span>
                    </Badge>
                    <Badge v-if="options.randomizer.active">
                        <Dices class="tw-w-4 tw-h-4 tw-mr-2" />
                        {{ $t('RandomizerSettings.Caption') }}
                    </Badge>
                    <Badge variant="secondary" v-if="showMaxRuntime">
                        <Clock class="tw-w-4 tw-h-4 tw-mr-2" />
                        {{ $t('CodeBlocksSettings.RunTimeShrt') }}:
                        {{ Math.round(maxRuntime / 1000) }}s
                    </Badge>
                    <Badge variant="outline">
                        <Terminal class="tw-w-4 tw-h-4 tw-mr-2" />
                        {{ $t('CodeBlocksSettings.OutputFormat') }}: {{ outputParser.label }}
                    </Badge>
                    <Badge variant="secondary">
                        {{ $t('CodeBlocksSettings.MaxCharacters') }}: {{ maxCharacters }}
                    </Badge>
                    <Badge variant="secondary">
                        <Library class="tw-w-4 tw-h-4 tw-mr-2" />
                        {{ $t('CodeBlocksSettings.DomLibs') }}: {{ domLibrary.length }}
                    </Badge>
                    <Badge v-if="runCode && workerLibraries.length > 0" variant="secondary">
                        {{ $t('CodeBlocksSettings.WorkLibs') }}: {{ workerLibrary.length }}
                    </Badge>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <CButton :icon="Settings" variant="outline" noText />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        class="tw-w-[320px] sm:tw-w-[520px] md:tw-w-[720px] tw-max-h-[90vh] tw-overflow-y-auto modern-scrollbar tw-px-4"
                        align="end"
                    >
                        <div class="tw-p-4">
                            <h3 class="tw-text-lg tw-font-medium">
                                {{ $t('CodeBlocksSettings.Settings') }}
                            </h3>
                            <p class="tw-text-sm tw-text-muted-foreground">
                                {{ $t('CodeBlocksSettings.SettingsDesc') }}
                            </p>
                        </div>

                        <Accordion
                            type="single"
                            collapsible
                            class="tw-w-full [&>*>*>[data-state=open]>.tw-text-xs]:tw-opacity-100"
                        >
                            <AccordionItem value="language">
                                <AccordionTrigger class="tw-items-start">
                                    <div class="tw-flex tw-flex-col tw-w-full">
                                        <div class="tw-flex tw-items-center tw-gap-2">
                                            <Code2 class="tw-w-4 tw-h-4" />
                                            {{ $t('CodeBlocksSettings.Language') }}
                                        </div>
                                        <div
                                            class="tw-text-xs tw-text-muted-foreground tw-mt-0.5 tw-ml-6 tw-font-light tw-text-left tw-opacity-75 tw-transition-opacity"
                                        >
                                            {{
                                                runCode
                                                    ? `${compilerLanguage.label} v${compilerVersion}`
                                                    : `${compilerLanguage.label} (${$t(
                                                          'CodeBlocksSettings.NoExecution'
                                                      )})`
                                            }}
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent class="tw-pl-6 tw-mt-2">
                                    <div class="tw-space-y-4">
                                        <div class="tw-flex tw-flex-col tw-gap-4">
                                            <div class="tw-flex tw-items-center tw-space-x-2">
                                                <Switch
                                                    id="run-code"
                                                    :checked="runCode"
                                                    @update:checked="(val) => (runCode = val)"
                                                    :disabled="!languageHasCompiler"
                                                />
                                                <Label for="run-code">{{
                                                    $t('CodeBlocksSettings.AllowExec')
                                                }}</Label>
                                            </div>

                                            <div class="tw-flex tw-items-center tw-space-x-2">
                                                <Switch
                                                    id="continuous-compile"
                                                    :checked="continuousCompile"
                                                    @update:checked="
                                                        (val) => (continuousCompile = val)
                                                    "
                                                    :disabled="!canContinousCompile"
                                                />
                                                <Label for="continuous-compile">{{
                                                    $t('CodeBlocksSettings.ContinousCompile')
                                                }}</Label>
                                            </div>

                                            <div class="tw-grid tw-gap-4">
                                                <div>
                                                    <CSelect
                                                        v-model="compilerLanguage"
                                                        :options="compiledLanguages"
                                                        :label="$t('CodeBlocksSettings.Language')"
                                                    />
                                                </div>
                                                <div v-if="runCode">
                                                    <CSelect
                                                        :model-value="compilerVersion"
                                                        @update:model-value="
                                                            compilerVersion = $event
                                                        "
                                                        :options="compilerVersions"
                                                        :label="$t('CodeBlocksSettings.CVersion')"
                                                    >
                                                        <template #option="{ option }">
                                                            <div class="tw-flex tw-items-center">
                                                                {{ option }}
                                                                <Badge
                                                                    v-if="
                                                                        isDeprecatedVersion(
                                                                            compilerLanguage,
                                                                            option
                                                                        )
                                                                    "
                                                                    variant="secondary"
                                                                    class="tw-ml-2 tw-inline-flex tw-items-center"
                                                                >
                                                                    <AlertTriangle
                                                                        class="tw-w-4 tw-h-4 tw-text-gray-400"
                                                                    />
                                                                </Badge>
                                                                <Badge
                                                                    v-if="
                                                                        isExperimentalVersion(
                                                                            compilerLanguage,
                                                                            option
                                                                        )
                                                                    "
                                                                    variant="secondary"
                                                                    class="tw-ml-2 tw-inline-flex tw-items-center"
                                                                >
                                                                    <Flame
                                                                        class="tw-w-4 tw-h-4 tw-text-orange-500"
                                                                    />
                                                                </Badge>
                                                            </div>
                                                        </template>
                                                    </CSelect>
                                                </div>
                                            </div>
                                            <Transition
                                                enter-active-class="tw-transition-all tw-duration-300 tw-ease-out"
                                                enter-from-class="tw-transform tw-scale-95 tw-opacity-0"
                                                enter-to-class="tw-transform tw-scale-100 tw-opacity-100"
                                                leave-active-class="tw-transition-all tw-duration-200 tw-ease-in"
                                                leave-from-class="tw-transform tw-scale-100 tw-opacity-100"
                                                leave-to-class="tw-transform tw-scale-95 tw-opacity-0"
                                            >
                                                <Alert
                                                    v-if="isExperimental"
                                                    variant="destructive"
                                                    class="tw-bg-orange-50 tw-border-orange-200 tw-py-2 tw-mb-4 tw-w-full"
                                                >
                                                    <div class="tw-flex tw-gap-2 tw-items-center">
                                                        <Flame
                                                            class="tw-h-12 tw-w-12 tw-text-orange-500"
                                                        />
                                                        <div class="tw-flex-1">
                                                            <AlertTitle
                                                                class="tw-text-xs tw-font-medium tw-mb-0 tw-text-orange-600"
                                                                >{{
                                                                    $t(
                                                                        'CodeBlocksSettings.ExperimentalCompiler'
                                                                    )
                                                                }}</AlertTitle
                                                            >
                                                            <AlertDescription
                                                                class="tw-text-xs tw-mt-1 tw-text-orange-500"
                                                            >
                                                                {{
                                                                    $t(
                                                                        'CodeBlocksSettings.ExperimentalCompilerDesc'
                                                                    )
                                                                }}
                                                            </AlertDescription>
                                                        </div>
                                                    </div>
                                                </Alert>
                                            </Transition>

                                            <Transition
                                                enter-active-class="tw-transition-all tw-duration-300 tw-ease-out"
                                                enter-from-class="tw-transform tw-scale-95 tw-opacity-0"
                                                enter-to-class="tw-transform tw-scale-100 tw-opacity-100"
                                                leave-active-class="tw-transition-all tw-duration-200 tw-ease-in"
                                                leave-from-class="tw-transform tw-scale-100 tw-opacity-100"
                                                leave-to-class="tw-transform tw-scale-95 tw-opacity-0"
                                            >
                                                <Alert
                                                    v-if="isDeprecated"
                                                    variant="destructive"
                                                    class="tw-bg-yellow-50 tw-border-yellow-300 tw-py-2 tw-mb-4 tw-w-full"
                                                >
                                                    <div class="tw-flex tw-gap-2 tw-items-center">
                                                        <AlertTriangle
                                                            class="tw-h-12 tw-w-12 tw-text-yellow-500"
                                                        />
                                                        <div class="tw-flex-1">
                                                            <AlertTitle
                                                                class="tw-text-xs tw-font-medium tw-mb-0 tw-text-yellow-600"
                                                                >{{
                                                                    $t(
                                                                        'CodeBlocksSettings.DeprecatedCompiler'
                                                                    )
                                                                }}</AlertTitle
                                                            >
                                                            <AlertDescription
                                                                class="tw-text-xs tw-mt-1 tw-text-yellow-500"
                                                            >
                                                                {{
                                                                    $t(
                                                                        'CodeBlocksSettings.DeprecatedCompilerDesc'
                                                                    )
                                                                }}
                                                            </AlertDescription>
                                                        </div>
                                                    </div>
                                                </Alert>
                                            </Transition>

                                            <div v-if="showMaxRuntime">
                                                <CInput
                                                    v-model="maxRuntime"
                                                    :rules="[validNumber]"
                                                    :label="$t('CodeBlocksSettings.RunTimeShrt')"
                                                />
                                            </div>

                                            <div class="tw-space-y-2">
                                                <div
                                                    v-if="
                                                        runCode &&
                                                        (accepstArguments || allowsMessagePassing)
                                                    "
                                                    class="tw-flex tw-items-center tw-gap-2"
                                                >
                                                    <div class="tw-text-sm">
                                                        {{
                                                            $t('CodeBlocksSettings.AllowArguments')
                                                        }}
                                                    </div>
                                                    <HoverCard>
                                                        <HoverCardTrigger>
                                                            <Info
                                                                class="tw-h-4 tw-w-4 tw-cursor-help tw-text-muted-foreground hover:tw-text-foreground"
                                                            />
                                                        </HoverCardTrigger>
                                                        <HoverCardContent
                                                            side="right"
                                                            align="start"
                                                            class="tw-w-[280px]"
                                                        >
                                                            <div
                                                                v-html="
                                                                    $t(
                                                                        compiler.languageType ===
                                                                            'java'
                                                                            ? 'CodeBlocksSettings.AllowArgumentsHintJava'
                                                                            : 'CodeBlocksSettings.AllowArgumentsHint'
                                                                    )
                                                                "
                                                                class="hover-content"
                                                            />
                                                        </HoverCardContent>
                                                    </HoverCard>
                                                </div>

                                                <div
                                                    v-if="runCode && accepstArguments"
                                                    class="tw-flex tw-items-center tw-space-x-2"
                                                >
                                                    <Switch
                                                        id="persistent-args"
                                                        :checked="persistentArguments"
                                                        @update:checked="
                                                            (val) => (persistentArguments = val)
                                                        "
                                                        :disabled="!canPersistentArguments"
                                                    />
                                                    <Label for="persistent-args">{{
                                                        $t('CodeBlocksSettings.PersistentArguments')
                                                    }}</Label>
                                                    <HoverCard>
                                                        <HoverCardTrigger>
                                                            <Info
                                                                class="tw-h-4 tw-w-4 tw-cursor-help tw-text-muted-foreground hover:tw-text-foreground"
                                                            />
                                                        </HoverCardTrigger>
                                                        <HoverCardContent
                                                            side="right"
                                                            align="start"
                                                            class="tw-w-[280px]"
                                                        >
                                                            <div
                                                                v-html="
                                                                    $t(
                                                                        compiler.languageType ===
                                                                            'java'
                                                                            ? 'CodeBlocksSettings.UsePersistentArgumentsHintJava'
                                                                            : 'CodeBlocksSettings.UsePersistentArgumentsHint'
                                                                    )
                                                                "
                                                                class="hover-content"
                                                            />
                                                        </HoverCardContent>
                                                    </HoverCard>
                                                </div>

                                                <div
                                                    v-if="runCode && allowsMessagePassing"
                                                    class="tw-flex tw-items-center tw-space-x-2"
                                                >
                                                    <Switch
                                                        id="message-passing"
                                                        :checked="messagePassing"
                                                        @update:checked="
                                                            (val) => (messagePassing = val)
                                                        "
                                                        :disabled="!allowsMessagePassing"
                                                    />
                                                    <Label for="message-passing">{{
                                                        $t('CodeBlocksSettings.MessagePassing')
                                                    }}</Label>
                                                    <HoverCard>
                                                        <HoverCardTrigger>
                                                            <Info
                                                                class="tw-h-4 tw-w-4 tw-cursor-help tw-text-muted-foreground hover:tw-text-foreground"
                                                            />
                                                        </HoverCardTrigger>
                                                        <HoverCardContent
                                                            side="right"
                                                            align="start"
                                                            class="tw-w-[280px]"
                                                        >
                                                            <div
                                                                v-html="
                                                                    $t(
                                                                        compiler.languageType ===
                                                                            'java'
                                                                            ? 'CodeBlocksSettings.AllowMessagePassingHintJava'
                                                                            : 'CodeBlocksSettings.AllowMessagePassingHint'
                                                                    )
                                                                "
                                                                class="hover-content"
                                                            />
                                                        </HoverCardContent>
                                                    </HoverCard>
                                                </div>

                                                <div
                                                    v-if="runCode && allowsMessagePassing"
                                                    class="tw-flex tw-items-center tw-space-x-2 tw-pl-6"
                                                >
                                                    <Switch
                                                        id="keep-alive"
                                                        :checked="keepAlive"
                                                        @update:checked="(val) => (keepAlive = val)"
                                                        :disabled="
                                                            !allowsMessagePassing || !messagePassing
                                                        "
                                                    />
                                                    <Label for="keep-alive">{{
                                                        $t('CodeBlocksSettings.KeepAlive')
                                                    }}</Label>
                                                    <HoverCard>
                                                        <HoverCardTrigger>
                                                            <Info
                                                                class="tw-h-4 tw-w-4 tw-cursor-help tw-text-muted-foreground hover:tw-text-foreground"
                                                            />
                                                        </HoverCardTrigger>
                                                        <HoverCardContent
                                                            side="right"
                                                            align="start"
                                                            class="tw-w-[280px]"
                                                        >
                                                            <div
                                                                v-html="
                                                                    $t(
                                                                        compiler.languageType ===
                                                                            'java'
                                                                            ? 'CodeBlocksSettings.KeepAliveHintJava'
                                                                            : 'CodeBlocksSettings.KeepAliveHint'
                                                                    )
                                                                "
                                                                class="hover-content"
                                                            />
                                                        </HoverCardContent>
                                                    </HoverCard>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="output" v-if="runCode">
                                <AccordionTrigger class="tw-items-start">
                                    <div class="tw-flex tw-flex-col tw-w-full">
                                        <div class="tw-flex tw-items-center tw-gap-2">
                                            <Terminal class="tw-w-4 tw-h-4" />
                                            {{ $t('CodeBlocksSettings.Output') }}
                                        </div>
                                        <div
                                            class="tw-text-xs tw-text-muted-foreground tw-mt-0.5 tw-ml-6 tw-font-light tw-text-left tw-opacity-75 tw-transition-opacity"
                                        >
                                            {{ outputParser.label }} •
                                            {{ $t('CodeBlocksSettings.MaxCharacters') }}:
                                            {{ maxCharacters }}
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent class="tw-pl-6 tw-mt-2">
                                    <div class="tw-space-y-4">
                                        <div class="tw-grid tw-gap-4">
                                            <CInput
                                                v-model="maxCharacters"
                                                :rules="[validNumber]"
                                                :label="$t('CodeBlocksSettings.MaxCharacters')"
                                            />
                                            <CSelect
                                                :model-value="outputParser"
                                                @update:model-value="outputParser = $event"
                                                :options="outputParsers"
                                                :label="$t('CodeBlocksSettings.Parser')"
                                            />
                                        </div>
                                        <CSelect
                                            :model-value="uiTheme"
                                            @update:model-value="uiTheme = $event"
                                            :options="themes"
                                            :label="$t('CodeBlocksSettings.TSolution')"
                                        />
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="libraries">
                                <AccordionTrigger class="tw-items-start">
                                    <div class="tw-flex tw-flex-col tw-w-full">
                                        <div class="tw-flex tw-items-center tw-gap-2">
                                            <Library class="tw-w-4 tw-h-4" />
                                            {{ $t('CodeBlocksSettings.Libraries') }}
                                        </div>
                                        <div
                                            class="tw-text-xs tw-text-muted-foreground tw-mt-0.5 tw-ml-6 tw-font-light tw-text-left tw-opacity-75 tw-transition-opacity"
                                        >
                                            {{ $t('CodeBlocksSettings.DomLibs') }}:
                                            {{ domLibrary.length }}
                                            <template v-if="runCode && workerLibraries.length > 0">
                                                • {{ $t('CodeBlocksSettings.WorkLibs') }}:
                                                {{ workerLibrary.length }}
                                            </template>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent class="tw-pl-6 tw-mt-2">
                                    <div class="tw-space-y-4">
                                        <CMultiSelect
                                            v-model="domLibrary"
                                            :options="domLibraries"
                                            :placeholder="$t('CodeBlocksSettings.SelectDomLibs')"
                                        />
                                        <CMultiSelect
                                            v-if="runCode && workerLibraries.length > 0"
                                            v-model="workerLibrary"
                                            :options="workerLibraries"
                                            :placeholder="$t('CodeBlocksSettings.SelectWorkLibs')"
                                        />
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem
                                value="randomizer"
                                class="tw-border-none tw-border-gray-200"
                            >
                                <AccordionTrigger class="tw-items-start">
                                    <div class="tw-flex tw-flex-col tw-w-full">
                                        <div class="tw-flex tw-items-center tw-gap-2">
                                            <Dices class="tw-w-4 tw-h-4" />
                                            {{ $t('RandomizerSettings.Caption') }}
                                        </div>
                                        <div
                                            class="tw-text-xs tw-text-muted-foreground tw-mt-0.5 tw-ml-6 tw-font-light tw-text-left tw-opacity-75 tw-transition-opacity"
                                        >
                                            {{
                                                options.randomizer.active
                                                    ? $t('RandomizerSettings.Active')
                                                    : $t('RandomizerSettings.Inactive')
                                            }}
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent class="tw-pl-6 tw-mt-2">
                                    <RandomizerSettings :options="options" />
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>

        <textarea
            :name="`block_settings[${options.id}]`"
            class="tw-hidden"
            v-model="serializedOptions"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import RandomizerSettings from './RandomizerSettings.vue'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../shadcn/ui/dropdown-menu'
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '../shadcn/ui/accordion'
import { Switch } from '../shadcn/ui/switch'
import { Label } from '../shadcn/ui/label'
import { Badge } from '../shadcn/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '../shadcn/ui/alert'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../shadcn/ui/hover-card'
import CButton from './ui/CButton.vue'
import CMultiSelect from './ui/CMultiSelect.vue'
import CSelect from './ui/CSelect.vue'
import CInput from './ui/CInput.vue'
import type { IListItemData, ICompilerID } from '@/lib/ICompilerRegistry'
import type { IRandomizerSettings } from '@/lib/ICodeBlocks'
import compilerRegistry from '@/lib/CompilerRegistry'
import { globalState } from '@/lib/globalState'
import { UIThemeType, UIThemeTypes, getUITheme } from '@/lib/uiTheme'
import { useI18n } from 'vue-i18n'
import { CodeOutputTypes } from '@/lib/ICodeBlocks'
import {
    Settings,
    Code2,
    Terminal,
    Library,
    Dices,
    Clock,
    Flame,
    AlertTriangle,
    Info,
} from 'lucide-vue-next'

const props = defineProps<Props>()
const emit = defineEmits([
    'run-state-change',
    'language-change',
    'compiler-change',
    'timeout-change',
    'character-limit-change',
    'dom-libs-change',
    'worker-libs-change',
    'theme-change',
    'output-parser-change',
    'continuous-compile-change',
    'message-passing-change',
    'keep-alive-change',
    'persistent-arguments-change',
    'compiler-version-change',
])

const { t: l } = useI18n()

interface Props {
    options: {
        id: number | string
        language: string
        compiler: ICompilerID
        executionTimeout: number
        maxCharacters: number
        runCode: boolean
        continuousCompilation: boolean
        messagePassing: boolean
        keepAlive: boolean
        persistentArguments: boolean
        domLibs: string[]
        workerLibs: string[]
        uiTheme: UIThemeType
        outputParser: CodeOutputTypes
        randomizer: IRandomizerSettings
    }
}

interface Option {
    value: string | number
    label: string
}

const themes = computed(() => {
    return UIThemeTypes.map((k) => {
        return { value: k, label: getUITheme(k).name }
    })
})

const outputParsers = computed(() => {
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

const compilerLanguage = computed({
    get: () => {
        const value = props.options.runCode
            ? props.options.compiler.languageType
            : props.options.language
        return globalState.appState.itemForValue(compiledLanguages.value, value)
    },
    set: (v: IListItemData) => {
        updateCompilerLanguage(v.value)
    },
})

function updateCompilerLanguage(value: string) {
    if (!props.options.runCode) {
        emit('language-change', value)
        return
    }
    emit('compiler-change', value)
}

const compiledLanguages = computed(() => {
    if (props.options.runCode === false) {
        return languages.value
    }
    return compilerRegistry.languages.map((lang) => ({
        label: lang.label,
        value: lang.value,
    }))
})

const compilerVersion = computed({
    get: () => {
        return props.options.compiler.version
    },
    set: (v) => {
        emit('compiler-version-change', v)
    },
})

const compilerVersions = computed(() => {
    return compilerRegistry.versionsForLanguage(compilerLanguage.value.value)
})

const domLibraries = computed(() => {
    return compilerRegistry.domLibraries
})

const workerLibraries = computed(() => {
    const c = compilerRegistry.getCompiler({
        languageType: compilerLanguage.value.value,
        version: compilerVersion.value,
    })
    if (c === undefined || c.libraries === undefined) {
        return []
    }
    return c.libraries.map((l) => {
        return { label: l.displayName, value: l.key }
    })
})

const languages = computed(() => {
    const knownLangs = globalState.appState.knownLanguages()
    return knownLangs.map((lang) => ({
        label: lang.label,
        value: lang.value.toString(), // Ensure value is a string
    }))
})

const compiler = computed(() => {
    return props.options.compiler
})

const runCode = computed({
    get: () => {
        return props.options.runCode
    },
    set: (v) => {
        emit('run-state-change', v)
    },
})

const isExperimental = computed(() => {
    const cmp = compilerRegistry.getCompiler(compiler.value)
    if (cmp) {
        return cmp.experimental
    }
    return false
})

const isDeprecated = computed(() => {
    const cmp = compilerRegistry.getCompiler(compiler.value)
    if (cmp) {
        return cmp.deprecated
    }
    return false
})

const languageHasCompiler = computed(() => {
    const c = compilerRegistry.getCompiler({ languageType: props.options.language })
    return c !== undefined
})

const maxRuntime = computed({
    get: () => {
        return props.options.executionTimeout
    },

    set: (v: number) => {
        emit('timeout-change', v)
    },
})

const maxCharacters = computed({
    get: () => {
        return props.options.maxCharacters
    },

    set: (v: number) => {
        emit('character-limit-change', v)
    },
})

const domLibrary = computed({
    get: () => {
        return props.options.domLibs
            .map((d) => domLibraries.value.find((k) => k.value == d))
            .filter((v) => v !== undefined) as IListItemData[]
    },

    set: (v: IListItemData[]) => {
        emit(
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
        emit(
            'worker-libs-change',
            v.map((vv) => vv.value)
        )
    },
})

const uiTheme = computed({
    get: () => {
        return globalState.appState.itemForValue(themes.value, props.options.uiTheme)
    },

    set: (v: IListItemData) => {
        emit('theme-change', {
            ui: v.value,
        })
    },
})

const outputParser = computed({
    get: () => {
        return globalState.appState.itemForValue(outputParsers.value, props.options.outputParser)
    },

    set: (v: IListItemData) => {
        emit('output-parser-change', v.value)
    },
})

const canContinousCompile = computed(() => {
    const cmp = compilerRegistry.getCompiler(compiler.value)
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
})

const continuousCompile = computed({
    get: () => {
        return props.options.continuousCompilation
    },

    set: (v: boolean) => {
        emit('continuous-compile-change', v)
    },
})

const allowsMessagePassing = computed(() => {
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
        emit('message-passing-change', v)
    },
})

const keepAlive = computed({
    get: () => {
        return props.options.keepAlive
    },

    set: (v: boolean) => {
        emit('keep-alive-change', v)
    },
})

const showMaxRuntime = computed(() => {
    return runCode.value && !(keepAlive.value && messagePassing.value)
})

const persistentArguments = computed({
    get: () => {
        return props.options.persistentArguments
    },

    set: (v: boolean) => {
        emit('persistent-arguments-change', v)
    },
})

const canPersistentArguments = computed(() => {
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

const accepstArguments = computed(() => {
    const cmp = compilerRegistry.getCompiler(compiler.value)
    if (cmp) {
        return cmp.acceptsJSONArgument
    }
    return false
})

function isExperimentalVersion(
    language: IListItemData,
    version: string | number | Option
): boolean {
    const versionStr = typeof version === 'object' ? version.value.toString() : version.toString()
    const c = compilerRegistry.getCompiler({
        languageType: language.value,
        version: versionStr,
    })
    if (c === undefined) {
        return false
    }
    return c.experimental
}

function isDeprecatedVersion(language: IListItemData, version: string | number | Option): boolean {
    const versionStr = typeof version === 'object' ? version.value.toString() : version.toString()
    const c = compilerRegistry.getCompiler({
        languageType: language.value,
        version: versionStr,
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
</script>

<style>
.hover-content {
    @apply tw-text-sm tw-text-muted-foreground;
    @apply [&>p]:tw-mb-2 [&>ul]:tw-ml-4 [&>ul]:tw-list-disc [&>ul>li]:tw-mb-1;
    @apply [&>code]:tw-px-1.5 [&>code]:tw-py-0.5 [&>code]:tw-bg-muted [&>code]:tw-rounded-sm [&>code]:tw-font-mono [&>code]:tw-text-xs;
    @apply [&>pre]:tw-bg-muted [&>pre]:tw-p-2 [&>pre]:tw-rounded-md [&>pre]:tw-my-2 [&>pre]:tw-font-mono [&>pre]:tw-text-xs;
}
</style>
