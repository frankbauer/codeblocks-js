<template>
    <div
        :class="`codeblocks ${addonClass}  ${backgroundColorClass} q-mx-sm q-mb-md`"
        :data-question="blockInfo.id"
        :uuid="blockInfo.uuid"
    >
        <CodePanel
            v-show="hasBookmark && editMode"
            :editMode="editMode"
            visibleLines="auto"
            :block="panelBlock"
        />
        <CodeBlocksSettings
            v-if="editMode"
            :options="options"
            @compiler-change="onCompilerChange"
            @compiler-version-change="onCompilerVersionChange"
            @run-state-change="onRunStateChange"
            @continuous-compile-change="onContinousCompileStateChange"
            @message-passing-change="onMessagePassingChange"
            @keep-alive-change="onKeepAliveChange"
            @persistent-arguments-change="onPersistentArgumentsChange"
            @language-change="onLanguageChange"
            @character-limit-change="onCharacterLimitChange"
            @timeout-change="onTimeoutChange"
            @worker-libs-change="onWorkerLibChange"
            @dom-libs-change="onDomLibChange"
            @theme-change="onThemeChange"
            @output-parser-change="onOutputParserChange"
        />
        <CodeBlockContainer
            :block="block"
            :editMode="editMode"
            v-for="block in blocks"
            :key="block.id"
            @type-change="onTypeChange"
            @visible-lines-change="onVisibleLinesChange"
            @placement-change="onPlacementChange"
            @script-version-change="onScriptVersionChange"
            @move-up="moveUp"
            @move-down="moveDown"
            @remove-block="removeBlock"
            @auto-reset-change="onSetAutoReset"
        >
            <CodeBlock
                v-if="block.hasCode && block.type != 'BLOCKLY'"
                :block="block"
                :theme="themeForBlock(block)"
                :mode="mimeType"
                :visibleLines="block.visibleLines"
                :editMode="editMode"
                :readonly="readonly"
                :tagSet="activeTagSet"
                :emitWhenTypingInViewMode="continuousCompile"
                @ready="blockBecameReady"
                @build="run"
                @code-changed-in-view-mode="onViewCodeChange"
            />

            <CodePlayground
                v-else-if="block.type == 'PLAYGROUND'"
                :block="block"
                :editMode="editMode"
                :finalOutputObject="finalOutputObject"
                :theme="themeForBlock(block)"
                :tagSet="activeTagSet"
                @changeOutput="onPlaygroundChangedOutput"
                @ready="blockBecameReady"
                @run="onRunFromPlayground"
                :eventHub="eventHub"
            />

            <SimpleText
                v-else-if="block.type == 'TEXT'"
                v-model="block.content"
                :block="block"
                :previewValue="block.actualContent()"
                :editMode="editMode"
                :name="`block[${block.parentID}][${block.id}]`"
                :scopeUUID="block.scopeUUID"
                :tagSet="activeTagSet"
                :language="language"
                @ready="blockBecameReady"
            />
            <Blockly
                v-else-if="block.type == 'BLOCKLY'"
                :block="block"
                :mode="mimeType"
                :theme="themeForBlock(block)"
                :editMode="editMode"
                :readonly="readonly"
                :tagSet="activeTagSet"
                :emitWhenTypingInViewMode="continuousCompile"
                :blockInfo="blockInfo"
                @code-changed-in-view-mode="onViewCodeChange"
            />
        </CodeBlockContainer>

        <div class="row justify-end" v-if="editMode">
            <div>
                <q-btn @click="addNewBlock" push color="green"
                    >{{ $t('CodeBlocks.AddBlock') }} <q-icon name="library_add" class="q-ml-sm"
                /></q-btn>
            </div>
        </div>

        <div
            :class="`runner ${editMode ? 'q-pt-lg q-mx-lg' : ''}`"
            v-if="canRun"
            id="runContainer"
            :data-question="blockInfo.id"
        >
            <div class="row runnerState" id="stateBox" :data-question="blockInfo.id">
                <q-btn
                    id="allow_run_button"
                    :loading="!isReady"
                    :disabled="!isReady"
                    color="primary"
                    class="white--text"
                    @click="run"
                    :ripple="{ center: true }"
                    style="border-radius: 0px"
                    :data-question="blockInfo.id"
                >
                    {{ $t('CodeBlocks.run') }}
                    <q-icon right dark name="play_arrow"></q-icon>
                    <q-tooltip :delay="200" v-if="editMode">
                        <span v-html="$t('CodeBlocks.run_hint')"></span>
                    </q-tooltip>
                </q-btn>
                <div class="animated fadeIn"></div>
                <transition
                    appear
                    enter-active-class="animated fadeIn"
                    leave-active-class="animated fadeOut"
                >
                    <div class="q-pl-sm" v-show="canStop">
                        <q-btn
                            id="cancel_button"
                            color="negative"
                            :ripple="{ center: true }"
                            style="border-radius: 0px"
                            :data-question="blockInfo.id"
                            @click="stop"
                        >
                            {{ $t('CodeBlocks.stop') }}
                            <q-icon right dark name="stop"></q-icon>
                        </q-btn>
                    </div>
                </transition>
                <transition
                    appear
                    enter-active-class="animated fadeIn"
                    leave-active-class="animated fadeOut"
                >
                    <div
                        class="globalState col-grow"
                        style="align-self: center"
                        v-show="showGlobalMessages"
                    >
                        <div id="message" v-html="$compilerState.globalStateMessage"></div>
                    </div>
                </transition>
            </div>
            <q-slide-transition>
                <pre
                    :id="`${blockInfo.id}Output`"
                    ref="output"
                    class="output"
                    v-if="hasOutput"
                ><div id="out" v-html="outputHTML"></div></pre>
            </q-slide-transition>
        </div>
    </div>
