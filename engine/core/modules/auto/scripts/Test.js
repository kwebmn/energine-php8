import { registerBehavior as registerEnergineBehavior } from '../../share/scripts/Energine.js';

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
if (typeof registerEnergineBehavior === 'function') {
    registerEnergineBehavior('Test', Test);
}
