const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

class Test {
    constructor(element) {
        this.componentElement = typeof element === 'string'
            ? (document.getElementById(element) || document.querySelector(element))
            : element;
        this.singlePath = this.componentElement?.getAttribute?.('template') || '';
    }
}

export { Test };
export default Test;

export function attachToWindow(target = globalScope) {
    if (!target) {
        return Test;
    }

    target.Test = Test;
    return Test;
}

attachToWindow();