</template>

<script lang="ts">
import 'reflect-metadata'
import { Vue, Component, Prop } from 'vue-property-decorator'
import CodeBlockContainer from '@/components/CodeBlockContainer.vue'
import CodeBlocksSettings, { ICodeBlockSettingsOptions } from '@/components/CodeBlocksSettings.vue'
import CodeBlock from '@/components/CodeBlock.vue'
import CodePanel from '@/components/CodePanel.vue'
//import Blockly from '@/components/Blockly/Blockly.vue'
import CodePlayground from '@/components/CodePlayground.vue'
import SimpleText from '@/components/SimpleText.vue'
import { BlockData, IMainBlock, IBlockBookmarkPayload } from '@/lib/codeBlocksManager'
import { IScriptOutputObject, IProcessedScriptOutput } from '@/lib/IScriptBlock'
import {
    ICompilerID,
    ICompilerErrorDescription,
    ICompileAndRunArguments,
} from '@/lib/ICompilerRegistry'
import {
    CodeOutputTypes,
    IRandomizerSet,
    KnownBlockTypes,
    IBlockDataPlayground,
} from '@/lib/ICodeBlocks'

const Blockly = () => import('@/components/Blockly/Blockly.vue')
export interface IOnTypeChangeInfo {
    type: KnownBlockTypes
    hidden: boolean
    static: boolean
    id: number
    hasCode: boolean
}

export interface IOnVisibleLinesChangeInfo {
    visibleLines: 'auto' | number
    id: number
}

export interface IOnPlacementChangeInfo extends IBlockDataPlayground {
    id: number
}

export interface IOnScriptVersionChangeInfo {
    version: string
    id: number
}

export interface IOnSetAutoResetInfo {
    shouldAutoreset: boolean
    id: number
}

export interface IOnThemeChangeInfo {
    solution: string
    code: string
}

@Component({
    components: {
        CodeBlockContainer,
        CodeBlocksSettings,
        CodeBlock,
        CodePlayground,
        SimpleText,
        Blockly,
        CodePanel,
    },
})
export default class CodeBlocks extends Vue {
    didInitialize: boolean = false
    outputHTML: string = ''
    output: string = ''
    sansoutput: string = ''
    didClip: boolean = false
    _finalOutputObject: IScriptOutputObject | null = null
    eventHub: Vue = new Vue()

    get continuousCompile(): boolean {
        if (this.editMode) {
            return false
        }
        const cmp = this.$compilerRegistry.getCompiler(this.compiler)
        if (cmp) {
            return cmp.allowsContinousCompilation
        }
        return false
    }

