import { registerBehavior as registerEnergineBehavior } from '../../share/scripts/Energine.js';

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
if (typeof registerEnergineBehavior === 'function') {
    registerEnergineBehavior('Testfeed', Testfeed);
}
