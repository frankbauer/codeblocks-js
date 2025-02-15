<template>
  <div class="tw-w-full">
    <div class="tw-flex tw-justify-between tw-items-center tw-p-3 tw-bg-card tw-rounded-lg tw-border">
      <div class="tw-flex tw-items-center tw-gap-2 tw-flex-wrap">
        <Badge >
            <Code2 class="tw-w-4 tw-h-4 tw-mr-2" />{{ compilerLanguage.label }}
        </Badge>
        <Badge variant="outline">
          {{ runCode ? `v${compilerVersion}` : `(${$t('CodeBlocksSettings.NoExecution')})` }}
        </Badge>
        <Badge v-if="options.randomizer.active">
            <Dices class="tw-w-4 tw-h-4 tw-mr-2" /> {{ $t('RandomizerSettings.Caption') }}
        </Badge>
        <Badge variant="secondary" v-if="runCode">
            <Clock class="tw-w-4 tw-h-4 tw-mr-2" /> {{ $t('CodeBlocksSettings.RunTimeShrt') }}: {{ Math.round(maxRuntime/1000) }}s
        </Badge>
        <Badge variant="outline">
            <Terminal class="tw-w-4 tw-h-4 tw-mr-2" /> {{ $t('CodeBlocksSettings.OutputFormat') }}: {{ outputParser.label }}
        </Badge>
        <Badge variant="secondary">
            {{ $t('CodeBlocksSettings.MaxCharacters') }}: {{ maxCharacters }}
        </Badge>
        <Badge variant="secondary">
            <Library class="tw-w-4 tw-h-4 tw-mr-2" /> {{ $t('CodeBlocksSettings.DomLibs') }}: {{ domLibrary.length }}
        </Badge>
        <Badge v-if="runCode && workerLibraries.length > 0" variant="secondary">
          {{ $t('CodeBlocksSettings.WorkLibs') }}: {{ workerLibrary.length }}
        </Badge>
      </div>
      <Dialog>
        <DialogTrigger asChild>
          <CButton :icon="Settings" variant="outline" noText />
        </DialogTrigger>
        <DialogContent class="tw-max-w-3xl tw-max-h-[90vh] tw-overflow-y-auto tw-pr-4 modern-scrollbar">
          <DialogHeader>
            <DialogTitle>{{ $t('CodeBlocksSettings.Settings') }}</DialogTitle>
            <DialogDescription>
              {{ $t('CodeBlocksSettings.SettingsDesc') }}
            </DialogDescription>
          </DialogHeader>
          
          <Accordion type="single" collapsible class="tw-w-full [&>*>*>[data-state=open]>.tw-text-xs]:tw-opacity-100">
            <AccordionItem value="language">
              <AccordionTrigger class="tw-items-start">
                <div class="tw-flex tw-flex-col tw-w-full">
                  <div class="tw-flex tw-items-center tw-gap-2">
                    <Code2 class="tw-w-4 tw-h-4" />
                    {{ $t('CodeBlocksSettings.Language') }}
                  </div>
                  <div class="tw-text-xs tw-text-muted-foreground tw-mt-0.5 tw-ml-6 tw-font-light tw-text-left tw-opacity-75 tw-transition-opacity">
                    {{ runCode ? `${compilerLanguage.label} v${compilerVersion}` : `${compilerLanguage.label} (${$t('CodeBlocksSettings.NoExecution')})` }}
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
                        @update:checked="(val) => runCode = val"
                        :disabled="!languageHasCompiler"
                      />
                      <Label for="run-code">{{ $t('CodeBlocksSettings.AllowExec') }}</Label>
                    </div>
                    
                    <div class="tw-flex tw-items-center tw-space-x-2">
                      <Switch 
                        id="continuous-compile"
                        :checked="continuousCompile"
                        @update:checked="(val) => continuousCompile = val"
                        :disabled="!canContinousCompile"
                      />
                      <Label for="continuous-compile">{{ $t('CodeBlocksSettings.ContinousCompile') }}</Label>
                    </div>

                    <div class="tw-grid tw-grid-cols-2 tw-gap-4">
                      <div :class="{'tw-col-span-2': !runCode}">
                        <CSelect
                          v-model="compilerLanguage"
                          :options="compiledLanguages"
                          :label="$t('CodeBlocksSettings.Language')"
                        />
                      </div>
                      <div v-if="runCode">
                        <CSelect
                          :model-value="compilerVersion"
                          @update:model-value="compilerVersion = $event"
                          :options="compilerVersions"
                          :label="$t('CodeBlocksSettings.CVersion')"
                        >
                          <template #option="{ option }">
                            {{ option }}
                            <Badge v-if="isDeprecatedVersion(compilerLanguage, option)" variant="destructive" class="tw-ml-2">
                              {{ $t('CodeBlocksSettings.Deprecated') }}
                            </Badge>
                            <Badge v-if="isExperimentalVersion(compilerLanguage, option)" variant="secondary" class="tw-ml-2">
                              {{ $t('CodeBlocksSettings.Experimental') }}
                            </Badge>
                          </template>
                        </CSelect>
                      </div>
                    </div>

                    <div v-if="runCode">
                      <CInput
                        v-model="maxRuntime"
                        :rules="[validNumber]"
                        :label="$t('CodeBlocksSettings.RunTimeShrt')"
                      />
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
                  <div class="tw-text-xs tw-text-muted-foreground tw-mt-0.5 tw-ml-6 tw-font-light tw-text-left tw-opacity-75 tw-transition-opacity">
                    {{ outputParser.label }} • {{ $t('CodeBlocksSettings.MaxCharacters') }}: {{ maxCharacters }}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent class="tw-pl-6 tw-mt-2">
                <div class="tw-space-y-4">
                  <div class="tw-grid tw-grid-cols-2 tw-gap-4">
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
                  <div class="tw-text-xs tw-text-muted-foreground tw-mt-0.5 tw-ml-6 tw-font-light tw-text-left tw-opacity-75 tw-transition-opacity">
                    {{ $t('CodeBlocksSettings.DomLibs') }}: {{ domLibrary.length }}
                    <template v-if="runCode && workerLibraries.length > 0">
                      • {{ $t('CodeBlocksSettings.WorkLibs') }}: {{ workerLibrary.length }}
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

            <AccordionItem value="randomizer">
              <AccordionTrigger class="tw-items-start">
                <div class="tw-flex tw-flex-col tw-w-full">
                  <div class="tw-flex tw-items-center tw-gap-2">
                    <Dices class="tw-w-4 tw-h-4" />
                    {{ $t('RandomizerSettings.Caption') }}
                  </div>
                  <div class="tw-text-xs tw-text-muted-foreground tw-mt-0.5 tw-ml-6 tw-font-light tw-text-left tw-opacity-75 tw-transition-opacity">
                    {{ options.randomizer.active ? $t('RandomizerSettings.Active') : $t('RandomizerSettings.Inactive') }}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent class="tw-pl-6 tw-mt-2">
                <RandomizerSettings :options="options" />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </DialogContent>
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
import { ref, computed } from 'vue'
import RandomizerSettings from './RandomizerSettings.vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/shadcn/ui/dialog'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/shadcn/ui/accordion'
import { Switch } from '@/shadcn/ui/switch'
import { Label } from '@/shadcn/ui/label'
import { Badge } from '@/shadcn/ui/badge'
import CButton from './ui/CButton.vue'
import CMultiSelect from './ui/CMultiSelect.vue'
import CSelect from './ui/CSelect.vue'
import CInput from './ui/CInput.vue'
import { useDialog } from './ui/useDialog'
import type { IListItemData, ICompilerID } from '@/lib/ICompilerRegistry'
import type { IRandomizerSettings } from '@/lib/ICodeBlocks'
import compilerRegistry from '@/lib/CompilerRegistry'
import { globalState } from '@/lib/globalState'
import { UIThemeType, UIThemeTypes, getUITheme } from '@/lib/uiTheme'
import { useI18n } from 'vue-i18n'
import { CodeOutputTypes } from '@/lib/ICodeBlocks'
import { Settings, Code2, Terminal, Library, Dices, Clock } from 'lucide-vue-next'

