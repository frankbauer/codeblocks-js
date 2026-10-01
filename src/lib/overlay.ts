// Overlays are annotations (e.g. grading comments) that a host page attaches to a mounted
// codeblocks app via window.codeblocks.setOverlay(...). They are never part of the
// exported block data. Positions are block-local and 1-based, columns are inclusive.

import { z } from 'zod'
import { sanitizeMarkup } from '@/lib/sanitize'

export interface OverlayPos {
    line: number
    column?: number
}

export type OverlayPosInput = OverlayPos | string | number

export interface OverlayScoreInput {
    points: number
    text?: string
    unit?: string
}

/** hover: bubble on hover, permanent: card below the range, inline: pill at the end of the line */
export type HighlightDisplay = 'hover' | 'permanent' | 'inline'

/** end: pill right after the code of the line, right: at the right edge of the editor */
export type PillAlign = 'end' | 'right'

export interface OverlayHighlight {
    id?: string
    /** shorthand for from/to: "1:6-4:12", "3" or "3-5" */
    range?: string
    from?: OverlayPosInput
    to?: OverlayPosInput
    color?: string
    comment?: string
    display?: HighlightDisplay
    score?: OverlayScoreInput
    /** where the score/inline pill goes, overrides the block's and the overlay's pillAlign */
    align?: PillAlign
}

export interface OverlayGutterMarker {
    line: number
    text?: string
    color?: string
}

export interface OverlayScore extends OverlayScoreInput {
    /** per-line score … */
    line?: number
    /** … or per-range score (becomes an implicit highlight) */
    range?: string
    from?: OverlayPosInput
    to?: OverlayPosInput
    color?: string
    id?: string
    align?: PillAlign
}

export interface BlockOverlay {
    highlights?: OverlayHighlight[]
    gutter?: OverlayGutterMarker[]
    scores?: OverlayScore[]
    /** default pill alignment in this block, overrides the overlay's pillAlign */
    pillAlign?: PillAlign
}

/** keys are the block's data-name or its index ("0", "1", …) among all blocks of the app */
export type OverlayMap = Record<string, BlockOverlay>

export interface ElementBorder {
    style?: 'solid' | 'dashed' | 'dotted'
    width?: string
    color?: string
    radius?: string
}

export interface ElementOverlay {
    /** class name ('result-cell' or '.result-cell') or any CSS selector, resolved inside the app root */
    selector: string
    comment?: string
    display?: 'hover' | 'permanent'
    placement?: 'top' | 'right' | 'bottom' | 'left'
    color?: string
    border?: boolean | string | ElementBorder
    score?: OverlayScoreInput
}

export interface CodeBlocksOverlay {
    blocks?: OverlayMap
    elements?: ElementOverlay[]
    /** default pill alignment for all blocks ('end' if not set) */
    pillAlign?: PillAlign
}

// ---------------------------------------------------------------------------
// Normalized form (still independent of the document, offsets are resolved in the editor)

export interface NormalizedScore {
    points: number
    text?: string
    unit: string
}

/** generated annotations (compiler errors/warnings) are rendered in an error style */
export type OverlayKind = 'error' | 'warning'

export interface NormalizedHighlight {
    kind?: OverlayKind
    id: string
    from: OverlayPos
    to: OverlayPos
    color: string
    comment?: string
    display: HighlightDisplay
    score?: NormalizedScore
    align: PillAlign
}

export interface NormalizedGutterMarker {
    kind?: OverlayKind
    line: number
    text?: string
    color: string
}

export interface NormalizedLineScore extends NormalizedScore {
    line: number
    align: PillAlign
}

export interface NormalizedBlockOverlay {
    highlights: NormalizedHighlight[]
    gutter: NormalizedGutterMarker[]
    scores: NormalizedLineScore[]
}

export interface NormalizedElementOverlay {
    selector: string
    comment?: string
    display: 'hover' | 'permanent'
    placement: 'top' | 'right' | 'bottom' | 'left'
    color: string
    border?: Required<ElementBorder>
    score?: NormalizedScore
}

export const OVERLAY_PRESET_COLORS = ['red', 'amber', 'green', 'blue', 'violet', 'gray'] as const
const DEFAULT_COLOR = 'amber'
const DEFAULT_UNIT = 'P'

