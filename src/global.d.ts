export {}
import { ICompilerRegistry, ICompilerState } from '@/lib/ICompilerRegistry'
import { IGlobalState } from './lib/ICodeBlocks'
declare global {
    const MathJax: any

    interface Console {
        d: (message?: any, ...optionalParams: any[]) => void
        i: (message?: any, ...optionalParams: any[]) => void
    }

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
        $l: (key: string, values?: any[]) => string
        $hljs: any
        $tagger: any
        $CodeBlock: any
        $SEVERITY_ERROR: number
        $SEVERITY_WARNING: number
        $GlobalEventHub: Vue
    }
    interface Vue {
        $l: (key: string, values?: any[]) => string
        $CodeBlock: IGlobalState
        $compilerState: ICompilerState
        $compilerRegistry: ICompilerRegistry
        SEVERITY_ERROR: number
        SEVERITY_WARNING: number
        $uuid: any
    }
}
