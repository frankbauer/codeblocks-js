export {}
import { ICompilerRegistry, ICompilerState } from '@/lib/ICompilerRegistry'
import { GlobalState } from './plugins/codeBlocks'
declare global {
    const MathJax: any

    interface Window {
        hljs: any
        mountInElement(element: any): void
        MathJax: any
        highlightAll(): void
        highlightElement(element: HTMLElement): void
    }

    interface String {
        replaceAll(search: string, replacement: string): string
        replaceRec(pattern: string | RegExp, replacement: string): string
    }
}

declare module 'vue/types/vue' {
    interface VueConstructor {
        $hljs: any
        $tagger: any
        $CodeBlock: any
        $SEVERITY_ERROR: number
        $SEVERITY_WARNING: number
    }
    interface Vue {
        $l: (key: string, values?: any[]) => string
        $CodeBlock: GlobalState
        $compilerState: ICompilerState
        $compilerRegistry: ICompilerRegistry
        SEVERITY_ERROR: number
        SEVERITY_WARNING: number
        $uuid: any
    }
}