const props = defineProps<Props>()
const emit = defineEmits(['run-state-change', 'language-change', 'compiler-change', 'timeout-change', 
  'character-limit-change', 'dom-libs-change', 'worker-libs-change', 'theme-change', 
  'output-parser-change', 'continuous-compile-change', 'message-passing-change', 
  'keep-alive-change', 'persistent-arguments-change', 'compiler-version-change'])

const { t: l } = useI18n()
const { showDialog } = useDialog()

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
    const value = props.options.runCode ? props.options.compiler.languageType : props.options.language
    return globalState.appState.itemForValue(compiledLanguages.value, value)
  },
  set: (v: IListItemData) => {
    updateCompilerLanguage(v.value)
  }
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
  return compilerRegistry.languages.map(lang => ({
    label: lang.label,
    value: lang.value
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
  return knownLangs.map(lang => ({
    label: lang.label,
    value: lang.value.toString()  // Ensure value is a string
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
    return globalState.appState.itemForValue(
      outputParsers.value,
      props.options.outputParser
    )
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

const allowsREPL = computed(() => {
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

function showInfoDialog(title: string, message: string): void {
  if (l === undefined) {
    return
  }
  showDialog({
    title: l(title),
    message: l(message),
    html: true,
    style: 'width:75%',
  })
}

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

function isExperimentalVersion(language: IListItemData, version: string | number | Option): boolean {
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
