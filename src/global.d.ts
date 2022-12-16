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
        mountCodeBlocks(scope: HTMLElement | Document | undefined): void
        MathJax: any
        highlightAll(): void
        highlightElement(element: HTMLElement): void
        codeblocks: any
    }

    interface String {
        replaceAllPoly(search: string, replacement: string): string
        replaceRec(pattern: string | RegExp, replacement: string): string
    }
}

declare module '@vue/runtime-core' {
    //Bind to `this` keyword
    interface ComponentCustomProperties {
        $CodeBlock: IGlobalState
        $compilerState: ICompilerState
        $compilerRegistry: ICompilerRegistry
        $uuid: any
    }
}