// Overlays on arbitrary DOM elements inside one codeblocks app (e.g. a custom UI that a
// playground renders). Elements are matched by selector inside the app's root element
// only, so several codeblocks instances on the same page never influence each other.
// Bubbles live in a per-app layer in <body>, as the playground clips its content.

import { autoUpdate, computePosition, flip, hide, offset, shift } from '@floating-ui/dom'
import {
    createBubble,
    normalizeElementOverlays,
    type NormalizedElementOverlay,
    type OverlayEntry,
} from '@/lib/overlay'

const EL_CLASS = 'cb-ov-el'
const RINGS_CLASS = 'cb-ov-el--rings'
const STYLE_PROPS = [
    '--cb-ov-color',
    '--cb-ov-border-style',
    '--cb-ov-border-width',
    '--cb-ov-border-radius',
    '--cb-ov-rings',
]
const HOVER_HIDE_DELAY = 120

function toEntry(o: NormalizedElementOverlay): OverlayEntry | undefined {
    if (!o.comment && !o.score) {
        return undefined
    }
    return { color: o.color, comment: o.comment, score: o.score }
}

export class DomOverlayManager {
    private overlays: NormalizedElementOverlay[] = []
    private touched = new Set<HTMLElement>()
    private cleanups: (() => void)[] = []
    private layer: HTMLElement | null = null
    private scheduled = false
    private disposed = false

    private hoverBubble: HTMLElement | null = null
    private hoverTarget: HTMLElement | null = null
    private hoverCleanup: (() => void) | null = null
    private hideTimer: ReturnType<typeof setTimeout> | null = null
    private listeningOn: HTMLElement | null = null

    constructor(
        private getRoot: () => HTMLElement | null,
        private appUUID: string,
        private getTheme: () => 'light' | 'dark'
    ) {}

    setOverlays(raw: unknown) {
        this.overlays = normalizeElementOverlays(raw)
        this.schedule()
    }

    /** re-applies after Vue and the browser finished rendering; repeated calls are merged */
    schedule() {
        if (this.scheduled || this.disposed) {
            return
        }
        this.scheduled = true
        Promise.resolve().then(() =>
            requestAnimationFrame(() => {
                this.scheduled = false
                if (!this.disposed) {
                    this.apply()
                }
            })
        )
    }

    apply() {
        this.clear()
        const root = this.getRoot()
        if (!root) {
            return
        }
        this.bindHover(root)
        if (this.overlays.length === 0) {
            return
        }

        // all overlays per element, in definition order
        const byElement = new Map<HTMLElement, NormalizedElementOverlay[]>()
        for (const o of this.overlays) {
            for (const el of this.query(root, o.selector)) {
                if (!byElement.has(el)) {
                    byElement.set(el, [])
                }
                byElement.get(el)!.push(o)
            }
        }

        for (const [el, list] of byElement) {
            this.decorate(el, list)
            const permanent = list
                .filter((o) => o.display === 'permanent')
                .map(toEntry)
                .filter((e): e is OverlayEntry => e !== undefined)
            if (permanent.length > 0) {
                const placement = list.find((o) => o.display === 'permanent')!.placement
                this.cleanups.push(
                    this.float(el, createBubble(permanent, this.getTheme()), placement)
                )
            }
        }
    }

    clear() {
        this.cleanups.forEach((c) => c())
        this.cleanups = []
        for (const el of this.touched) {
            el.classList.remove(EL_CLASS, RINGS_CLASS)
            STYLE_PROPS.forEach((p) => el.style.removeProperty(p))
        }
        this.touched.clear()
        this.hideHover(true)
        this.layer?.replaceChildren()
    }

    dispose() {
        this.disposed = true
        this.clear()
        this.unbindHover()
        this.layer?.remove()
        this.layer = null
    }

    // -----------------------------------------------------------------------

    private query(root: HTMLElement, selector: string): HTMLElement[] {
        try {
            // querySelectorAll on the root only ever returns descendants of the root
            return Array.from(root.querySelectorAll<HTMLElement>(selector))
        } catch {
            console.warn('[codeblocks overlay] invalid selector', selector)
            return []
        }
    }

    private matches(el: Element, selector: string): boolean {
        try {
            return el.matches(selector)
        } catch {
            return false
        }
    }

