<script lang="ts">
import 'reflect-metadata'
import { Vue, Component, Prop } from 'vue-property-decorator'
import CodeBlocks, {
    IOnTypeChangeInfo,
    IOnVisibleLinesChangeInfo,
    IOnPlacementChangeInfo,
    IOnScriptVersionChangeInfo,
    IOnSetAutoResetInfo,
    IOnThemeChangeInfo
} from '@/components/CodeBlocks.vue'
import { KnownBlockTypes, CodeOutputTypes } from '@/lib/ICodeBlocks'

var mixin = {
    created: function() {
        console.log(1)
    }
}
@Component
export default class CodeBlocksEditor extends CodeBlocks {
    get editMode(): boolean {
        return true
    }

    onTypeChange(nfo: IOnTypeChangeInfo): void {
        let bl = this.blockById(nfo.id)
        if (bl === undefined) {
            return
        }

        bl.type = nfo.type
        bl.hidden = nfo.hidden
        bl.static = nfo.static
        bl.hasCode = nfo.hasCode
    }

    onVisibleLinesChange(nfo: IOnVisibleLinesChangeInfo): void {
        let bl = this.blockById(nfo.id)
        if (bl === undefined) {
            return
        }

        bl.visibleLines = +nfo.visibleLines
    }
    onPlacementChange(nfo: IOnPlacementChangeInfo): void {
        let bl = this.blockById(nfo.id)
        if (bl === undefined) {
            return
        }

        bl.width = nfo.width
        bl.height = nfo.height
        bl.align = nfo.align
    }
    onCompilerChange(v: string): void {
        const c = this.$compilerRegistry.getCompiler({ languageType: v })
        if (c !== undefined) {
            console.log('Selected Compiler', c, v, this.blockInfo.compiler)
            this.blockInfo.compiler.languageType = v
            this.blockInfo.compiler.version = c.version
            this.blockInfo.language = c.language

            console.log('PRELOADING')
            c.preload()
        }
    }
    onCompilerVersionChange(v: string): void {
        console.log('Selected Version', v, this.blockInfo.compiler.languageType)
        const c = this.$compilerRegistry.getCompiler({
            languageType: this.blockInfo.compiler.languageType,
            version: v
        })
        this.blockInfo.compiler.version = v

        if (c !== undefined) {
            this.blockInfo.language = c.language

            console.log('PRELOADING')
            c.preload()
        }
    }
    onRunStateChange(v: boolean): void {
        this.blockInfo.runCode = v
    }
    onLanguageChange(v: string): void {
        this.blockInfo.language = v
    }
    onCharacterLimitChange(v: number): void {
        this.blockInfo.maxCharacters = v
    }
    onTimeoutChange(v: number): void {
        this.blockInfo.executionTimeout = v
    }
    onWorkerLibChange(v: string[]): void {
        this.blockInfo.workerLibs = v
    }
    onDomLibChange(v: string[]): void {
        this.blockInfo.domLibs = v
    }
    onScriptVersionChange(nfo: IOnScriptVersionChangeInfo): void {
        let bl = this.blockById(nfo.id)
        if (bl === undefined) {
            return
        }
        bl.version = nfo.version
        if (bl.obj) {
            bl.obj.version = nfo.version
        }
    }
    onSetAutoReset(nfo: IOnSetAutoResetInfo): void {
        let bl = this.blockById(nfo.id)
        if (bl === undefined) {
            return
        }
        bl.shouldAutoreset = nfo.shouldAutoreset
    }
    onThemeChange(nfo: IOnThemeChangeInfo): void {
        this.blockInfo.solutionTheme = nfo.solution
        this.blockInfo.codeTheme = nfo.code
    }
    moveUp(idx: number): void {
        this.blockInfo.moveUp(idx)
    }
    moveDown(idx: number): void {
        this.blockInfo.moveDown(idx)
    }
    addNewBlock(): void {
        this.blockInfo.addNewBlock()
    }
    removeBlock(idx: number): void {
        this.blockInfo.removeBlock(idx)
    }
    onOutputParserChange(v: CodeOutputTypes): void {
        this.blockInfo.outputParser = v
    }
}
</script>
