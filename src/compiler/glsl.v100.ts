import 'reflect-metadata'
import { Vue, Component, Prop } from 'vue-property-decorator'
import {
    ICompilerInstance,
    ICompilerErrorDescription,
    ICompilerRegistry
} from '@/lib/ICompilerRegistry'

function runGLSLWorker(
    questionID: string,
    prog: string,
    callingCodeBlocks: any,
    maxRuntime: number,
    logCallback: (txt: string) => void,
    infoCallback: (txt: string) => void,
    errCallback: (txt: string) => void,
    compileFailedCallback: (info: ICompilerErrorDescription) => void,
    finishCallback: (success: boolean, overrideOutput?: any) => void
) {
    var outputData: string[] = []
    callingCodeBlocks.blocks.filter(b => b.hasCode).forEach(block => outputData.push(block.content))
    /*$("[data-contains-code][data-question="+questionID+"]").each(function(i, block) {
        if (block.getAttribute('data-ignore')) return;
        if (!blockHasProgramCode(block)) return;
        const editor = editors[block.id];
        if (editor) {
            outputData.push(block.value);
        } else {
            outputData.push(block.innerHTML);
        }
    });*/
    finishCallback(true, outputData)
}

@Component
export class GLSLV100Compiler extends Vue implements ICompilerInstance {
    readonly version = '100'
    readonly language = 'glsl'
    readonly canRun = true
    readonly canStop = false
    readonly canCompileOnType = false
    isReady = true
    isRunning = false

    preload() {}
    compileAndRun(
        questionID: string,
        code: string,
        callingCodeBlocks: any,
        max_ms: number,
        log_callback: (txt: string) => void,
        info_callback: (txt: string) => void,
        err_callback: (txt: string) => void,
        compileFailedCallback: (info: ICompilerErrorDescription) => void,
        finishedExecutionCB: (success: boolean, overrideOutput?: any) => void
    ): void {
        return runGLSLWorker(
            questionID,
            code,
            callingCodeBlocks,
            max_ms,
            log_callback,
            info_callback,
            err_callback,
            compileFailedCallback,
            finishedExecutionCB
        )
    }
}
export const v100 = new GLSLV100Compiler()
