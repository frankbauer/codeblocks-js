export type Updater<T> = T | ((old: T) => T)
import type { ClassValue } from 'clsx'
import type { Ref } from 'vue'
import { clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Tailwind is configured with the legacy (v3-style) "tw-" string prefix (see
// tailwind.config.*). tailwind-merge's built-in `prefix` option only understands
// Tailwind v4's colon-based prefix (e.g. "tw:flex"), so it can't be used here -
// with it configured, prefixed utilities like "tw-h-9" are treated as unknown and
// never deduped against conflicting ones like "tw-h-6". Strip the "tw-" prefix
// from the base class name ourselves before handing it to the default parser.
const twMerge = extendTailwindMerge({
    experimentalParseClassName: ({ className, parseClassName }) => {
        const result = parseClassName(className)
        return result.baseClassName.startsWith('tw-')
            ? { ...result, baseClassName: result.baseClassName.slice(3) }
            : result
    },
})

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function valueUpdater<T extends Updater<any>>(updaterOrValue: T, ref: Ref) {
    ref.value = typeof updaterOrValue === 'function' ? updaterOrValue(ref.value) : updaterOrValue
}
