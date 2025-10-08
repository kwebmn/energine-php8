const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

class DefaultTemplateJs {
    constructor(element) {
        this.componentElement = typeof element === 'string'
            ? (document.querySelector(element) || document.getElementById(element))
            : element;
        this.singlePath = this.componentElement?.getAttribute?.('template') || '';
    }
}

export { DefaultTemplateJs };
export default DefaultTemplateJs;

export function attachToWindow(target = globalScope) {
    if (!target) {
        return DefaultTemplateJs;
    }

    target.DefaultTemplateJs = DefaultTemplateJs;
    return DefaultTemplateJs;
}

attachToWindow();