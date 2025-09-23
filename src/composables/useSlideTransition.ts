
export function useSlideTransition() {
    const onBeforeEnter = (el: Element) => {
        const element = el as HTMLElement
        element.style.height = '0'
        element.style.opacity = '0'
    }

    const onEnter = (el: Element, done: () => void) => {
        const element = el as HTMLElement
        element.style.display = ''
        element.style.overflow = 'hidden'
        const height = element.scrollHeight
        element.style.transition =
            'height 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.3s cubic-bezier(0.4,0,0.2,1)'
        requestAnimationFrame(() => {
            element.style.height = height + 'px'
            element.style.opacity = '1'
        })
        setTimeout(() => {
            element.style.height = ''
            element.style.overflow = ''
            done()
        }, 300)
    }

    const onAfterEnter = (el: Element) => {
        const element = el as HTMLElement
        element.style.height = ''
        element.style.opacity = ''
        element.style.overflow = ''
    }

    const onBeforeLeave = (el: Element) => {
        const element = el as HTMLElement
        element.style.height = element.scrollHeight + 'px'
        element.style.opacity = '1'
        element.style.overflow = 'hidden'
    }

    const onLeave = (el: Element, done: () => void) => {
        const element = el as HTMLElement
        element.style.transition =
            'height 0.2s cubic-bezier(0.4,0,0.2,1), opacity 0.2s cubic-bezier(0.4,0,0.2,1)'
        requestAnimationFrame(() => {
            element.style.height = '0'
            element.style.opacity = '0'
        })
        setTimeout(() => {
            done()
        }, 200)
    }

    const onAfterLeave = (el: Element) => {
        const element = el as HTMLElement
        element.style.height = ''
        element.style.opacity = ''
        element.style.overflow = ''
    }

    return {
        onBeforeEnter,
        onEnter,
        onAfterEnter,
        onBeforeLeave,
        onLeave,
        onAfterLeave,
    }
}