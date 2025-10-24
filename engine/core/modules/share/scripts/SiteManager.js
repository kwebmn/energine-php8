import Energine from './Energine.js';
import GridManager from './GridManager.js';
import ModalBox from './ModalBox.js';
import { request } from './energine-network.js';

const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

/**
 * Site manager.
 * @extends GridManager
 */
class SiteManager extends GridManager {
    /**
     * @param {HTMLElement|string} element Main holder element for the SiteManager
     */
    constructor(element) {
        super(element);
    }

    /**
     * Reset action.
     * @public
     */
    reset() {
        if (Energine.translations && confirm(Energine.translations.get('MSG_CONFIRM_TEMPLATES_RESET'))) {
            request(
                `${this.singlePath}reset/${this.grid.getSelectedRecordKey()}/reset-templates/`,
                null,
                (response) => {
                    if (response.result) {
                        alert(Energine.translations.get('MSG_TEMPLATES_RESET'));
                    }
                }
            );
        }
    }

    /**
     * Open site properties.
     * @public
     */
    siteProps() {
        ModalBox.open({
            url: `${this.singlePath}${this.grid.getSelectedRecordKey()}/properties/`
        });
    }

    /**
     * Go action.
     * @public
     */
    go() {
        const targetWindow = globalScope?.top || globalScope;
        if (targetWindow?.location) {
            targetWindow.location.href = `${this.singlePath}goto/${this.grid.getSelectedRecordKey()}/`;
        }
    }
}

export { SiteManager };
export default SiteManager;

export function attachToWindow(target = globalScope) {
    if (!target) {
        return SiteManager;
    }

    target.SiteManager = SiteManager;
    return SiteManager;
}

attachToWindow();