    get finalOutputObject(): IScriptOutputObject {
        if (this._finalOutputObject === null || this._finalOutputObject === undefined) {
            return {
                initialOutput: '',
                output: '',
                processedOutput: {
                    type: 'text',
                    text: '',
                    json: undefined,
                },
                sansoutput: '',
                outputElement: $(this.outputElement) as any,
            }
        }
        return this._finalOutputObject
    }
    @Prop({ required: true }) blockInfo!: IMainBlock
    get options(): ICodeBlockSettingsOptions {
        return {
            language: this.language,
            compiler: this.compiler,
            executionTimeout: this.executionTimeout,
            maxCharacters: this.maxCharacters,
            runCode: this.runCode,
            domLibs: this.domLibraries,
            workerLibs: this.workerLibraries,
            id: this.blockInfo.id,
            codeTheme: this.codeTheme,
            solutionTheme: this.solutionTheme,
            outputParser: this.outputParser,
            randomizer: this.blockInfo.randomizer,
            continuousCompilation: this.blockInfo.continuousCompilation,
            persistentArguments: this.blockInfo.persistentArguments,
            messagePassing: this.blockInfo.messagePassing,
            keepAlive: this.blockInfo.keepAlive,
        }
    }
    get blocks(): BlockData[] {
        return this.blockInfo.blocks
    }
    get language(): string {
        return this.blockInfo.language
    }
    get blockid(): number {
        return this.blockInfo.id
    }
    get executionTimeout(): number {
        return this.blockInfo.executionTimeout
    }
    get maxCharacters(): number {
        return this.blockInfo.maxCharacters
    }
    get compiler(): ICompilerID {
        return this.blockInfo.compiler
    }
    get runCode(): boolean {
        return this.blockInfo.runCode
    }
    get domLibraries(): string[] {
        return this.blockInfo.domLibs
    }
    get workerLibraries(): string[] {
        return this.blockInfo.workerLibs
    }
    get solutionTheme(): string {
        return this.blockInfo.solutionTheme
    }
    get codeTheme(): string {
        return this.blockInfo.codeTheme
    }
    get readonly(): boolean {
        return this.blockInfo.readonly
    }
    get outputParser(): CodeOutputTypes {
        return this.blockInfo.outputParser
    }

    get editMode(): boolean {
        return false
    }
    get hasOutput(): boolean {
        return this.outputHTML !== undefined && this.outputHTML != ''
    }
    get mimeType(): string {
        return this.$CodeBlock.mimeType(this.language)
    }
    get isReady(): boolean {
        let cmp = this.$compilerRegistry.getCompiler(this.compiler)
        if (!cmp) {
            return false
        }

        return (
            this.didInitialize &&
            cmp.isReady &&
            !cmp.isRunning &&
            !this.$compilerState.runButtonForceHide
        )
    }
    get canRun(): boolean {
        let cmp = this.$compilerRegistry.getCompiler(this.compiler)
        if (!cmp) {
            return false
        }
        return cmp.canRun && this.runCode
    }
    get randomizerActive(): boolean {
        return this.blockInfo.randomizer.active
    }
    get activeTagSet(): IRandomizerSet | undefined {
        if (!this.randomizerActive) {
            return undefined
        }
        return this.tagSet(this.blockInfo.randomizer.previewIndex)
    }
    get completeSource(): string {
        return this.blocks
            .filter((b) => b.hasCode)
            .map((b) => b.actualContent())
            .reduce((p, c) => {
                return p + '\n' + c
            }, '')
    }
    get showGlobalMessages(): boolean {
        return !this.$compilerState.globalStateHidden
    }
    get playgrounds(): BlockData[] {
        return this.blocks.filter((b) => b.type == 'PLAYGROUND')
    }
    get outputElement(): HTMLElement {
        return this.$refs.output as HTMLElement
    }
    get addonClass(): string {
        let cl = ''
        if (this.editMode) {
            cl += 'editmode '
        }
        if (this.readonly) {
            cl += 'block-readonly '
        }
        return cl
    }
    get backgroundColorClass(): string {
        return this.editMode ? 'blue-grey darken-4' : ''
    }

    blockBecameReady(): void {
        let readyCount = this.blockInfo.blocks.map((b) => b.readyCount).reduce((p, c) => p + c, 0)
        if (readyCount == this.blockInfo.blocks.length) {
            this.$nextTick(() => {
                this.eventHub.$emit('all-mounted', {})
            })
        }
        //console.log("Ready", readyCount, this.blockInfo.blocks.length);
    }

