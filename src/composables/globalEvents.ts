import mitt, { Emitter } from 'mitt'
import { IScriptOutputObject } from '@/lib/IScriptBlock'

type EventHubEvents = {
    'all-mounted': {}
    'console-log': string
    'console-err': string
    'console-nfo': string
    'render-diagnostics': {}
    'output-updated': IScriptOutputObject
    'clicked-run': void
    'before-run': {}
    'initialized-libraries': {}
}
export type EventHubType = Emitter<EventHubEvents>

export function createGlobalEvent() {
    const eventHub: EventHubType = mitt<EventHubEvents>()
    return {
        eventHub,
    }
}