// only plain color values, so a color can never break out of the style attribute
const SAFE_CSS_VALUE = /^[#a-zA-Z0-9\s(),.%/-]+$/

/** Maps a preset name to its CSS variable, passes plain CSS colors through. */
export function overlayColor(color: string | undefined, fallback: string = DEFAULT_COLOR): string {
    const c = (color ?? '').trim()
    if (c === '') {
        return overlayColor(fallback, 'gray')
    }
    if ((OVERLAY_PRESET_COLORS as readonly string[]).includes(c)) {
        return `var(--cb-ov-${c})`
    }
    if (SAFE_CSS_VALUE.test(c)) {
        return c
    }
    console.warn('[codeblocks overlay] ignoring invalid color', color)
    return overlayColor(fallback, 'gray')
}

function safeCssValue(v: string | undefined, fallback: string): string {
    const s = (v ?? '').trim()
    return s !== '' && SAFE_CSS_VALUE.test(s) ? s : fallback
}

/** -1.5 → "−1.5P", 2 → "+2P", 0 → "±0P" */
export function formatPoints(points: number, unit: string = DEFAULT_UNIT): string {
    const abs = Math.abs(points)
    const num = Number.isInteger(abs) ? `${abs}` : `${Math.round(abs * 100) / 100}`
    const sign = points < 0 ? '−' : points > 0 ? '+' : '±'
    return `${sign}${num}${unit}`
}

export function scoreTone(points: number): 'neg' | 'pos' | 'zero' {
    return points < 0 ? 'neg' : points > 0 ? 'pos' : 'zero'
}

// ---------------------------------------------------------------------------
// Validation

const posSchema = z.union([
    z.object({ line: z.number().int().min(1), column: z.number().int().min(1).optional() }),
    z.string(),
    z.number().int().min(1),
])

const scoreSchema = z.object({
    points: z.number(),
    text: z.string().optional(),
    unit: z.string().optional(),
})

const highlightSchema = z.object({
    id: z.string().optional(),
    range: z.string().optional(),
    from: posSchema.optional(),
    to: posSchema.optional(),
    color: z.string().optional(),
    comment: z.string().optional(),
    display: z.enum(['hover', 'permanent', 'inline']).optional(),
    score: scoreSchema.optional(),
    align: z.enum(['end', 'right']).optional(),
})

const gutterSchema = z.object({
    line: z.number().int().min(1),
    text: z.string().optional(),
    color: z.string().optional(),
})

const lineOrRangeScoreSchema = scoreSchema.extend({
    line: z.number().int().min(1).optional(),
    range: z.string().optional(),
    from: posSchema.optional(),
    to: posSchema.optional(),
    color: z.string().optional(),
    id: z.string().optional(),
    align: z.enum(['end', 'right']).optional(),
})

const elementSchema = z.object({
    selector: z.string().min(1),
    comment: z.string().optional(),
    display: z.enum(['hover', 'permanent']).optional(),
    placement: z.enum(['top', 'right', 'bottom', 'left']).optional(),
    color: z.string().optional(),
    border: z
        .union([
            z.boolean(),
            z.string(),
            z.object({
                style: z.enum(['solid', 'dashed', 'dotted']).optional(),
                width: z.string().optional(),
                color: z.string().optional(),
                radius: z.string().optional(),
            }),
        ])
        .optional(),
    score: scoreSchema.optional(),
})

function parseItems<T>(schema: z.ZodType<T>, items: unknown, what: string): T[] {
    if (items === undefined || items === null) {
        return []
    }
    if (!Array.isArray(items)) {
        console.warn(`[codeblocks overlay] ${what} must be an array`, items)
        return []
    }
    const result: T[] = []
    for (const item of items) {
        const parsed = schema.safeParse(item)
        if (parsed.success) {
            result.push(parsed.data)
        } else {
            console.warn(`[codeblocks overlay] ignoring invalid ${what}`, item, parsed.error.issues)
        }
    }
    return result
}

// ---------------------------------------------------------------------------
// Positions

/** "4:12" → {line: 4, column: 12}, "4" → {line: 4} */
export function parsePos(p: OverlayPosInput | undefined): OverlayPos | undefined {
    if (p === undefined) {
        return undefined
    }
    if (typeof p === 'number') {
        return { line: p }
    }
    if (typeof p === 'string') {
        const m = p.trim().match(/^(\d+)(?::(\d+))?$/)
        if (!m) {
            return undefined
        }
        const line = Number(m[1])
        const column = m[2] !== undefined ? Number(m[2]) : undefined
        if (line < 1 || (column !== undefined && column < 1)) {
            return undefined
        }
        return column !== undefined ? { line, column } : { line }
    }
    return p
}

function parseRange(item: {
    range?: string
    from?: OverlayPosInput
    to?: OverlayPosInput
}): { from: OverlayPos; to: OverlayPos } | undefined {
    let fromIn: OverlayPosInput | undefined = item.from
    let toIn: OverlayPosInput | undefined = item.to
    if (item.range !== undefined) {
        const parts = item.range.split('-')
        if (parts.length > 2) {
            return undefined
        }
        fromIn = parts[0]
        toIn = parts[1] ?? parts[0]
    }
    const from = parsePos(fromIn)
    // a missing end covers the rest of the start line
    const to = parsePos(toIn) ?? (from ? { line: from.line } : undefined)
    if (!from || !to) {
        return undefined
    }
    return { from, to }
}

function normalizeScore(s: OverlayScoreInput | undefined): NormalizedScore | undefined {
    if (!s || !Number.isFinite(s.points)) {
        return undefined
    }
    return { points: s.points, text: s.text, unit: s.unit ?? DEFAULT_UNIT }
}

let generatedIds = 0
const nextId = () => `cb-ov-${++generatedIds}`

// ---------------------------------------------------------------------------

const PILL_ALIGNS: PillAlign[] = ['end', 'right']

function pillAlign(value: unknown, fallback: PillAlign): PillAlign {
    if (value === undefined) {
        return fallback
    }
    if (PILL_ALIGNS.includes(value as PillAlign)) {
        return value as PillAlign
    }
    console.warn(`[codeblocks overlay] pillAlign must be 'end' or 'right'`, value)
    return fallback
}

/**
 * @param defaultAlign the overlay-wide pillAlign; the block's pillAlign and each item's
 *     align take precedence
 */
export function normalizeBlockOverlay(
    raw: BlockOverlay | undefined,
    defaultAlign: PillAlign = 'end'
): NormalizedBlockOverlay {
    const res: NormalizedBlockOverlay = { highlights: [], gutter: [], scores: [] }
    if (!raw) {
        return res
    }
    const blockAlign = pillAlign(raw.pillAlign, defaultAlign)

    for (const h of parseItems(highlightSchema, raw.highlights, 'highlight')) {
        const r = parseRange(h)
        if (!r) {
            console.warn('[codeblocks overlay] highlight needs a valid range or from/to', h)
            continue
        }
        res.highlights.push({
            id: h.id ?? nextId(),
            ...r,
            color: overlayColor(h.color),
            comment: h.comment,
            display: h.display ?? 'hover',
            score: normalizeScore(h.score),
            align: h.align ?? blockAlign,
        })
    }

    for (const g of parseItems(gutterSchema, raw.gutter, 'gutter marker')) {
        res.gutter.push({ line: g.line, text: g.text, color: overlayColor(g.color) })
    }

    for (const s of parseItems(lineOrRangeScoreSchema, raw.scores, 'score')) {
        const score = normalizeScore(s)!
        if (s.range !== undefined || s.from !== undefined) {
            // a range score is a highlight without a comment
            const r = parseRange(s)
            if (!r) {
                console.warn('[codeblocks overlay] score has an invalid range', s)
                continue
            }
            res.highlights.push({
                id: s.id ?? nextId(),
                ...r,
                color: overlayColor(
                    s.color,
                    s.points < 0 ? 'red' : s.points > 0 ? 'green' : 'gray'
                ),
                display: 'hover',
                score,
                align: s.align ?? blockAlign,
            })
        } else if (s.line !== undefined) {
            res.scores.push({ ...score, line: s.line, align: s.align ?? blockAlign })
        } else {
            console.warn('[codeblocks overlay] score needs a line or a range', s)
        }
    }

    return res
}

export function normalizeElementOverlays(raw: unknown): NormalizedElementOverlay[] {
    return parseItems(elementSchema, raw, 'element overlay').map((e) => {
        let selector = e.selector.trim()
        // a bare class name
        if (/^-?[_a-zA-Z][_a-zA-Z0-9-]*$/.test(selector)) {
            selector = '.' + selector
        }
        const color = overlayColor(e.color)
        let border: Required<ElementBorder> | undefined
        if (e.border !== undefined && e.border !== false) {
            const b: ElementBorder =
                e.border === true
                    ? {}
                    : typeof e.border === 'string'
                      ? { style: e.border as ElementBorder['style'] }
                      : e.border
            border = {
                style: ['solid', 'dashed', 'dotted'].includes(b.style ?? '')
                    ? (b.style as ElementBorder['style'])!
                    : 'solid',
                width: safeCssValue(b.width, '1.5px'),
                color: b.color ? overlayColor(b.color) : color,
                radius: safeCssValue(b.radius, '3px'),
            }
        }
        return {
            selector,
            comment: e.comment,
            display: e.display ?? 'hover',
            placement: e.placement ?? 'top',
            color,
            border,
            score: normalizeScore(e.score),
        }
    })
}

/** Validates the whole overlay object up front, so mistakes are reported when it is set. */
export function validateOverlay(overlay: unknown): overlay is CodeBlocksOverlay {
    if (overlay === null || typeof overlay !== 'object' || Array.isArray(overlay)) {
        console.warn('[codeblocks overlay] overlay must be an object { blocks, elements }', overlay)
        return false
    }
    const o = overlay as Record<string, unknown>
    for (const key of Object.keys(o)) {
        if (key !== 'blocks' && key !== 'elements' && key !== 'pillAlign') {
            console.warn(
                `[codeblocks overlay] unknown key "${key}" (expected blocks, elements, pillAlign)`
            )
        }
    }
    if (o.blocks !== undefined) {
        if (o.blocks === null || typeof o.blocks !== 'object' || Array.isArray(o.blocks)) {
            console.warn('[codeblocks overlay] blocks must be a map of block name/index → overlay')
            return false
        }
        const align = pillAlign(o.pillAlign, 'end')
        Object.values(o.blocks as OverlayMap).forEach((b) => normalizeBlockOverlay(b, align))
    }
    normalizeElementOverlays(o.elements)
    return true
}

// ---------------------------------------------------------------------------
// Small DOM helpers shared by the editor and the element overlays.
// Authored texts (comments, score texts) may contain formatting markup and are sanitized
// with the strict rules. Compiler messages quote student code, so they are always text.

function setContent(el: HTMLElement, text: string, plain = false) {
    if (plain) {
        el.textContent = text
    } else {
        el.innerHTML = sanitizeMarkup(text, { strict: true })
    }
}

export interface PillOptions {
    /** points are shown first; without a score the pill is a plain comment pill */
    score?: NormalizedScore
    /** shown after the points; defaults to the score's text */
    text?: string
    /** colour dot in front (range scores) */
    dot?: string
    /** tint of a comment pill without score */
    color?: string
    id?: string
}

export function createPill({ score, text, dot, color, id }: PillOptions): HTMLElement {
    const pill = document.createElement('span')
    pill.className = score
        ? `cb-ov-pill cb-ov-pill--${scoreTone(score.points)}`
        : 'cb-ov-pill cb-ov-pill--comment'
    if (!score && color) {
        pill.style.setProperty('--cb-ov-tone', color)
    }
    if (id) {
        pill.dataset.cbOvId = id
    }
    if (dot) {
        const d = document.createElement('span')
        d.className = 'cb-ov-dot'
        d.style.setProperty('--cb-ov-color', dot)
        pill.appendChild(d)
    }
    if (score) {
        const pts = document.createElement('span')
        pts.className = 'cb-ov-pts'
        pts.textContent = formatPoints(score.points, score.unit)
        pill.appendChild(pts)
    }
    const label = text ?? score?.text
    if (label) {
        if (score) {
            const sep = document.createElement('span')
            sep.className = 'cb-ov-sep'
            pill.appendChild(sep)
        }
        const txt = document.createElement('span')
        txt.className = 'cb-ov-txt'
        setContent(txt, label)
        // the full text, in case it is cut off
        pill.title = txt.textContent ?? ''
        pill.appendChild(txt)
    }
    return pill
}

export function createScorePill(score: NormalizedScore, dot?: string, id?: string): HTMLElement {
    return createPill({ score, dot, id })
}

export interface OverlayEntry {
    id?: string
    color: string
    comment?: string
    score?: NormalizedScore
    /** compiler error/warning: plain text in a code font */
    kind?: OverlayKind
}

/** One row in a bubble/card: colour chip, comment and optional score pill */
export function createEntry(entry: OverlayEntry, withChip = true): HTMLElement {
    const row = document.createElement('div')
    row.className = entry.kind ? `cb-ov-entry cb-ov-entry--${entry.kind}` : 'cb-ov-entry'
    row.style.setProperty('--cb-ov-color', entry.color)
    if (entry.id) {
        row.dataset.cbOvId = entry.id
    }
    if (withChip) {
        const chip = document.createElement('span')
        chip.className = 'cb-ov-chip'
        row.appendChild(chip)
    }
    const body = document.createElement('div')
    body.className = 'cb-ov-entry-body'
    if (entry.comment) {
        const c = document.createElement('div')
        c.className = 'cb-ov-comment'
        setContent(c, entry.comment, entry.kind !== undefined)
        body.appendChild(c)
    }
    if (entry.score) {
        body.appendChild(createScorePill(entry.score))
    }
    row.appendChild(body)
    return row
}

export function createBubble(entries: OverlayEntry[], theme: 'light' | 'dark'): HTMLElement {
    const bubble = document.createElement('div')
    bubble.className = 'cb-ov-bubble'
    bubble.dataset.cbTheme = theme
    // errors always get their severity icon, other entries a chip only when there are several
    const withChip = entries.length > 1 || entries.some((e) => e.kind)
    entries.forEach((e) => bubble.appendChild(createEntry(e, withChip)))
    if (entries.length === 1) {
        bubble.style.setProperty('--cb-ov-color', entries[0].color)
    }
    return bubble
}
