// Registers <cb-icon> globally so any HTML authored for this plugin — a TEXT
// block, a LIBRARY's rendered UI, playground output — can show an icon just by
// writing e.g. <cb-icon>circle-check</cb-icon>, with normal `style`/`class`
// attributes on the tag itself for coloring/sizing (color via currentColor,
// size via font-size, exactly like the old <i class="material-icons"> markup).
//
// Unlike a one-time HTML render pass, a Custom Element upgrades automatically
// the instant it's parsed into any document — whether that's the initial page
// render, jQuery's .html()/.append(), a raw .innerHTML assignment, or Vue's
// v-html — because all of those go through the browser's HTML parser, which is
// what triggers the upgrade. It also upgrades inside a Shadow DOM (which this
// app sometimes mounts into) with no extra wiring. So there's nothing else to
// hook up anywhere else in the codebase.
//
// Icons come straight from lucide-vue-next (already a dependency of this
// project, used throughout its own UI chrome) — used exactly the way it's
// meant to be used, as real Vue components, not copied out of it. Vue's
// low-level render() can mount any component into a detached, off-document
// element synchronously; we do that once per icon name and cache the
// resulting markup, so there's no build step and no vendored icon data
// anywhere in this repo. Browse available names at https://lucide.dev/icons —
// the kebab-case name shown there (e.g. "circle-check") maps to lucide-vue-next's
// PascalCase export of the same icon (e.g. `CircleCheck`).
import { h, render } from 'vue'
import * as LucideIcons from 'lucide-vue-next'

const markupCache = new Map<string, string | null>()
let scratch: HTMLDivElement | undefined

function toPascalCase(name: string): string {
    return name
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('')
}

function resolveIconMarkup(name: string): string | null {
    const cached = markupCache.get(name)
    if (cached !== undefined) {
        return cached
    }

    const component = (LucideIcons as Record<string, any>)[toPascalCase(name)]
    if (!component) {
        markupCache.set(name, null)
        return null
    }

    if (!scratch) {
        scratch = document.createElement('div')
    }
    // `size` controls both width/height on lucide-vue-next's icons; stroke
    // color already defaults to currentColor. Rendered off-document, so this
    // never actually paints anywhere.
    render(
        h(component, { size: '1em', style: 'display:inline-block;vertical-align:-0.125em' }),
        scratch
    )
    const markup = scratch.innerHTML
    render(null, scratch) // unmount — leaves the scratch div empty and reusable

    markupCache.set(name, markup)
    return markup
}

class CbIconElement extends HTMLElement {
    connectedCallback(): void {
        this.render()
    }

    private render(): void {
        const name = this.textContent?.trim().toLowerCase()
        if (!name) {
            return
        }
        const markup = resolveIconMarkup(name)
        if (markup === null) {
            console.warn(
                `<cb-icon>: unknown icon "${name}". Browse available names at https://lucide.dev/icons`
            )
            return
        }
        // Host pages commonly reset `svg { display: block }` (e.g. Tailwind's
        // Preflight), which would otherwise break this out of the surrounding
        // text as its own line. An inline style wins over any such stylesheet
        // rule regardless of what the page around it does.
        this.style.display = 'inline-block'
        this.innerHTML = markup
    }
}

if (!customElements.get('cb-icon')) {
    customElements.define('cb-icon', CbIconElement)
}
