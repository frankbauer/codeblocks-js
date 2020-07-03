import { IBlockloadManager, IBlockElementData, IBlockDataBase } from '@/lib/ICodeBlocks'
import { positioninLoadManager } from '@/lib/BlockloadManagers/PositioningManager'
import { uuid } from 'vue-uuid'

export enum LibPurpose {
    PLAYGROUND = 'playground',
    BLOCK = 'block'
}
export interface ICustomLibDefinition {
    name: string
    uid: string
    language: string
    version: string
    purpose: LibPurpose
    _content?: string
    content: () => Promise<string>
}
export class LibLoadManager implements IBlockloadManager {
    get blockTag(): string {
        return 'LIB'
    }

    libs: ICustomLibDefinition[] = []

    public addCustomLibrary(libDef: ICustomLibDefinition) {
        libDef._content = undefined
        libDef.content = () => {
            return this.getContentFor(libDef.uid)
        }

        this.libs[libDef.uid] = libDef
    }

    private async getContentFor(uid: string): Promise<string> {
        const l = this.libs[uid]
        if (l === undefined) {
            return new Promise<string>((resolve, reject) => {
                reject(`[INTERNAL ERROR] Unnown Library '${uid}'.`)
            })
        }

        if (l._content === undefined) {
            const event: any = new Event('codeblocks-fetch')
            l._content = ''
            event.data = l
            event.promise = null
            window.dispatchEvent(event)

            if (event.promise != null) {
                event.promise
                    .then((content: string) => {
                        l._content = content
                        console.log(`Fetched ${l.uid}`)
                        return new Promise<string>((resolve, reject) => {
                            resolve(content)
                        })
                    })
                    .catch((err: any) => {
                        console.error(`Failed fetching ${l.name}, ${l.uid}: ${err}`)
                        return new Promise<string>((resolve, reject) => {
                            reject(err)
                        })
                    })
            } else {
                return new Promise<string>((resolve, reject) => {
                    reject('[INTERNAL ERROR] No Fetch Method')
                })
            }
        }

        return new Promise<string>((resolve, reject) => {
            resolve(l._content)
        })
    }

    loadFromDatablock(
        bl: HTMLElement,
        inBlock: IBlockElementData,
        block: IBlockDataBase,
        editMode: boolean
    ): boolean {
        const f = new Function('return {o:' + bl.innerText + '}')
        const libDef: ICustomLibDefinition = f().o as ICustomLibDefinition
        this.addCustomLibrary(libDef)

        return false
    }
}

export const customLibLoader = new LibLoadManager()
export const libInstaller = function(loaders: { [index: string]: IBlockloadManager }) {
    loaders[customLibLoader.blockTag] = customLibLoader
}
export default libInstaller
