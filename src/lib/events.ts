import { IScriptOutputObject } from './IScriptBlock';
import { IBlockBookmarkPayload } from './codeBlocksManager'
import mitt, { Emitter, Handler } from 'mitt'

export interface IEmptyEvent {}
export type BlockEvents = {
    'initialized-libraries': IEmptyEvent
    'before-run': IEmptyEvent
    'render-diagnostics': IEmptyEvent
    'all-mounted': IEmptyEvent
    'console-log': string
    'console-err': string
    'console-nfo': string
    'clicked-run': IEmptyEvent
    'output-updated': IScriptOutputObject
}

export type GlobalEvents = {
    'bookmark-block': IBlockBookmarkPayload
}

export default class BlockEvent {
    emitter: Emitter<BlockEvents>

    constructor() {
        this.emitter = mitt<BlockEvents>()
    }

    $on<Key extends keyof BlockEvents>(type: Key, handler: Handler<BlockEvents[Key]>): void {
        this.emitter.on(type, handler)
    }
    $off<Key extends keyof BlockEvents>(type: Key, handler?: Handler<BlockEvents[Key]>): void {
        this.emitter.off(type, handler)
    }

    $emit<Key extends keyof BlockEvents>(type: Key, event: BlockEvents[Key]): void {
        this.emitter.emit(type, event)
    }
}

export class GlobalEvent {
    emitter: Emitter<GlobalEvents>

    constructor() {
        this.emitter = mitt<GlobalEvents>()
    }

    $on<Key extends keyof GlobalEvents>(type: Key, handler: Handler<GlobalEvents[Key]>): void {
        this.emitter.on(type, handler)
    }

    $off<Key extends keyof GlobalEvents>(type: Key, handler?: Handler<GlobalEvents[Key]>): void {
        this.emitter.off(type, handler)
    }

    $emit<Key extends keyof GlobalEvents>(type: Key, event: GlobalEvents[Key]): void {
        this.emitter.emit(type, event)
    }
}
