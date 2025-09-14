ScriptLoader.load('Validator');

/**
 * ValidForm (ES6 version)
 */
class ValidForm {
    /**
     * @param {HTMLElement|string} element
     */
    constructor(element) {
        // Основной элемент (по селектору или ссылке)
        this.componentElement = (typeof element === 'string')
            ? document.querySelector(element)
            : element;

        if (this.componentElement) {
            // Находим родительскую форму
            this.form = this.componentElement.closest('form');
            if (this.form) {
                // Сохраняем путь (если есть)
                this.singlePath = this.componentElement.getAttribute('single_template');
                this.form.classList.add('form');
                // Навешиваем валидацию на submit
                this.form.addEventListener('submit', this.validateForm.bind(this));
                // Инициализируем валидатор (должен быть определён отдельно)
                this.validator = new Validator(this.form);
            }
        }
    }

    /**
     * Проверка формы на валидность
     * @param {Event} event
     * @returns {boolean}
     */
    validateForm(event) {
        if (!this.validator.validate()) {
            event.preventDefault();
            return false;
        } else {
            return true;
        }
    }
}

// Глобальная привязка (если требуется)
window.ValidForm = ValidForm;
