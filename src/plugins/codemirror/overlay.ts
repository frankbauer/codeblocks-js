// CodeMirror extension that renders block overlays (highlights, comments, gutter markers
// and scores). Overlays are organised in named layers, e.g. the overlay set by the host page
// ('manual') and the compiler diagnostics ('errors'). Replacing one layer keeps the others
// untouched, all layers are rendered together.

import {
    Decoration,
    type DecorationSet,
    EditorView,
    gutter,
    GutterMarker,
    hoverTooltip,
    WidgetType,
} from '@codemirror/view'
import {
    type EditorState,
    type Extension,
    type Range,
    RangeSetBuilder,
    StateEffect,
    StateField,
    type Text,
} from '@codemirror/state'
import { computePosition, flip, offset, shift } from '@floating-ui/dom'
import { ErrorSeverity, type ICompilerErrorDescription } from '@/lib/ICompilerRegistry'
import {
    createBubble,
    createEntry,
    createScorePill,
    type NormalizedBlockOverlay,
    type NormalizedGutterMarker,
    type NormalizedHighlight,
    type NormalizedLineScore,
    type OverlayEntry,
    type OverlayPos,
} from '@/lib/overlay'

const MAX_LANES = 3

export const MANUAL_LAYER = 'manual'
export const ERROR_LAYER = 'errors'

interface ResolvedHighlight extends NormalizedHighlight {
    start: number
    end: number
}

interface AnchoredScore extends NormalizedLineScore {
    pos: number
}

interface AnchoredGutter extends NormalizedGutterMarker {
    pos: number
}

interface LayerState {
    highlights: ResolvedHighlight[]
    scores: AnchoredScore[]
    gutter: AnchoredGutter[]
}

interface OverlayState {
    layers: ReadonlyMap<string, LayerState>
    focus: string | null
}

/** replaces one layer (an empty or undefined overlay removes it) */
export const setOverlayLayerEffect = StateEffect.define<{
    layer: string
    overlay: NormalizedBlockOverlay | undefined
}>()

/** focus one highlight (cross-highlighting from pills, cards and tooltips) */
export const focusOverlayEffect = StateEffect.define<string | null>()

export function isEmptyBlockOverlay(o: NormalizedBlockOverlay | undefined): boolean {
    return !o || (o.highlights.length === 0 && o.gutter.length === 0 && o.scores.length === 0)
}

function lineAt(doc: Text, line: number) {
    return doc.line(Math.max(1, Math.min(line, doc.lines)))
}

function startOffset(doc: Text, p: OverlayPos): number {
    const l = lineAt(doc, p.line)
    return p.column === undefined ? l.from : Math.min(l.from + p.column - 1, l.to)
}

// end columns are inclusive
function endOffset(doc: Text, p: OverlayPos): number {
    const l = lineAt(doc, p.line)
    return p.column === undefined ? l.to : Math.min(l.from + p.column, l.to)
}

function resolveLayer(doc: Text, overlay: NormalizedBlockOverlay): LayerState {
    const highlights = overlay.highlights.map((h) => {
        let start = startOffset(doc, h.from)
        let end = endOffset(doc, h.to)
        if (end < start) {
            ;[start, end] = [end, start]
        }
        // diagnostics must stay visible, even when they point at an empty position
        if (h.kind && end <= start) {
            if (start < doc.length) {
                end = start + 1
            } else {
                start = Math.max(0, end - 1)
            }
        }
        return { ...h, start, end }
    })
    return {
        highlights,
        scores: overlay.scores.map((s) => ({ ...s, pos: lineAt(doc, s.line).from })),
        gutter: overlay.gutter.map((g) => ({ ...g, pos: lineAt(doc, g.line).from })),
    }
}

function mapLayer(layer: LayerState, tr: { changes: { mapPos(p: number, a?: number): number } }) {
    const ch = tr.changes
    return {
        highlights: layer.highlights.map((h) => {
            const start = ch.mapPos(h.start, 1)
            return { ...h, start, end: Math.max(start, ch.mapPos(h.end, -1)) }
        }),
        scores: layer.scores.map((s) => ({ ...s, pos: ch.mapPos(s.pos, -1) })),
        gutter: layer.gutter.map((g) => ({ ...g, pos: ch.mapPos(g.pos, -1) })),
    }
}

