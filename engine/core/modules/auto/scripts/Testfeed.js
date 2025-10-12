import { globalScope, attachToWindow as registerGlobal } from '../../share/scripts/exportToWindow.js';
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
    return registerGlobal('Testfeed', Testfeed, target);
}

attachToWindow();