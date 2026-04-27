import { ICodeBlockScope } from '../IScriptBlock'

export class SmartScope implements ICodeBlockScope {
    [index: number]: HTMLElement
    public length: number = 0

    constructor(
        private localScope: JQuery<HTMLElement>,
        private globalScope: JQuery<HTMLElement>
    ) {
        // Initialize as a jQuery-like object (pointing to localScope's elements)
        this.length = localScope.length
        for (let i = 0; i < localScope.length; i++) {
            this[i] = localScope[i]
        }
    }

    find(selector: string): JQuery<HTMLElement> {
        let res = this.localScope.find(selector)
        if (
            res.length === 0 &&
            this.globalScope !== undefined &&
            this.globalScope.length > 0 &&
            this.globalScope[0] !== this.localScope[0]
        ) {
            res = this.globalScope.find(selector)
        }
        return res
    }

    each(callback: (index: number, element: HTMLElement) => any): any {
        return this.localScope.each(callback)
    }

    filter(selector: string): JQuery<HTMLElement> {
        return this.localScope.filter(selector)
    }

    children(selector?: string): JQuery<HTMLElement> {
        return this.localScope.children(selector)
    }
}
