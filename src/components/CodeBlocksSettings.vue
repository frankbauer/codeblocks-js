<template>
    <div class="tw-w-full">
        <!-- Toolbar strip -->
        <div
            class="tw-flex tw-items-stretch tw-h-9 tw-rounded-lg tw-border tw-bg-card tw-overflow-hidden tw-text-xs tw-select-none"
        >
            <!-- Scrollable/clippable left section — gear always stays visible -->
            <div class="tw-flex tw-items-stretch tw-overflow-hidden tw-flex-1 tw-min-w-0">
                <!-- Language + version: click → language tab -->
                <button
                    type="button"
                    @click="openDialogOnTab('language')"
                    class="cb-toolbar-item tw-border-r tw-font-medium tw-gap-2"
                >
                    <Code2 class="tw-w-3.5 tw-h-3.5 tw-shrink-0" />
                    <span>{{ compilerLanguage.label }}</span>
                    <span class="tw-text-muted-foreground tw-font-normal">
                        {{ runCode ? `v${compilerVersion}` : $t('CodeBlocksSettings.NoExecution') }}
                    </span>
                    <AlertTriangle
                        v-if="isDeprecated"
                        class="tw-w-3 tw-h-3 tw-text-yellow-500"
                        :title="$t('CodeBlocksSettings.DeprecatedCompiler')"
                    />
                    <Flame
                        v-if="isExperimental"
                        class="tw-w-3 tw-h-3 tw-text-orange-500"
                        :title="$t('CodeBlocksSettings.ExperimentalCompiler')"
                    />
                </button>

                <!-- Randomizer: popover -->
                <Popover v-if="options.randomizer.active">
                    <PopoverTrigger as-child>
                        <button type="button" class="cb-toolbar-item tw-border-r">
                            <Dices class="tw-w-3.5 tw-h-3.5 tw-shrink-0" />
                            <span class="tw-font-medium">{{ options.randomizer.sets.length }}</span>
                            <ChevronDown class="tw-w-3 tw-h-3 tw-text-muted-foreground" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent class="tw-w-72 tw-p-3">
                        <div class="tw-flex tw-items-center tw-gap-2 tw-mb-3">
                            <Switch
                                id="rnd-active-quick"
                                :checked="options.randomizer.active"
                                @update:checked="updateRandomizerActive"
                            />
                            <Label for="rnd-active-quick" class="tw-text-sm tw-font-medium">
                                {{ $t('RandomizerSettings.Active') }}
                            </Label>
                        </div>
                        <div
                            class="tw-space-y-1.5 tw-max-h-56 tw-overflow-y-auto modern-scrollbar"
                        >
                            <div
                                v-for="(s, i) in options.randomizer.sets"
                                :key="s.uuid"
                                class="tw-flex tw-items-center tw-justify-between tw-px-2 tw-py-1.5 tw-rounded-md"
                                :class="isSetVisible(i) ? 'tw-bg-primary/10' : 'tw-bg-muted/50'"
                            >
                                <div class="tw-flex tw-items-center tw-gap-2 tw-min-w-0 tw-flex-1">
                                    <component
                                        :is="isCompleteSet(s) ? Check : AlertTriangle"
                                        :class="[
                                            'tw-h-3.5 tw-w-3.5 tw-shrink-0',
                                            isCompleteSet(s)
                                                ? 'tw-text-green-600'
                                                : 'tw-text-red-600',
                                        ]"
                                    />
                                    <span class="tw-text-sm tw-font-medium tw-shrink-0"
                                        >Set {{ i + 1 }}</span
                                    >
                                    <span
                                        class="tw-text-xs tw-text-muted-foreground tw-truncate"
                                        >{{ setValuesSummary(s) }}</span
                                    >
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    @click="setSetVisible(i)"
                                    class="tw-h-6 tw-w-6 tw-p-0 tw-shrink-0 tw-ml-1"
                                    :title="$t('RandomizerSettings.UseSet')"
                                >
                                    <component
                                        :is="isSetVisible(i) ? Eye : EyeOff"
                                        class="tw-h-3 tw-w-3"
                                    />
                                </Button>
                            </div>
                            <p
                                v-if="options.randomizer.sets.length === 0"
                                class="tw-text-sm tw-text-muted-foreground tw-text-center tw-py-2"
                            >
                                {{ $t('RandomizerSettings.NoSets') }}
                            </p>
                        </div>
                    </PopoverContent>
                </Popover>

                <!-- Timeout: popover -->
                <Popover v-if="showMaxRuntime">
                    <PopoverTrigger as-child>
                        <button type="button" class="cb-toolbar-item tw-border-r">
                            <Clock
                                class="tw-w-3.5 tw-h-3.5 tw-shrink-0 tw-text-muted-foreground"
                            />
                            <span class="tw-font-medium">{{ Math.round(maxRuntime / 1000) }}s</span>
                            <ChevronDown class="tw-w-3 tw-h-3 tw-text-muted-foreground" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent class="tw-w-56 tw-p-3">
                        <CInput
                            v-model="maxRuntime"
                            :rules="[validNumber]"
                            :label="$t('CodeBlocksSettings.RunTimeShrt')"
                        />
                    </PopoverContent>
                </Popover>

                <!-- Output + char limit: click → output tab -->
                <button
                    v-if="runCode"
                    type="button"
                    @click="openDialogOnTab('output')"
                    class="cb-toolbar-item tw-border-r"
                >
                    <Terminal
                        class="tw-w-3.5 tw-h-3.5 tw-shrink-0 tw-text-muted-foreground"
                    />
                    <span class="tw-font-medium">{{ outputParser.label }}</span>
                    <span class="tw-text-muted-foreground">·</span>
                    <span class="tw-text-muted-foreground">{{ maxCharacters }}</span>
                </button>

                <!-- DOM libs: popover -->
                <Popover>
                    <PopoverTrigger as-child>
                        <button type="button" class="cb-toolbar-item tw-border-r">
                            <Library
                                class="tw-w-3.5 tw-h-3.5 tw-shrink-0 tw-text-muted-foreground"
                            />
                            <span class="tw-font-medium">{{ domLibrary.length }}</span>
                            <ChevronDown class="tw-w-3 tw-h-3 tw-text-muted-foreground" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent class="tw-w-72 tw-p-3">
                        <p class="tw-text-xs tw-font-medium tw-text-muted-foreground tw-mb-2">
                            {{ $t('CodeBlocksSettings.DomLibs') }}
                        </p>
                        <CMultiSelect
                            v-model="domLibrary"
                            :options="domLibraries"
                            :placeholder="$t('CodeBlocksSettings.SelectDomLibs')"
                        />
                    </PopoverContent>
                </Popover>

                <!-- Worker libs: popover -->
                <Popover v-if="runCode && workerLibraries.length > 0">
                    <PopoverTrigger as-child>
                        <button type="button" class="cb-toolbar-item tw-border-r">
                            <span class="tw-text-muted-foreground">{{
                                $t('CodeBlocksSettings.WorkLibs')
                            }}</span>
                            <span class="tw-font-medium">{{ workerLibrary.length }}</span>
                            <ChevronDown class="tw-w-3 tw-h-3 tw-text-muted-foreground" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent class="tw-w-72 tw-p-3">
                        <p class="tw-text-xs tw-font-medium tw-text-muted-foreground tw-mb-2">
                            {{ $t('CodeBlocksSettings.WorkLibs') }}
                        </p>
                        <CMultiSelect
                            v-model="workerLibrary"
                            :options="workerLibraries"
                            :placeholder="$t('CodeBlocksSettings.SelectWorkLibs')"
                        />
                    </PopoverContent>
                </Popover>
            </div>

            <!-- Settings gear -->
            <Dialog v-model:open="dialogOpen">
                <DialogTrigger as-child>
                    <button
                        type="button"
                        class="cb-toolbar-item tw-border-l tw-px-3"
                        :title="$t('CodeBlocksSettings.Settings')"
                    >
                        <Settings class="tw-w-3.5 tw-h-3.5" />
                    </button>
                </DialogTrigger>
                <DialogScrollContent
                    class="tw-w-full tw-max-w-lg sm:tw-max-w-xl md:tw-max-w-2xl"
                >
                        <DialogHeader>
                            <DialogTitle>{{ $t('CodeBlocksSettings.Settings') }}</DialogTitle>
                            <DialogDescription>
                                {{ $t('CodeBlocksSettings.SettingsDesc') }}
                            </DialogDescription>
                        </DialogHeader>

                        <!-- Tab bar -->
                        <div class="tw-flex tw-border-b tw-mt-2 tw-gap-0">
                            <button
                                type="button"
                                @click="activeTab = 'language'"
                                class="tw-flex tw-items-center tw-gap-1.5 tw-px-3 tw-py-2 tw-text-sm tw-font-medium tw-border-b-2 tw-transition-colors tw-whitespace-nowrap"
                                :class="activeTab === 'language' ? 'tw-border-primary tw-text-primary' : 'tw-border-transparent tw-text-muted-foreground hover:tw-text-foreground hover:tw-border-muted-foreground/30'"
                            >
                                <Code2 class="tw-w-4 tw-h-4" />
                                {{ $t('CodeBlocksSettings.Language') }}
                            </button>
                            <button
                                v-if="runCode"
                                type="button"
                                @click="activeTab = 'runtime'"
                                class="tw-flex tw-items-center tw-gap-1.5 tw-px-3 tw-py-2 tw-text-sm tw-font-medium tw-border-b-2 tw-transition-colors tw-whitespace-nowrap"
                                :class="activeTab === 'runtime' ? 'tw-border-primary tw-text-primary' : 'tw-border-transparent tw-text-muted-foreground hover:tw-text-foreground hover:tw-border-muted-foreground/30'"
                            >
                                <Play class="tw-w-4 tw-h-4" />
                                {{ $t('CodeBlocksSettings.Runtime') }}
                            </button>
                            <button
                                v-if="runCode"
                                type="button"
                                @click="activeTab = 'output'"
                                class="tw-flex tw-items-center tw-gap-1.5 tw-px-3 tw-py-2 tw-text-sm tw-font-medium tw-border-b-2 tw-transition-colors tw-whitespace-nowrap"
                                :class="activeTab === 'output' ? 'tw-border-primary tw-text-primary' : 'tw-border-transparent tw-text-muted-foreground hover:tw-text-foreground hover:tw-border-muted-foreground/30'"
                            >
                                <Terminal class="tw-w-4 tw-h-4" />
                                {{ $t('CodeBlocksSettings.Output') }}
                            </button>
                            <button
                                type="button"
                                @click="activeTab = 'libraries'"
                                class="tw-flex tw-items-center tw-gap-1.5 tw-px-3 tw-py-2 tw-text-sm tw-font-medium tw-border-b-2 tw-transition-colors tw-whitespace-nowrap"
                                :class="activeTab === 'libraries' ? 'tw-border-primary tw-text-primary' : 'tw-border-transparent tw-text-muted-foreground hover:tw-text-foreground hover:tw-border-muted-foreground/30'"
                            >
                                <Library class="tw-w-4 tw-h-4" />
                                {{ $t('CodeBlocksSettings.Libraries') }}
                            </button>
                            <button
                                type="button"
                                @click="activeTab = 'randomizer'"
                                class="tw-flex tw-items-center tw-gap-1.5 tw-px-3 tw-py-2 tw-text-sm tw-font-medium tw-border-b-2 tw-transition-colors tw-whitespace-nowrap"
                                :class="activeTab === 'randomizer' ? 'tw-border-primary tw-text-primary' : 'tw-border-transparent tw-text-muted-foreground hover:tw-text-foreground hover:tw-border-muted-foreground/30'"
                            >
                                <Dices class="tw-w-4 tw-h-4" />
                                {{ $t('RandomizerSettings.Caption') }}
                            </button>
                        </div>

                        <!-- Tab: Language -->
                        <div v-if="activeTab === 'language'" class="tw-space-y-4 tw-mt-4">
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
                                    @update:checked="(val) => (continuousCompile = val)"
                                    :disabled="!canContinousCompile"
                                />
                                <Label for="continuous-compile">{{
                                    $t('CodeBlocksSettings.ContinousCompile')
                                }}</Label>
                            </div>

                            <div class="tw-grid tw-gap-4">
                                <CSelect
                                    v-model="compilerLanguage"
                                    :options="compiledLanguages"
                                    :label="$t('CodeBlocksSettings.Language')"
                                />
                                <CSelect
                                    v-if="runCode"
                                    :model-value="compilerVersion"
                                    @update:model-value="compilerVersion = $event"
                                    :options="compilerVersions"
                                    :label="$t('CodeBlocksSettings.CVersion')"
                                >
                                    <template #option="{ option }">
                                        <div class="tw-flex tw-items-center">
                                            {{ option }}
                                            <Badge
                                                v-if="
                                                    isDeprecatedVersion(compilerLanguage, option)
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
                                                    isExperimentalVersion(compilerLanguage, option)
                                                "
                                                variant="secondary"
                                                class="tw-ml-2 tw-inline-flex tw-items-center"
                                            >
                                                <Flame class="tw-w-4 tw-h-4 tw-text-orange-500" />
                                            </Badge>
                                        </div>
                                    </template>
                                </CSelect>
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
                                    class="tw-bg-orange-50 tw-border-orange-200 tw-py-2 tw-w-full"
                                >
                                    <div class="tw-flex tw-gap-2 tw-items-center">
                                        <Flame class="tw-h-12 tw-w-12 tw-text-orange-500" />
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
                                    class="tw-bg-yellow-50 tw-border-yellow-300 tw-py-2 tw-w-full"
                                >
                                    <div class="tw-flex tw-gap-2 tw-items-center">
                                        <AlertTriangle
                                            class="tw-h-12 tw-w-12 tw-text-yellow-500"
                                        />
                                        <div class="tw-flex-1">
                                            <AlertTitle
                                                class="tw-text-xs tw-font-medium tw-mb-0 tw-text-yellow-600"
                                                >{{
                                                    $t('CodeBlocksSettings.DeprecatedCompiler')
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
                        </div>

                        <!-- Tab: Runtime (only when execution is enabled) -->
                        <div v-if="activeTab === 'runtime' && runCode" class="tw-space-y-4 tw-mt-4">
                            <div v-if="showMaxRuntime">
                                <CInput
                                    v-model="maxRuntime"
                                    :rules="[validNumber]"
                                    :label="$t('CodeBlocksSettings.RunTimeShrt')"
                                />
                            </div>

                            <div
                                v-if="accepstArguments || allowsMessagePassing"
                                class="tw-space-y-2"
                            >
                                <div class="tw-flex tw-items-center tw-gap-2">
                                    <div class="tw-text-sm">
                                        {{ $t('CodeBlocksSettings.AllowArguments') }}
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
                                                        compiler.languageType === 'java'
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
                                    v-if="accepstArguments"
                                    class="tw-flex tw-items-center tw-space-x-2"
                                >
                                    <Switch
                                        id="persistent-args"
                                        :checked="persistentArguments"
                                        @update:checked="(val) => (persistentArguments = val)"
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
                                                        compiler.languageType === 'java'
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
                                    v-if="allowsMessagePassing"
                                    class="tw-flex tw-items-center tw-space-x-2"
                                >
                                    <Switch
                                        id="message-passing"
                                        :checked="messagePassing"
                                        @update:checked="(val) => (messagePassing = val)"
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
                                                        compiler.languageType === 'java'
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
                                    v-if="allowsMessagePassing"
                                    class="tw-flex tw-items-center tw-space-x-2 tw-pl-6"
                                >
                                    <Switch
                                        id="keep-alive"
                                        :checked="keepAlive"
                                        @update:checked="(val) => (keepAlive = val)"
                                        :disabled="!allowsMessagePassing || !messagePassing"
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
                                                        compiler.languageType === 'java'
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

                        <!-- Tab: Output -->
                        <div v-if="activeTab === 'output'" class="tw-space-y-4 tw-mt-4">
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
                            <CSelect
                                :model-value="uiTheme"
                                @update:model-value="uiTheme = $event"
                                :options="themes"
                                :label="$t('CodeBlocksSettings.TSolution')"
                            />
                        </div>

                        <!-- Tab: Libraries -->
                        <div v-if="activeTab === 'libraries'" class="tw-space-y-4 tw-mt-4">
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

                        <!-- Tab: Randomizer (full config) -->
                        <div v-if="activeTab === 'randomizer'" class="tw-mt-4">
                            <RandomizerSettings :options="options" />
                        </div>
                    </DialogScrollContent>
                </Dialog>
        </div>

        <textarea
            :name="`block_settings[${options.id}]`"
            class="tw-hidden"
            v-model="serializedOptions"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import RandomizerSettings from './RandomizerSettings.vue'
import {
    Dialog,
    DialogScrollContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from '../shadcn/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '../shadcn/ui/popover'
import { Switch } from '../shadcn/ui/switch'
import { Label } from '../shadcn/ui/label'
import { Badge } from '../shadcn/ui/badge' // kept: used in dialog tab content (version option badges)
import { Alert, AlertDescription, AlertTitle } from '../shadcn/ui/alert'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../shadcn/ui/hover-card'
import { Button } from '../shadcn/ui/button'
import CButton from './ui/CButton.vue'
import CMultiSelect from './ui/CMultiSelect.vue'
import CSelect from './ui/CSelect.vue'
import CInput from './ui/CInput.vue'
import type { IListItemData, ICompilerID } from '@/lib/ICompilerRegistry'
import type { IRandomizerSet, IRandomizerSettings } from '@/lib/ICodeBlocks'
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
    Check,
    Eye,
    EyeOff,
    ChevronDown,
    Play,
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
    return compilerRegistry
        .versionsForLanguage(compilerLanguage.value.value)
        .filter((v) => !isDeprecatedVersion(compilerLanguage.value, v))
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
        value: lang.value.toString(),
    }))
})

