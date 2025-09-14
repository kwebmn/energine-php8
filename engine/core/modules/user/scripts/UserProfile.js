/**
 * UserProfile (ES6 version)
 * @extends ValidForm
 */
class UserProfile  {
    /**
     * @param {HTMLElement|string} element
     */
    constructor(element) {
        // singlePath
        this.componentElement = (typeof element === 'string')
            ? document.querySelector(element)
            : element;
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

// Глобальная привязка, если нужно
window.UserProfile = UserProfile;