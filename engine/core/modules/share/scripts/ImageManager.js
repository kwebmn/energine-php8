ScriptLoader.load('Form', 'ModalBox');

// ImageManager.js

class ImageManager extends Form {
    constructor(element) {
        super(element);

        const getById = (id) => Energine.utils.resolveElement(id, { optional: true });

        /**
         * Image object with metadata.
         * @type {Object}
         */
        this.image = {};

        /**
         * Array of image margins property names.
         * @type {string[]}
         */
        this.imageMargins = ['margin-left', 'margin-right', 'margin-top', 'margin-bottom'];

        // Блокируем изменение имени файла
        const filenameInput = getById('filename');
        if (filenameInput) filenameInput.disabled = true;

        // Получаем данные из ModalBox, если есть
        const imageData = ModalBox.getExtraData ? ModalBox.getExtraData() : null;
        if (imageData) {
            this.image = imageData;
            this.updateForm();
        }

        // Привязываем обработчики к width/height
        const widthInput = getById('width');
        const heightInput = getById('height');
        if (widthInput) widthInput.addEventListener('change', this.checkRatio.bind(this));
        if (heightInput) heightInput.addEventListener('change', this.checkRatio.bind(this));
    }

    /**
     * Проверка и обновление пропорций изображения.
     */
    checkRatio(e) {
        const target = e.target.id;
        const oldWidth = parseInt(this.image.upl_width) || 0;
        const oldHeight = parseInt(this.image.upl_height) || 0;

        const getById = (id) => Energine.utils.resolveElement(id, { optional: true });
        const widthInput = getById('width');
        const heightInput = getById('height');
        let width = parseInt(widthInput.value) || 0;
        let height = parseInt(heightInput.value) || 0;

        if (!oldWidth || !oldHeight) return; // Без исходных данных ничего не меняем

        // Если изменился размер
        if (oldWidth !== width || oldHeight !== height) {
            if (target === 'width') {
                height = Math.round((oldHeight * width) / oldWidth);
            } else {
                width = Math.round((oldWidth * height) / oldHeight);
            }
            widthInput.value = width;
            heightInput.value = height;

            // Формируем путь для нового размера
            const filename = this.image.upl_path;
            const src = `${Energine.resizer}w${width}-h${height}/${filename}`;
            const filenameField = getById('filename');
            const thumbnail = getById('thumbnail');
            if (filenameField) filenameField.value = src;
            if (thumbnail) thumbnail.src = src;
        }
    }

    /**
     * Открыть файловую библиотеку.
     */
    openImageLib() {
        ModalBox.open({
            url: this.singlePath + 'file-library/',
            post: JSON.stringify(this.image),
            onClose: (result) => {
                if (result) {
                    this.image = result;
                    this.updateForm();
                }
                window.focus();
            }
        });
    }

    /**
     * Заполнить форму данными изображения.
     */
    updateForm() {
        if (!this.image) return;
        const getById = (id) => Energine.utils.resolveElement(id, { optional: true });
        const filename = getById('filename');
        const thumbnail = getById('thumbnail');
        const widthField = getById('width');
        const heightField = getById('height');
        const alignField = getById('align');

        if (filename) filename.value = this.image.upl_path || '';
        if (thumbnail) thumbnail.src = (Energine.media || '') + (this.image.upl_path || '');
        if (widthField) widthField.value = this.image.upl_width || 0;
        if (heightField) heightField.value = this.image.upl_height || 0;
        if (alignField) alignField.value = this.image.align || '';

        this.imageMargins.forEach(propertyName => {
            const field = getById(propertyName);
            if (field) {
                field.value = field.value || this.image[propertyName] || '0';
            }
        });

        const alt = getById('alt');
        if (alt && !alt.value) {
            alt.value = this.image.upl_title || '';
        }
    }

    /**
     * Вставить картинку (отправить данные обратно).
     */
    insertImage() {
        const getById = (id) => Energine.utils.resolveElement(id, { optional: true });
        const filenameField = getById('filename');
        if (filenameField && filenameField.value) {
            const widthField = getById('width');
            const heightField = getById('height');
            const alignField = getById('align');
            const altField = getById('alt');
            const thumbnail = getById('thumbnail');

            this.image.filename = filenameField.value;
            this.image.width = parseInt(widthField?.value, 10) || '';
            this.image.height = parseInt(heightField?.value, 10) || '';
            this.image.align = alignField?.value || '';

            this.imageMargins.forEach(propertyName => {
                const field = getById(propertyName);
                this.image[propertyName] = parseInt(field?.value, 10) || 0;
            });
            this.image.alt = altField?.value || '';
            this.image.thumbnail = thumbnail?.src || '';

            ModalBox.setReturnValue(this.image);
        }
        this.close();
    }
}

// Если нужна глобальная привязка:
window.ImageManager = ImageManager;