    tagSet(nr: number): IRandomizerSet {
        return this.blockInfo.randomizer.sets[nr]
    }

    themeForBlock(bl: BlockData): string {
        return bl.themeForCodeBlock
    }
    public blockById(id: number): BlockData | undefined {
        return this.blocks.find((block) => block.id == id)
    }
    onTypeChange(nfo: IOnTypeChangeInfo): void {}
    onVisibleLinesChange(nfo: IOnVisibleLinesChangeInfo): void {}
    onPlacementChange(nfo: IOnPlacementChangeInfo): void {}
    onScriptVersionChange(nfo: IOnScriptVersionChangeInfo): void {}
    onSetAutoReset(nfo: IOnSetAutoResetInfo): void {}
    onCompilerChange(v: string): void {}
    onCompilerVersionChange(v: string): void {}
    onRunStateChange(v: boolean): void {}
    onContinousCompileStateChange(v: boolean): void {}
    onMessagePassingChange(v: boolean): void {}
    onKeepAliveChange(v: boolean): void {}
    onPersistentArgumentsChange(v: boolean): void {}
    onLanguageChange(v: string): void {}
    onCharacterLimitChange(v: number): void {}
    onTimeoutChange(v: number): void {}
    onWorkerLibChange(v: string[]): void {}
    onDomLibChange(v: string[]): void {}
    onThemeChange(nfo: IOnThemeChangeInfo): void {}
    onOutputParserChange(v: CodeOutputTypes): void {}
    moveUp(idx: number): void {}
    moveDown(idx: number): void {}
    removeBlock(idx: number): void {}
    addNewBlock(): void {}
    onPlaygroundChangedOutput(newOutput: string | undefined): void {
        if (newOutput === undefined) {
            return
        }
        if (this.output != newOutput) {
            this.output = newOutput.replaceAllPoly('<', '&lt;').replaceAllPoly('>', '&gt;')
            if (this.maxCharacters > 0 && this.output.length > this.maxCharacters) {
                this.outputHTML = this.output.substr(0, this.maxCharacters)
                this.outputHTML += this.$CodeBlock.format_info(
                    'Info: Output too long. Removed all following Characters. \n<b>...</b>\n\n'
                )
            } else {
                this.outputHTML = this.output
            }
            this.outputHTML += this.sansoutput
        }
    }

    resetOutput(): void {
        this.output = ''
        this.sansoutput = ''
        this.didClip = false
        this.outputHTML = ''
    }

    log(text: string): void {
        //console.log("log", text);
        this.output += text
        text = text.replaceAllPoly('<', '&lt;').replaceAllPoly('>', '&gt;')
        if (!this.didClip) {
            if (this.maxCharacters > 0 && this.output.length > this.maxCharacters) {
                this.outputHTML += this.$CodeBlock.format_info(
                    'Info: Output too long. Removed all following Characters. \n<b>...</b>\n\n'
                )
                this.didClip = true
            } else {
                this.outputHTML += text
            }
        }
    }

    logError(text: string): void {
        text = text.replaceAllPoly('<', '&lt;').replaceAllPoly('>', '&gt;')
        text = this.$CodeBlock.format_error(text)
        //console.log("err", text);
        this.sansoutput += text
        this.outputHTML += text
    }

    logInfo(text: string): void {
        text = text.replaceAllPoly('<', '&lt;').replaceAllPoly('>', '&gt;')
        text = this.$CodeBlock.format_info(text)
        //console.log("nfo", text);
        this.sansoutput += text
        this.outputHTML += text
    }

    processDiagnostics(error: ICompilerErrorDescription) {
        const line = error.start.line
        this.blocks.forEach((block) => {
            if (!block.hasCode) {
                return
            }

            const first = block.firstLine
            const last = block.nextLine - 1

            if (error.start.line >= first && error.start.line <= last) {
                block.errors.push(error)
            }
        })
    }

    clearDiagnostics(): void {
        this.blocks.forEach((block) => (block.errors = []))
        this.eventHub.$emit('render-diagnostics', {})
    }

    loadLibraries(whenLoaded: () => void): void {
        this.$compilerRegistry.loadLibraries(this.domLibraries, whenLoaded)
    }