const overlayField = StateField.define<OverlayState>({
    create: () => ({ layers: new Map(), focus: null }),
    update(value, tr) {
        let next = value
        if (tr.docChanged && next.layers.size > 0) {
            const layers = new Map<string, LayerState>()
            next.layers.forEach((l, name) => layers.set(name, mapLayer(l, tr)))
            next = { ...next, layers }
        }
        for (const e of tr.effects) {
            if (e.is(setOverlayLayerEffect)) {
                const layers = new Map(next.layers)
                if (isEmptyBlockOverlay(e.value.overlay)) {
                    layers.delete(e.value.layer)
                } else {
                    layers.set(e.value.layer, resolveLayer(tr.state.doc, e.value.overlay!))
                }
                next = { ...next, layers }
            } else if (e.is(focusOverlayEffect) && e.value !== next.focus) {
                next = { ...next, focus: e.value }
            }
        }
        return next
    },
})

function allOf<K extends keyof LayerState>(state: OverlayState, key: K): LayerState[K] {
    const res: LayerState[K][number][] = []
    state.layers.forEach((l) => res.push(...l[key]))
    return res as LayerState[K]
}

function assignLanes(hls: ResolvedHighlight[]): Map<ResolvedHighlight, number> {
    // outer (longer) ranges first, so they get the lowest lane
    const sorted = [...hls].sort((a, b) => a.start - b.start || b.end - a.end)
    const lanes = new Map<ResolvedHighlight, number>()
    const laneEnds: number[] = []
    for (const h of sorted) {
        let lane = laneEnds.findIndex((end) => end <= h.start)
        if (lane < 0) {
            lane = laneEnds.length
            laneEnds.push(h.end)
        } else {
            laneEnds[lane] = h.end
        }
        lanes.set(h, Math.min(lane, MAX_LANES - 1))
    }
    return lanes
}

// ---------------------------------------------------------------------------
// Compiler diagnostics as an overlay layer

const SEVERITY_COLOR = {
    error: 'var(--cb-ov-red)',
    warning: 'var(--cb-ov-amber)',
}

/**
 * Converts compiler diagnostics (global line numbers, 0-based columns with an exclusive
 * end) into a block-local overlay.
 */
export function errorsToBlockOverlay(
    errors: ICompilerErrorDescription[],
    firstLine: number,
    doc: Text
): NormalizedBlockOverlay {
    const res: NormalizedBlockOverlay = { highlights: [], gutter: [], scores: [] }
    errors.forEach((e, i) => {
        const kind = e.severity === ErrorSeverity.Warning ? 'warning' : 'error'
        let from: OverlayPos
        let to: OverlayPos
        if (firstLine === 0) {
            // no line information: mark the end of the block
            const last = doc.line(doc.lines)
            from = to = { line: doc.lines, column: Math.max(1, last.length) }
        } else {
            const sLine = e.start.line - firstLine + 1
            if (sLine < 1 || sLine > doc.lines) {
                return
            }
            from = { line: sLine, column: e.start.column + 1 }
            const eLine = e.end.line - firstLine + 1
            to =
                eLine >= sLine && eLine <= doc.lines
                    ? { line: eLine, column: Math.max(1, e.end.column) }
                    : from
        }
        const color = SEVERITY_COLOR[kind]
        res.highlights.push({
            id: `cb-ov-err-${i}`,
            kind,
            from,
            to,
            color,
            comment: e.message,
            display: 'hover',
        })
        res.gutter.push({ kind, line: from.line, text: e.message, color })
    })
    return res
}

// ---------------------------------------------------------------------------
// Widgets

function themeOf(view: EditorView): 'light' | 'dark' {
    return view.dom.closest(
        '.theme-dark, .theme-solarized-dark, .system-code-box-dark, [data-cb-theme=dark]'
    )
        ? 'dark'
        : 'light'
}

function bindFocus(view: EditorView, el: HTMLElement) {
    el.addEventListener('mouseover', (ev) => {
        const id = (ev.target as HTMLElement).closest<HTMLElement>('[data-cb-ov-id]')?.dataset
            .cbOvId
        if (id) {
            view.dispatch({ effects: focusOverlayEffect.of(id) })
        }
    })
    el.addEventListener('mouseleave', () => view.dispatch({ effects: focusOverlayEffect.of(null) }))
}

interface PillData {
    id?: string
    dot?: string
    score: NormalizedLineScore | NonNullable<NormalizedHighlight['score']>
}

class PillsWidget extends WidgetType {
    constructor(private pills: PillData[]) {
        super()
    }

    eq(other: PillsWidget) {
        return JSON.stringify(other.pills) === JSON.stringify(this.pills)
    }

    toDOM(view: EditorView) {
        const wrap = document.createElement('span')
        wrap.className = 'cb-ov-pills'
        for (const p of this.pills) {
            wrap.appendChild(createScorePill(p.score, p.dot, p.id))
        }
        bindFocus(view, wrap)
        return wrap
    }