const compiler = computed(() => {
    return props.options.compiler
})

// Local copy so the switch updates the UI immediately without waiting for
// the prop to round-trip through the parent's event handler.
const localRunCode = ref(props.options.runCode)
watch(
    () => props.options.runCode,
    (v) => {
        localRunCode.value = v
    }
)

const runCode = computed({
    get: () => localRunCode.value,
    set: (v: boolean) => {
        localRunCode.value = v
        emit('run-state-change', v)
    },
})

const activeTab = ref('language')
const dialogOpen = ref(false)

function openDialogOnTab(tab: string) {
    activeTab.value = tab
    dialogOpen.value = true
}

watch(runCode, (val) => {
    if (!val && (activeTab.value === 'output' || activeTab.value === 'runtime')) {
        activeTab.value = 'language'
    }
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

// Randomizer compact popover helpers

function updateRandomizerActive(val: boolean) {
    props.options.randomizer.active = val
}

function isSetVisible(nr: number): boolean {
    return nr === props.options.randomizer.previewIndex
}

function setSetVisible(nr: number): void {
    props.options.randomizer.previewIndex = nr
}

function isCompleteSet(s: IRandomizerSet): boolean {
    if (s.values.filter((v) => props.options.randomizer.knownTags.indexOf(v.tag) < 0).length > 0) {
        return false
    }
    if (
        props.options.randomizer.knownTags.filter(
            (t) => s.values.find((v) => v.tag === t) === undefined
        ).length > 0
    ) {
        return false
    }
    return true
}

function setValuesSummary(s: IRandomizerSet): string {
    return s.values
        .map((v) => v.value)
        .filter(Boolean)
        .join(', ')
}

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
.cb-toolbar-item {
    @apply tw-flex tw-items-center tw-gap-1.5 tw-px-3 tw-h-full tw-transition-colors hover:tw-bg-accent tw-cursor-pointer tw-whitespace-nowrap;
}

.hover-content {
    @apply tw-text-sm tw-text-muted-foreground;
    @apply [&>p]:tw-mb-2 [&>ul]:tw-ml-4 [&>ul]:tw-list-disc [&>ul>li]:tw-mb-1;
    @apply [&>code]:tw-px-1.5 [&>code]:tw-py-0.5 [&>code]:tw-bg-muted [&>code]:tw-rounded-sm [&>code]:tw-font-mono [&>code]:tw-text-xs;
    @apply [&>pre]:tw-bg-muted [&>pre]:tw-p-2 [&>pre]:tw-rounded-md [&>pre]:tw-my-2 [&>pre]:tw-font-mono [&>pre]:tw-text-xs;
}
</style>
