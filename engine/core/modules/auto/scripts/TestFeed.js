const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

class TestFeed {
    constructor(element) {
        this.componentElement = typeof element === 'string'
            ? (document.getElementById(element) || document.querySelector(element))
            : element;
        this.singlePath = this.componentElement?.getAttribute?.('template') || '';
    }
}

export { TestFeed };
export default TestFeed;

export function attachToWindow(target = globalScope) {
    if (!target) {
        return TestFeed;
    }

    target.TestFeed = TestFeed;
    return TestFeed;
}

attachToWindow();