    ignoreEvent() {
        return true
    }
}

class CommentCardsWidget extends WidgetType {
    constructor(private entries: OverlayEntry[]) {
        super()
    }

    eq(other: CommentCardsWidget) {
        return JSON.stringify(other.entries) === JSON.stringify(this.entries)
    }

    toDOM(view: EditorView) {
        const wrap = document.createElement('div')
        wrap.className = 'cb-ov-cards'
        for (const e of this.entries) {
            const card = createEntry(e, false)
            card.classList.add('cb-ov-card')
            wrap.appendChild(card)
        }
        bindFocus(view, wrap)
        return wrap
    }

    ignoreEvent() {
        return true
    }
}

function buildDecorations(state: EditorState): DecorationSet {
    const value = state.field(overlayField)
    if (value.layers.size === 0) {
        return Decoration.none
    }
    const doc = state.doc
    const ranges: Range<Decoration>[] = []
    const highlights = allOf(value, 'highlights')
    const lanes = assignLanes(highlights)

    for (const h of highlights) {
        if (h.end <= h.start) {
            continue
        }
        const cls = ['cb-ov-hl', `cb-ov-lane-${lanes.get(h) ?? 0}`]
        if (h.kind) {
            // keep the familiar wave image of compiler diagnostics
            cls.push(`cb-ov-hl--${h.kind}`, h.kind === 'warning' ? 'yellow-wave' : 'red-wave')
        }
        if (value.focus !== null) {
            cls.push(value.focus === h.id ? 'cb-ov-hl--focus' : 'cb-ov-hl--dim')
        }
        ranges.push(
            Decoration.mark({
                class: cls.join(' '),
                attributes: { style: `--cb-ov-color: ${h.color}`, 'data-cb-ov-id': h.id },
            }).range(h.start, h.end)
        )
    }

    // pills at the end of a line: line scores first, then range scores (on their end line)
    const pillsByLine = new Map<number, PillData[]>()
    const addPill = (line: number, p: PillData) => {
        if (!pillsByLine.has(line)) {
            pillsByLine.set(line, [])
        }
        pillsByLine.get(line)!.push(p)
    }
    for (const s of allOf(value, 'scores')) {
        addPill(doc.lineAt(s.pos).number, { score: s })
    }
    const byStart = [...highlights].sort((a, b) => a.start - b.start || b.end - a.end)
    for (const h of byStart) {
        if (h.score) {
            addPill(doc.lineAt(h.end).number, { id: h.id, dot: h.color, score: h.score })
        }
    }
    for (const [line, pills] of pillsByLine) {
        ranges.push(
            Decoration.widget({ widget: new PillsWidget(pills), side: 1 }).range(doc.line(line).to)
        )
    }

    // permanent comments, merged per end line
    const cardsByLine = new Map<number, OverlayEntry[]>()
    for (const h of byStart) {
        if (h.display !== 'permanent' || !h.comment) {
            continue
        }
        const line = doc.lineAt(h.end).number
        if (!cardsByLine.has(line)) {
            cardsByLine.set(line, [])
        }
        // the score is already shown as a pill at the end of the line
        cardsByLine.get(line)!.push({ id: h.id, color: h.color, comment: h.comment, kind: h.kind })
    }
    for (const [line, entries] of cardsByLine) {
        ranges.push(
            Decoration.widget({
                widget: new CommentCardsWidget(entries),
                block: true,
                side: 1,
            }).range(doc.line(line).to)
        )
    }

    return Decoration.set(ranges, true)
}

// ---------------------------------------------------------------------------
// Gutter

let openGutterBubble: { el: HTMLElement; owner: HTMLElement } | null = null

function closeGutterBubble() {
    openGutterBubble?.el.remove()
    openGutterBubble = null
}

const KIND_ORDER = { error: 0, warning: 1 }
const kindRank = (g: NormalizedGutterMarker) => (g.kind ? KIND_ORDER[g.kind] : 2)

class OverlayGutterMarker extends GutterMarker {
    private items: NormalizedGutterMarker[]

    constructor(items: NormalizedGutterMarker[]) {
        super()
        // errors first, then warnings, then the manual markers
        this.items = [...items].sort((a, b) => kindRank(a) - kindRank(b))
    }

    eq(other: OverlayGutterMarker) {
        return JSON.stringify(other.items) === JSON.stringify(this.items)
    }

