import { globalScope, attachToWindow as registerGlobal } from '../../share/scripts/exportToWindow.js';
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
    return registerGlobal('TestFeed', TestFeed, target);
}

attachToWindow();