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

        loadAndMount(): Promise<void>

        loadAndMountInElement(element: any): Promise<void>

        loadAndMountInScope(scope: HTMLElement | Document | undefined): Promise<void>

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
