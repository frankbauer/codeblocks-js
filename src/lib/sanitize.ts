import DOMPurify from 'dompurify'

// Three trust levels:
//  - TEXT blocks (teacher markup, non-strict): any HTML/CSS/SVG/MathML including form
//    controls for interactive UIs, but nothing that executes code or submits/navigates.
//  - Generated markup that may contain student data (test protocols, badges; strict,
//    the default): formatting only, no form controls, global styles or ids.
//  - Student output: never HTML. It is escaped to plain text and our own styling
//    markup (see formatOutput / format_info / format_error) is applied afterwards.

// dedicated instances, so the hooks below do not leak into other DOMPurify users
const textPurifier = DOMPurify(window)
const strictPurifier = DOMPurify(window)

for (const purifier of [textPurifier, strictPurifier]) {
    purifier.addHook('afterSanitizeAttributes', (node) => {
        // links opening a new window must not get a handle on the ILIAS page
        if (node.hasAttribute('target') && node.getAttribute('target') !== '_self') {
            node.setAttribute('rel', 'noopener noreferrer')
        }
    })
}

// form controls removed in strict mode go with their content (option labels,
// textarea values, ...), otherwise it would be left behind as stray text
const STRICT_DROP_WITH_CONTENT = new Set([
    'input',
    'textarea',
    'select',
    'datalist',
    'button',
    'output',
    'dialog',
])
strictPurifier.addHook('uponSanitizeElement', (node, data) => {
    if (STRICT_DROP_WITH_CONTENT.has(data.tagName)) {
        node.textContent = ''
    }
})

const EXECUTABLE_TAGS = [
    'script',
    'noscript',
    'iframe',
    'frame',
    'frameset',
    'object',
    'embed',
    'portal',
    'base',
    'meta',
    'link',
    'form',
]

const EXECUTABLE_ATTRS = [
    'srcdoc',
    'action',
    'form',
    'formaction',
    'formmethod',
    'formtarget',
    'formenctype',
    'formnovalidate',
    'attributename',
]

const CUSTOM_ELEMENT_TAGS = /^[a-z][a-z0-9]*-[a-z0-9-]*$/

const TEXT_BLOCK_CONFIG = {
    // leading <style> elements would otherwise be hoisted out and dropped
    FORCE_BODY: true,
    FORBID_TAGS: EXECUTABLE_TAGS,
    FORBID_ATTR: EXECUTABLE_ATTRS,
    // keep custom attributes (e.g. `highlight`, `tagged`, `target`) authors rely on.
    // Values still pass DOMPurify's URI checks; event handlers are never allowed.
    ADD_ATTR: (attributeName: string) => !attributeName.startsWith('on'),
    CUSTOM_ELEMENT_HANDLING: {
        tagNameCheck: CUSTOM_ELEMENT_TAGS,
        attributeNameCheck: (attributeName: string) => !attributeName.startsWith('on'),
        allowCustomizedBuiltInElements: false,
    },
}

const STRICT_CONFIG = {
    FORBID_TAGS: [
        ...EXECUTABLE_TAGS,
        // interactive elements: they would end up inside the ILIAS form
        'input',
        'textarea',
        'select',
        'option',
        'optgroup',
        'datalist',
        'button',
        'output',
        'label',
        'fieldset',
        'legend',
        'dialog',
        // global styles leak out of the element into the whole page
        'style',
    ],
    FORBID_ATTR: [
        ...EXECUTABLE_ATTRS,
        // ids and names could collide with (or be looked up as) elements of the page
        'id',
        'name',
        'tabindex',
        'autofocus',
        'contenteditable',
        'popover',
        'popovertarget',
        'popovertargetaction',
    ],
    ADD_ATTR: ['target'],
    // custom elements like <cb-icon> are fine, but only with standard attributes
    CUSTOM_ELEMENT_HANDLING: {
        tagNameCheck: CUSTOM_ELEMENT_TAGS,
        attributeNameCheck: () => false,
        allowCustomizedBuiltInElements: false,
    },
}

export interface ISanitizeOptions {
    /**
     * `true` (default): formatting markup only (text styles, lists, tables, links,
     * images, SVG, MathML). Form controls, `<style>`, ids and names are removed.
     * `false`: also keeps form controls, `<style>`, ids and custom attributes, for
     * teacher authored UIs like TEXT blocks.
     * Anything that can execute code is removed in both modes.
     */
    strict?: boolean
}

/**
 * Sanitizes markup before it is inserted into the page. Removes everything that
 * can execute code; in strict mode (default) also everything interactive.
 */
export function sanitizeMarkup(
    html: string | undefined | null,
    { strict = true }: ISanitizeOptions = {}
): string {
    if (!html) {
        return ''
    }
    return strict
        ? (strictPurifier.sanitize(html, STRICT_CONFIG) as string)
        : (textPurifier.sanitize(html, TEXT_BLOCK_CONFIG) as string)
}

/**
 * Escapes untrusted text (student output, compiler messages) so it is rendered
 * verbatim and never interpreted as markup.
 */
export function escapeText(text: string | undefined | null): string {
    if (text === undefined || text === null) {
        return ''
    }
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}
