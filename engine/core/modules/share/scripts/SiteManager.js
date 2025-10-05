import GridManager from './GridManager.js';
import ModalBox from './ModalBox.js';

/**
 * Site manager.
 * @extends GridManager
 */
export default class SiteManager extends GridManager {
    /**
     * @param {HTMLElement|string} element Main holder element for the SiteManager
     */
    constructor(element, options = {}) {
        super(element, options);
    }

    /**
     * Reset action.
     * @public
     */
    reset() {
        if (Energine.translations && confirm(Energine.translations.get('MSG_CONFIRM_TEMPLATES_RESET'))) {
            Energine.request(
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
        window.top.location.href = `${this.singlePath}goto/${this.grid.getSelectedRecordKey()}/`;
    }
}

if (typeof window !== 'undefined') {
    window.SiteManager = SiteManager;
}