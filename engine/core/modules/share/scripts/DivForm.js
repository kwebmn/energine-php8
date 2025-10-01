ScriptLoader.load('Form', 'ModalBox');

// Подключения: Form и ModalBox должны быть подключены как ES6-модули

class DivForm extends Form {
    constructor(element) {
        super(element);

        // --------- prepareLabel ---------
        // Предполагаем, что 'site_id' — id поля, в нем value — строка с id, а далее '/list/' как в оригинале
        let siteIdInput = document.getElementById('site_id');
        let labelUrl = siteIdInput ? siteIdInput.value + '/list/' : '/list/';
        this.prepareLabel(labelUrl);

        // --------- selectors ---------
        let contentSelector = this.componentElement.querySelector('#smap_content');
        let layoutSelector = this.componentElement.querySelector('#smap_layout');
        let segmentInput   = this.componentElement.querySelector('#smap_segment');
        let t = this; // для contentFunc

        // --------- contentFunc ---------
        function contentFunc() {
            if (!contentSelector) return;

            // Получить выбранный option
            let selectedOption = contentSelector.options[contentSelector.selectedIndex];
            if (segmentInput) {
                let segment = selectedOption.getAttribute('data-segment');
                if (segment) {
                    segmentInput.readOnly = true;
                    segmentInput.value = segment;
                } else {
                    segmentInput.readOnly = false;
                }
            }
            let layout = selectedOption.getAttribute('data-layout');
            if (layout && layout !== '*') {
                layoutSelector.value = layout;
            }
            t.clearContentXML();
        }

        // --------- URI Text Field ---------
        // Поддержка поля uriTextField (например, smap_name_3 или первый подходящий)
        let uriTextField = document.getElementById('smap_name_3');
        if (!uriTextField) {
            // Найти первый элемент с id smap_name_{число}
            const allElements = document.querySelectorAll('*');
            const regex = /^smap_name_\d+$/;
            for (let el of allElements) {
                if (regex.test(el.id)) {
                    uriTextField = el;
                    break;
                }
            }
        }

        // --------- segmentUriFunc ---------
        function segmentUriFunc() {
            // Транслитерация
            function transliterate(text) {
                const translitMap = {
                    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh', 'з': 'z',
                    'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r',
                    'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
                    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
                };

                let urlFriendlyText = '';
                for (let ch of text.toLowerCase()) {
                    if (translitMap.hasOwnProperty(ch)) {
                        urlFriendlyText += translitMap[ch];
                    } else if (/[a-z0-9]/.test(ch)) {
                        urlFriendlyText += ch;
                    } else {
                        urlFriendlyText += '-';
                    }
                }
                return urlFriendlyText.replace(/-+/g, '-').replace(/^-|-$/g, '');
            }

            let url_text = this.value;
            url_text = transliterate(url_text);

            let smapSegmentField = document.getElementById('smap_segment');
            if (smapSegmentField && smapSegmentField.value.length === 0) {
                smapSegmentField.value = url_text;
            }
        }

        // --------- События ---------
        if (contentSelector) contentSelector.addEventListener('change', contentFunc);
        if (uriTextField) uriTextField.addEventListener('change', segmentUriFunc);

        // --- Привязка 'this' в segmentUriFunc ---
        if (uriTextField) {
            uriTextField.addEventListener('change', segmentUriFunc);
        }
    }

    /**
     * Reset the page content template.
     */
    resetPageContentTemplate() {
        let smapIdInput = this.componentElement.querySelector('#smap_id');
        let smapId = smapIdInput ? smapIdInput.value : '';
        this.request(
            `${this.singlePath}reset-templates/${smapId}/`,
            null,
            (response) => {
                if (response.result) {
                    let select = this.componentElement.querySelector('#smap_content');
                    let option = select.options[select.selectedIndex];
                    let optionText = option.textContent;
                    // Удалить всё после последнего '-'
                    option.textContent = optionText.substring(0, optionText.lastIndexOf('-'));
                    this.clearContentXML();
                }
            }
        );
    }

    /**
     * Clear XML content.
     */
    clearContentXML() {
        if (this.codeEditors && this.codeEditors.length) {
            // Тут мы предполагаем что на форме только одно поле типа код...
            this.codeEditors[0].setValue('');
            // Скрыть контейнер поля
            let inputField = this.codeEditors[0].getInputField && this.codeEditors[0].getInputField();
            let fieldDiv = inputField && inputField.closest('[data-role="form-field"], .form-floating, .mb-3');
            if (fieldDiv) fieldDiv.classList.add('d-none');
        }
    }

    /**
     * Переопределённый save.
     */
    save() {
        // Сохраняем rich-редакторы и code-редакторы
        if (this.richEditors) this.richEditors.forEach(editor => editor.onSaveForm());
        if (this.codeEditors) this.codeEditors.forEach(editor => editor.save && editor.save());

        if (!this.validator.validate()) return false;

        // Валидация языковых вкладок
        let tabs = this.tabPane.getTabs();
        let valid = true;
        tabs.forEach(tab => {
            if (tab.data && tab.data.lang) {
                let checkbox = tab.pane.querySelector('input[type="checkbox"]');
                let disabled = checkbox && checkbox.name.match(/share_sitemap_translation\[\d+\]\[smap_is_disabled\]/)
                    ? checkbox.checked : false;
                if (!disabled) {
                    let input = tab.pane.querySelector('input[type="text"]');
                    if (input && input.value.trim().length === 0) {
                        valid = false;
                    }
                }
            }
        });
        if (!valid) {
            alert(Energine.translations.get('ERR_NO_DIV_NAME'));
            return false;
        }
        this.request(
            `${this.singlePath}save`,
            Form.toQueryString(this.form),
            this.processServerResponse.bind(this)
        );
    }
}

// --- Mixin методов из Form.Label (setLabel, prepareLabel, restoreLabel, showTree) ---
Object.assign(DivForm.prototype, {
    setLabel: Form.Label.setLabel,
    prepareLabel: Form.Label.prepareLabel,
    restoreLabel: Form.Label.restoreLabel,
    showTree: Form.Label.showTree
});

// Для совместимости
window.DivForm = DivForm;