    /**
     * Call when the program finished executing and pass the output string. We will send the output to all embeded canvas elements
     * @param {*} output
     * @param {*} infoErrorOutput output generated by info or error messages
     */
    finishedExecution(output: string, infoErrorOutput: string): void {
        let parseError: any = undefined
        let processed: IProcessedScriptOutput = { type: 'text', json: undefined, text: output }

        if (output !== undefined && this.playgrounds.length > 0) {
            try {
                processed = this.$CodeBlock.processMixedOutput(output, this.outputParser)
            } catch (e) {
                parseError = e
            }
        }

        this._finalOutputObject = {
            initialOutput: output,
            output: output,
            processedOutput: processed,
            sansoutput: this.sansoutput,
            parseError: parseError,
            //outputElement: $(this.outputElement) as JQuery<HTMLElement> //This line soes not work here, looks like the update did not yet happen?
            outputElement: $(this.$refs.output as any) as any,
        }
        this.eventHub.$emit('output-updated', this._finalOutputObject)

        this.onRunFinished()
    }

    get canStop(): boolean {
        return !this.isReady && this.didRunOnce
    }
    stop(): void {
        const cmp = this.$compilerRegistry.getCompiler(this.compiler)
        if (cmp === undefined || cmp.stop === undefined) {
            return
        }
        cmp.stop()
    }

    didRunOnce: boolean = false
    run(): boolean {
        const cmp = this.$compilerRegistry.getCompiler(this.compiler)
        if (cmp === undefined) {
            return false
        }

        this.$compilerState.setAllRunButtons(false)

        this.resetOutput()
        this.clearDiagnostics()
        const self = this

        this.loadLibraries(() => {
            self.eventHub.$emit('before-run', {})
            console.d('compileAndRun')
            self.didRunOnce = true

            let _args: object | string[] = {}
            if (cmp.acceptsJSONArgument) {
                _args = this.blockInfo.initArgsForLanguage()
                this.blocks.forEach((bl) => {
                    if (bl.obj) {
                        console.i('!!! ADD ARGUMENTS TO !!!')
                        bl.obj.addArgumentsTo(_args)
                    }
                })
            }

            const runOptions: ICompileAndRunArguments = {
                max_ms: self.executionTimeout,
                log_callback: self.log.bind(this),
                info_callback: self.logInfo.bind(this),
                err_callback: self.logError.bind(this),
                compileFailedCallback: self.processDiagnostics.bind(this),
                finishedExecutionCB: (
                    success = true,
                    overrideOutput = undefined,
                    returnState = undefined
                ) => {
                    console.i('returnState:', returnState, _args)
                    if (!success) {
                        self.$compilerState.hideGlobalState()
                        self.$compilerState.setAllRunButtons(true)
                        return undefined
                    }
                    let res = self.finishedExecution(
                        overrideOutput ? overrideOutput : self.output,
                        self.sansoutput
                    )

                    if (returnState !== undefined) {
                        if (this.blockInfo.persistentArguments) {
                            console.i('Store Default State', returnState)
                            this.blockInfo.storeDefaultArgs(returnState)
                        } else {
                            this.blockInfo.clearDefaultArgs()
                        }
                    }
                    self.$compilerState.hideGlobalState()
                    self.$compilerState.setAllRunButtons(true)
                    return res
                },
                args: _args,
                didReceiveMessage: (cmd, data) => {
                    console.i('MESSAGE - Received', cmd)
                    this.blocks.forEach((bl) => {
                        if (bl.obj) {
                            bl.obj.didReceiveMessage(cmd, data)
                        }
                    })
                },
                postMessageFunction: null,
                dequeuePostponedMessages: () => {},
                allowMessagePassing: cmp.allowsMessagePassing && self.options.messagePassing,
                keepAlive:
                    cmp.allowsMessagePassing &&
                    self.options.messagePassing &&
                    self.options.keepAlive,
                beforeStartHandler: () => {
                    this.blocks.forEach((bl) => {
                        console.d('MESSAGE - Before Start')
                        if (bl.obj) {
                            bl.obj.beforeStart()
                        }
                    })
                },
                whenFinishedHandler: (args: object | string[]) => {
                    this.blocks.forEach((bl) => {
                        console.d('MESSAGE - When Finished')
                        if (bl.obj) {
                            bl.obj.whenFinished(args)
                        }
                    })
                },
            }

            if (runOptions.keepAlive) {
                this.blocks.forEach((bl) => {
                    if (bl.obj) {
                        bl.obj.runConfig = runOptions
                    }
                })
            }

            cmp.compileAndRun('' + self.blockid, self.completeSource, self, runOptions)
        })

        return true
    }
    onkey(event) {
        if (
            this.editMode &&
            (event.ctrlKey || event.metaKey) &&
            (event.key === 'w' || event.key === 'j')
        ) {
            this.run()
            event.preventDefault()
            return false
        }
    }

