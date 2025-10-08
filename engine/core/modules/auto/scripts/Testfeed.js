const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

class Testfeed {
    constructor(element) {
        this.componentElement = typeof element === 'string'
            ? (document.querySelector(element) || document.getElementById(element))
            : element;
        this.singlePath = this.componentElement?.getAttribute?.('template') || '';
    }
}

export { Testfeed };
export default Testfeed;

export function attachToWindow(target = globalScope) {
    if (!target) {
        return Testfeed;
    }

    target.Testfeed = Testfeed;
    return Testfeed;
}

attachToWindow();