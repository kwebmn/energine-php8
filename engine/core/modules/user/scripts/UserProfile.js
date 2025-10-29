import Energine, { registerBehavior as registerEnergineBehavior } from '../../share/scripts/Energine.js';
import ValidForm from '../../share/scripts/ValidForm.js';
import TabPane from '../../share/scripts/TabPane.js';

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
        // Получаем путь для сохранения
        this.url = this.componentElement.getAttribute('single_template');

        // Привязываем обработчик отправки формы через jQuery
        $(this.componentElement).on('submit', (event) => {
            event.preventDefault();
            const data = $(this.componentElement).serialize();
            const saveUrl = `${Energine.base}${Energine.lang}/${this.url}save`;

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

class UserProfileTabs extends TabPane {
    /**
     * @param {HTMLElement|string} element
     */
    constructor(element) {
        super(element);
    }
}

export { UserProfile, UserProfileTabs };
export default UserProfile;
if (typeof registerEnergineBehavior === 'function') {
    registerEnergineBehavior('UserProfile', UserProfile);
    registerEnergineBehavior('UserProfileTabs', UserProfileTabs);
}