    mounted() {
        let cmp = this.$compilerRegistry.getCompiler(this.compiler)
        if (cmp) {
            cmp.preload()
        }
        const self = this
        this.loadLibraries(() => {
            self.eventHub.$emit('initialized-libraries', {})
        })
        this.didInitialize = true

        if (this.editMode) {
            window.addEventListener('keydown', this.onkey, false)
        }

        Vue.$GlobalEventHub.$on('bookmark-block', this.onBookmarkBlock)
    }
    beforeDestroy() {
        window.removeEventListener('keydown', this.onkey)
        Vue.$GlobalEventHub.$off('bookmark-block')
    }

    bookmarkedBlock: BlockData | null = null

    get hasBookmark(): boolean {
        return this.bookmarkedBlock !== null && this.editMode
    }

    get panelBlock(): BlockData | null {
        return this.bookmarkedBlock
    }
    onBookmarkBlock(data: IBlockBookmarkPayload) {
        console.i('Bookmark', data)
        if (this.blockInfo.uuid == data.uuid) {
            this.bookmarkedBlock = data.block
        }
    }

    triggerRecompileWhenFinished: boolean = false
    onViewCodeChange(forceRun: boolean = false) {
        if (!forceRun && !this.blockInfo.continuousCompilation) {
            return
        }

        if (this.continuousCodeUpdateTimer !== null) {
            clearTimeout(this.continuousCodeUpdateTimer)
            this.continuousCodeUpdateTimer = null
        }
        this.continuousCodeUpdateTimer = setTimeout(() => {
            const cmp = this.$compilerRegistry.getCompiler(this.compiler)
            console.d('Continuous Compile - ', cmp)
            if (cmp && cmp.allowsContinousCompilation) {
                if (!cmp.isRunning && cmp.isReady) {
                    console.d('Continuous Compile - ', 'RUN')
                    this.run()
                } else {
                    console.d('Continuous Compile - ', 'DEFER')
                    this.triggerRecompileWhenFinished = true
                }
            }
        }, process.env.VUE_APP_CONTINOUS_COMPILE_TIMEOUT)
    }

    onRunFinished() {
        if (this.triggerRecompileWhenFinished) {
            console.d('Continuous Compile - ', 'RE-RUN')
            this.triggerRecompileWhenFinished = false
            this.onViewCodeChange()
        }
    }

    continuousCodeUpdateTimer: number | null = null
    onRunFromPlayground() {
        const cmp = this.$compilerRegistry.getCompiler(this.compiler)
        if (
            cmp &&
            cmp.canRun &&
            !this.editMode &&
            cmp.allowsContinousCompilation // &&
            // this.blockInfo.continuousCompilation
        ) {
            this.onViewCodeChange(true)
        }
    }
}
</script>

<style lang="sass">

div.codeblocks.editmode
    box-shadow: 3px 3px 6px rgba(0,0,0,0.1)
    border-radius: 5px
    background-repeat: repeat
    background-image: linear-gradient(45deg, #ffffff 25%, #ebf2f5 25%, #ebf2f5 50%, #ffffff 50%, #ffffff 75%, #ebf2f5 75%, #ebf2f5 100%)
    background-size: 56.57px 56.57px

div.codeblocks
    height: fit-content
    margin: 4px
    padding: 8px
    .block
        padding: 0px
        margin: 0px
div.runner
    margin: 8px 0px !important
    .runnerState
        margin: 0px !important
        padding: 0px !important
        button
            margin: 0px!important
        .globalState
            margin-left: 10px
            color: gray
            padding-left: 4px
            padding-right: 4px
            vertical-align: middle
    .output
        display: block
        font-family: monospace
        border: 1px solid #ccc
        border-radius: 0px
        background-color: #f5f5f5
        margin: 0 0 10px
        padding: 9.5px
        line-height: 1.42857143
        color: #333333
        white-space: pre-wrap
        word-break: break-all
        word-wrap: break-word
</style>
