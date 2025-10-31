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
        const td = radio.closest('td');
        const tbody = td?.closest('tbody');

        if (!td || !tbody) {
            return;
        }

        const columnId = radio.dataset.column || td.dataset.column;
        const rows = Array.from(tbody.querySelectorAll('tr'));
        let handled = false;

        if (columnId) {
            rows.forEach(row => {
                row.querySelectorAll(`td[data-column="${columnId}"] input[type="radio"]`).forEach(r => {
                    handled = this._checkRadio(r) || handled;
                });
            });
        } else {
            const cells = Array.from(td.parentElement?.children || []);
            const columnIndex = cells.indexOf(td);

            if (columnIndex === -1) {
                return;
            }

            rows.forEach(row => {
                const cell = row.children[columnIndex];
                if (!cell) {
                    return;
                }

                const targetRadio = cell.querySelector('input[type="radio"]');
                if (targetRadio) {
                    handled = this._checkRadio(targetRadio) || handled;
                }
            });
        }

        // Верхняя радиокнопка служит только триггером группового выбора,
        // поэтому возвращаем её в невыбранное состояние, даже если в столбце
        // ничего не изменилось.
        radio.checked = false;
    }

    _checkRadio(radio) {
        if (!radio || radio.disabled) {
            return false;
        }

        if (!radio.checked) {
            radio.checked = true;
            radio.dispatchEvent(new Event('change', { bubbles: true }));
        }

        return true;
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
