import Energine, { registerBehavior as registerEnergineBehavior } from '../../share/scripts/Energine.js';
import ValidForm from '../../share/scripts/ValidForm.js';

const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

const $ = globalScope?.jQuery || globalScope?.$;

/**
 * UserProfile (ES6 version)
 * @extends ValidForm
 */
class UserProfile extends ValidForm {
    /**
     * @param {HTMLElement|string} element
     */
    constructor(element) {
        if (!$) {
            throw new Error('UserProfile requires jQuery to be available globally.');
        }

        const elementRef = (typeof element === 'string')
            ? document.querySelector(element)
            : element;
        super(elementRef);
        this.componentElement = elementRef;
        const dataset = this.componentElement?.dataset || {};
        // Получаем путь для сохранения
        this.singleTemplatePath = dataset.eSingleTemplate
            || this.componentElement?.getAttribute('data-e-single-template')
            || this.componentElement?.getAttribute('single_template')
            || '';

        // Привязываем обработчик отправки формы через jQuery
        $(this.componentElement).on('submit', (event) => {
            event.preventDefault();
            const data = $(this.componentElement).serialize();
            const saveUrl = `${Energine.base}${Energine.lang}/${this.singleTemplatePath}save`;

            $.post(saveUrl, data, (result) => {
                if (result.result) {
                    Energine.noticeBox(result.message, 'success');
                } else {
                    Energine.noticeBox(result.message, 'error');
                }
            }, 'json');

            return false;
        });
    }

}

class UserProfileTabs {
    /**
     * @param {HTMLElement|string} element
     */
    constructor(element) {
        this.root = typeof element === 'string'
            ? globalScope?.document?.querySelector(element)
            : element;

        if (!this.root) {
            return;
        }

        this.mdb = globalScope?.mdb;
        if (!this.mdb || typeof this.mdb.Tab?.getOrCreateInstance !== 'function') {
            return;
        }

        this._initTabs();
    }

    _initTabs() {
        const triggers = this.root.querySelectorAll('[data-mdb-tab-init], [data-mdb-toggle="tab"]');
        this.instances = Array.from(triggers, (trigger) => this.mdb.Tab.getOrCreateInstance(trigger));
    }
}

export { UserProfile, UserProfileTabs };
export default UserProfile;
if (typeof registerEnergineBehavior === 'function') {
    registerEnergineBehavior('UserProfile', UserProfile);
    registerEnergineBehavior('UserProfileTabs', UserProfileTabs);
}