    toDOM(view: EditorView) {
        const dot = document.createElement('span')
        const top = this.items[0]
        dot.className = 'cb-ov-gutter-dot'
        if (top.kind) {
            dot.classList.add(`cb-ov-gutter-dot--${top.kind}`)
        }
        if (this.items.length > 1) {
            dot.classList.add('cb-ov-gutter-dot--multi')
            dot.dataset.count = `${this.items.length}`
        }
        dot.style.setProperty('--cb-ov-color', top.color)
        const entries: OverlayEntry[] = this.items
            .filter((i) => i.text)
            .map((i) => ({ color: i.color, comment: i.text, kind: i.kind }))
        if (entries.length === 0) {
            return dot
        }
        dot.tabIndex = 0
        let pinned = false
        const show = () => {
            if (openGutterBubble?.owner === dot) {
                return
            }
            closeGutterBubble()
            const bubble = createBubble(entries, themeOf(view))
            bubble.classList.add('cb-ov-bubble--floating')
            document.body.appendChild(bubble)
            openGutterBubble = { el: bubble, owner: dot }
            computePosition(dot, bubble, {
                strategy: 'fixed',
                placement: 'right',
                middleware: [offset(8), flip(), shift({ padding: 6 })],
            }).then(({ x, y }) => {
                bubble.style.left = `${x}px`
                bubble.style.top = `${y}px`
            })
        }
        const hide = () => {
            if (!pinned && openGutterBubble?.owner === dot) {
                closeGutterBubble()
            }
        }
        dot.addEventListener('mouseenter', show)
        dot.addEventListener('mouseleave', hide)
        dot.addEventListener('focus', show)
        dot.addEventListener('blur', () => {
            pinned = false
            hide()
        })
        dot.addEventListener('mousedown', (ev) => {
            ev.preventDefault()
            pinned = !pinned
            pinned ? show() : closeGutterBubble()
        })
        return dot
    }

    destroy(dom: Node) {
        if (openGutterBubble?.owner === dom) {
            closeGutterBubble()
        }
    }
}

const overlayGutter = gutter({
    class: 'cb-ov-gutter',
    markers: (view) => {
        const doc = view.state.doc
        const byLine = new Map<number, NormalizedGutterMarker[]>()
        for (const g of allOf(view.state.field(overlayField), 'gutter')) {
            const line = doc.lineAt(g.pos)
            if (!byLine.has(line.from)) {
                byLine.set(line.from, [])
            }
            byLine.get(line.from)!.push(g)
        }
        const builder = new RangeSetBuilder<GutterMarker>()
        for (const from of [...byLine.keys()].sort((a, b) => a - b)) {
            builder.add(from, from, new OverlayGutterMarker(byLine.get(from)!))
        }
        return builder.finish()
    },
    lineMarkerChange: (update) =>
        update.startState.field(overlayField).layers !== update.state.field(overlayField).layers,
})

// ---------------------------------------------------------------------------
// Hover tooltip (all hover highlights under the pointer, innermost first)

const overlayHover = hoverTooltip((view, pos) => {
    const hits = allOf(view.state.field(overlayField), 'highlights')
        .filter(
            (h) =>
                h.display === 'hover' &&
                (h.comment || h.score) &&
                h.start <= pos &&
                pos <= h.end &&
                h.end > h.start
        )
        .sort((a, b) => a.end - a.start - (b.end - b.start))
    if (hits.length === 0) {
        return null
    }
    return {
        // anchored at the innermost range, which is closest to the pointer
        pos: hits[0].start,
        end: hits[0].end,
        above: true,
        create: () => {
            const dom = createBubble(
                hits.map((h) => ({
                    id: h.id,
                    color: h.color,
                    comment: h.comment,
                    score: h.score,
                    kind: h.kind,
                })),
                themeOf(view)
            )
            dom.classList.add('cb-ov-tooltip')
            bindFocus(view, dom)
            // tooltips are mounted/destroyed during an editor update, so the focus
            // change is dispatched afterwards
            const setFocus = (id: string | null) =>
                setTimeout(() => {
                    if (view.dom.isConnected) {
                        view.dispatch({ effects: focusOverlayEffect.of(id) })
                    }
                })
            return {
                dom,
                mount: () => {
                    if (hits.length === 1) {
                        setFocus(hits[0].id)
                    }
                },
                destroy: () => setFocus(null),
            }
        },
    }
})

// ---------------------------------------------------------------------------

/** The overlay extension, layers are set with setOverlayLayerEffect */
export function overlayExtension(): Extension {
    return [
        overlayField,
        EditorView.decorations.compute([overlayField], buildDecorations),
        overlayHover,
        overlayGutter,
    ]
}
