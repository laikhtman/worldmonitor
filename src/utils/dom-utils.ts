/**
 * PERF-010: DOM update utilities — efficient DOM manipulation patterns
 * to avoid layout thrashing and minimize reflows.
 *
 * PERF-011: DocumentFragment batch rendering.
 * PERF-012: Avoid forced layout reads (getBoundingClientRect, offsetHeight, etc.)
 */

/**
 * PERF-011: Batch multiple DOM elements into a DocumentFragment,
 * then append once to minimize reflows.
 */
export function batchAppend(
    parent: HTMLElement,
    children: HTMLElement[],
): void {
    const fragment = document.createDocumentFragment();
    for (const child of children) {
        fragment.appendChild(child);
    }
    parent.appendChild(fragment);
}

/**
 * PERF-011: Batch replace children — clears parent and appends new children
 * in a single operation using DocumentFragment.
 */
export function batchReplaceChildren(
    parent: HTMLElement,
    children: HTMLElement[],
): void {
    const fragment = document.createDocumentFragment();
    for (const child of children) {
        fragment.appendChild(child);
    }
    parent.textContent = ''; // Fast clear
    parent.appendChild(fragment);
}

/**
 * PERF-012: Schedule a layout read to happen after all current writes.
 * Prevents the read-write-read-write pattern that causes forced synchronous layouts.
 */
export function scheduleRead(fn: () => void): void {
    requestAnimationFrame(() => {
        // The RAF callback fires just before the browser's layout/paint,
        // so reads here won't force additional layouts.
        fn();
    });
}

/**
 * PERF-012: Schedule a DOM write to happen in the next animation frame.
 */
export function scheduleWrite(fn: () => void): void {
    requestAnimationFrame(fn);
}

/**
 * PERF-010: Diff and update text content only if it changed.
 * Avoids unnecessary DOM mutations and associated style recalculations.
 */
export function updateTextContent(element: HTMLElement | null, text: string): boolean {
    if (!element) return false;
    if (element.textContent !== text) {
        element.textContent = text;
        return true;
    }
    return false;
}

/**
 * PERF-010: Diff and update innerHTML only if it changed.
 */
export function updateInnerHTML(element: HTMLElement | null, html: string): boolean {
    if (!element) return false;
    if (element.innerHTML !== html) {
        element.innerHTML = html;
        return true;
    }
    return false;
}

/**
 * PERF-010: Toggle a class only if the state actually changed.
 * Returns true if the class was toggled.
 */
export function toggleClass(element: HTMLElement | null, className: string, force: boolean): boolean {
    if (!element) return false;
    const has = element.classList.contains(className);
    if (has === force) return false;
    element.classList.toggle(className, force);
    return true;
}

/**
 * PERF-010: Create an element with attributes in one call
 * to avoid multiple setAttribute calls.
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    attrs?: Record<string, string>,
    textContent?: string,
): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag);
    if (attrs) {
        for (const [key, value] of Object.entries(attrs)) {
            if (key === 'className') {
                el.className = value;
            } else {
                el.setAttribute(key, value);
            }
        }
    }
    if (textContent) {
        el.textContent = textContent;
    }
    return el;
}

/**
 * PERF-016: Minimal hyperscript-like element builder.
 * Creates DOM elements programmatically instead of parsing HTML strings.
 *
 * @example
 * h('div', { className: 'panel-row' },
 *   h('span', { className: 'label' }, 'Score:'),
 *   h('span', { className: 'value' }, '42'),
 * )
 */
export function h(
    tag: string,
    attrs?: Record<string, string | boolean | EventListener | undefined> | null,
    ...children: (Node | string | null | undefined | false)[]
): HTMLElement {
    const el = document.createElement(tag);
    if (attrs) {
        for (const [key, value] of Object.entries(attrs)) {
            if (value === undefined || value === false) continue;
            if (key === 'className') {
                el.className = value as string;
            } else if (key.startsWith('on') && typeof value === 'function') {
                el.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
            } else if (value === true) {
                el.setAttribute(key, '');
            } else {
                el.setAttribute(key, value as string);
            }
        }
    }
    for (const child of children) {
        if (child === null || child === undefined || child === false) continue;
        el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    }
    return el;
}

/**
 * PERF-016: Create a text node. Useful as child in h() calls.
 */
export function text(content: string): Text {
    return document.createTextNode(content);
}

/**
 * PERF-033: WeakRef-based DOM element cache.
 * Holds references to DOM elements that may be removed from the page.
 * Allows GC to collect elements that are no longer in the DOM.
 */
export class WeakDOMCache<K extends string | number = string> {
    private cache = new Map<K, WeakRef<HTMLElement>>();
    private registry: FinalizationRegistry<K>;

    constructor() {
        this.registry = new FinalizationRegistry((key: K) => {
            this.cache.delete(key);
        });
    }

    set(key: K, element: HTMLElement): void {
        const existing = this.cache.get(key);
        if (existing?.deref() === element) return;
        this.cache.set(key, new WeakRef(element));
        this.registry.register(element, key);
    }

    get(key: K): HTMLElement | undefined {
        const ref = this.cache.get(key);
        if (!ref) return undefined;
        const el = ref.deref();
        if (!el) {
            this.cache.delete(key);
            return undefined;
        }
        return el;
    }

    has(key: K): boolean {
        return this.get(key) !== undefined;
    }

    delete(key: K): void {
        this.cache.delete(key);
    }

    get size(): number {
        // Clean up dead refs first
        for (const [key, ref] of this.cache) {
            if (!ref.deref()) this.cache.delete(key);
        }
        return this.cache.size;
    }
}
