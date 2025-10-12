import { globalScope, attachToWindow as registerGlobal } from '../../share/scripts/exportToWindow.js';
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
    return registerGlobal('DefaultTemplateJs', DefaultTemplateJs, target);
}

attachToWindow();