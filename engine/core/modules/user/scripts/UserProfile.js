import ValidForm from '../../share/scripts/ValidForm.js';

/**
 * UserProfile (ES6 version)
 * @extends ValidForm
 */
class UserProfile extends ValidForm {
    /**
     * @param {HTMLElement|string} element
     * @param {Object} [options]
     */
    constructor(element, options = {}) {
        super(element, options);
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

if (typeof window !== 'undefined') {
    window.UserProfile = UserProfile;
}

export default UserProfile;
