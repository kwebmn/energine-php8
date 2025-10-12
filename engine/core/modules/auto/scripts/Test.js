import { globalScope, attachToWindow as registerGlobal } from '../../share/scripts/exportToWindow.js';
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
    return registerGlobal('Test', Test, target);
}

attachToWindow();