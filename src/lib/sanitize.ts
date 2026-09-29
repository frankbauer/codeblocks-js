import DOMPurify from 'dompurify'

// Two separate trust levels:
//  - TEXT blocks (teacher markup): any HTML/CSS/SVG/MathML including form controls
//    for interactive UIs, but nothing that executes code or submits/navigates.
//  - Student output: never HTML. It is escaped to plain text and our own styling
//    markup (see formatOutput / format_info / format_error) is applied afterwards.

// dedicated instance, so the hook below does not leak into other DOMPurify users
const textPurifier = DOMPurify(window)

textPurifier.addHook('afterSanitizeAttributes', (node) => {
    // links opening a new window must not get a handle on the ILIAS page
    if (node.hasAttribute('target') && node.getAttribute('target') !== '_self') {
        node.setAttribute('rel', 'noopener noreferrer')
    }
})

const TEXT_BLOCK_CONFIG = {
    // leading <style> elements would otherwise be hoisted out and dropped
    FORCE_BODY: true,
    FORBID_TAGS: [
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
    ],
    FORBID_ATTR: [
        'srcdoc',
        'action',
        'form',
        'formaction',
        'formmethod',
        'formtarget',
        'formenctype',
        'formnovalidate',
        'attributename',
    ],
    // keep custom attributes (e.g. `highlight`, `tagged`, `target`) authors rely on.
    // Values still pass DOMPurify's URI checks; event handlers are never allowed.
    ADD_ATTR: (attributeName: string) => !attributeName.startsWith('on'),
    CUSTOM_ELEMENT_HANDLING: {
        tagNameCheck: /^[a-z][a-z0-9]*-[a-z0-9-]*$/,
        attributeNameCheck: (attributeName: string) => !attributeName.startsWith('on'),
        allowCustomizedBuiltInElements: false,
    },
}

/**
 * Sanitizes teacher authored markup (TEXT blocks). Keeps layout, styling and
 * form controls, removes everything that can execute code.
 */
export function sanitizeMarkup(html: string | undefined | null): string {
    if (!html) {
        return ''
    }
    return textPurifier.sanitize(html, TEXT_BLOCK_CONFIG) as string
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