    private decorate(el: HTMLElement, list: NormalizedElementOverlay[]) {
        const borders = list.filter((o) => o.border)
        if (borders.length === 0) {
            return
        }
        this.touched.add(el)
        const first = borders[0].border!
        el.classList.add(EL_CLASS)
        el.style.setProperty('--cb-ov-color', first.color)
        el.style.setProperty('--cb-ov-border-style', first.style)
        el.style.setProperty('--cb-ov-border-width', first.width)
        el.style.setProperty('--cb-ov-border-radius', first.radius)
        if (borders.length > 1) {
            // only one outline per element: further borders become rings around it
            const rings = borders.slice(1).map((o, i) => {
                const spread = `calc(2px + ${first.width} + ${(i + 1) * 3}px)`
                return `0 0 0 ${spread} color-mix(in srgb, ${o.border!.color} 70%, transparent)`
            })
            el.classList.add(RINGS_CLASS)
            el.style.setProperty('--cb-ov-rings', rings.reverse().join(', '))
        }
    }

    private getLayer(): HTMLElement {
        if (!this.layer || !this.layer.isConnected) {
            this.layer = document.createElement('div')
            this.layer.className = 'cb-ov-layer'
            this.layer.dataset.cbApp = this.appUUID
            document.body.appendChild(this.layer)
        }
        this.layer.dataset.cbTheme = this.getTheme()
        return this.layer
    }

    private float(
        el: HTMLElement,
        bubble: HTMLElement,
        placement: NormalizedElementOverlay['placement']
    ): () => void {
        bubble.classList.add('cb-ov-bubble--floating')
        this.getLayer().appendChild(bubble)
        const update = () => {
            if (!el.isConnected) {
                bubble.style.visibility = 'hidden'
                return
            }
            computePosition(el, bubble, {
                strategy: 'fixed',
                placement,
                middleware: [offset(8), flip(), shift({ padding: 6 }), hide()],
            }).then(({ x, y, middlewareData }) => {
                bubble.style.left = `${x}px`
                bubble.style.top = `${y}px`
                bubble.style.visibility = middlewareData.hide?.referenceHidden ? 'hidden' : ''
            })
        }
        const stop = autoUpdate(el, bubble, update)
        return () => {
            stop()
            bubble.remove()
        }
    }

    // -----------------------------------------------------------------------
    // Hover bubbles use delegation, so they keep working when a script re-renders its
    // elements between two refreshes.

    private bindHover(root: HTMLElement) {
        if (this.listeningOn === root) {
            return
        }
        this.unbindHover()
        root.addEventListener('pointerover', this.onPointerOver)
        root.addEventListener('pointerout', this.onPointerOut)
        this.listeningOn = root
    }

    private unbindHover() {
        this.listeningOn?.removeEventListener('pointerover', this.onPointerOver)
        this.listeningOn?.removeEventListener('pointerout', this.onPointerOut)
        this.listeningOn = null
    }

    /** innermost element with hover overlays that contains the event target */
    private hoverElementFor(target: EventTarget | null): HTMLElement | null {
        const root = this.listeningOn
        if (!root || !(target instanceof Element) || !root.contains(target)) {
            return null
        }
        const hover = this.overlays.filter((o) => o.display === 'hover' && toEntry(o))
        for (let el: Element | null = target; el && el !== root; el = el.parentElement) {
            if (hover.some((o) => this.matches(el!, o.selector))) {
                return el as HTMLElement
            }
        }
        return null
    }

    private onPointerOver = (ev: PointerEvent) => {
        const el = this.hoverElementFor(ev.target)
        if (!el) {
            return
        }
        this.cancelHide()
        if (el === this.hoverTarget) {
            return
        }
        this.hideHover(true)
        const entries = this.overlays
            .filter((o) => o.display === 'hover' && this.matches(el, o.selector))
            .map(toEntry)
            .filter((e): e is OverlayEntry => e !== undefined)
        if (entries.length === 0) {
            return
        }
        const placement = this.overlays.find(
            (o) => o.display === 'hover' && this.matches(el, o.selector)
        )!.placement
        this.hoverTarget = el
        this.hoverBubble = createBubble(entries, this.getTheme())
        this.hoverBubble.classList.add('cb-ov-bubble--hover')
        this.hoverCleanup = this.float(el, this.hoverBubble, placement)
    }

    private onPointerOut = (ev: PointerEvent) => {
        if (!this.hoverTarget) {
            return
        }
        const to = ev.relatedTarget as Node | null
        if (to && this.hoverTarget.contains(to)) {
            return
        }
        this.cancelHide()
        this.hideTimer = setTimeout(() => this.hideHover(true), HOVER_HIDE_DELAY)
    }

    private cancelHide() {
        if (this.hideTimer) {
            clearTimeout(this.hideTimer)
            this.hideTimer = null
        }
    }

    private hideHover(now: boolean) {
        if (now) {
            this.cancelHide()
        }
        this.hoverCleanup?.()
        this.hoverCleanup = null
        this.hoverBubble = null
        this.hoverTarget = null
    }
}
