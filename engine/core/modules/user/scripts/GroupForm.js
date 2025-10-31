import Form from '../../share/scripts/Form.js';
import { registerBehavior as registerEnergineBehavior } from '../../share/scripts/Energine.js';

const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

/**
 * GroupForm (ES6 version)
 * @extends Form
 */
class GroupForm extends Form {
    /**
     * @param {HTMLElement|string} element The form element.
     */
    constructor(element) {
        super(element);

        // Найти все .groupRadio и навесить обработчик
        this.componentElement
            .querySelectorAll('.groupRadio')
            .forEach(radio => {
                radio.addEventListener('click', this.checkAllRadioInColumn.bind(this));
            });

        // Если нужно — разблокируй и реализуй второй обработчик ниже (см. комментарий)
        /*
        this.componentElement
            .querySelectorAll('input[type=radio]')
            .forEach(radio => {
                radio.addEventListener('change', this.uncheckGroupRadio.bind(this));
            });
        */
    }

    /**
     * Проверить все радиокнопки в столбце
     * @param {Event} event
     */
    checkAllRadioInColumn(event) {
        const radio = event.target;
        const tbody = radio.closest('tbody');
        if (!tbody) {
            return;
        }

        const columnId = radio.dataset.column || radio.closest('td')?.dataset.column;
        if (!columnId) {
            return;
        }

        // Получаем все radio в этом столбце
        tbody.querySelectorAll(`td[data-column="${columnId}"] input[type="radio"]`).forEach(r => {
            if (r.disabled) {
                return;
            }

            r.checked = true;

            // Сообщить другим обработчикам об изменении значения
            r.dispatchEvent(new Event('change', { bubbles: true }));
        });
    }

    /**
     * Снять выделение с групповой радиокнопки (по необходимости)
     * @param {Event} event
     */
    uncheckGroupRadio(event) {
        const radio = event.target;
        if (!radio.classList.contains('groupRadio')) {
            const td = radio.closest('td');
            const columnClass = td.className;
            const tbody = td.closest('tbody');
            if (!tbody || !columnClass) return;

            // Найти radio в .section_name, снять checked
            const tr = tbody.querySelector('tr.section_name');
            if (tr) {
                const groupTd = tr.querySelector(`td.${columnClass} input[type="radio"]`);
                if (groupTd) {
                    groupTd.checked = false;
                }
            }
        }
    }
}

export { GroupForm };
export default GroupForm;
if (typeof registerEnergineBehavior === 'function') {
    registerEnergineBehavior('GroupForm', GroupForm);
}
