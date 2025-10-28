import Energine, { registerBehavior as registerEnergineBehavior } from './Energine.js';
import Form from './Form.js';
import ModalBox from './ModalBox.js';

const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

// ImageManager.js

class ImageManager extends Form {
    constructor(element) {
        super(element);

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
        const filenameInput = document.getElementById('filename');
        if (filenameInput) filenameInput.disabled = true;

        // Получаем данные из ModalBox, если есть
        const imageData = ModalBox.getExtraData ? ModalBox.getExtraData() : null;
        if (imageData) {
            this.image = imageData;
            this.updateForm();
        }

        // Привязываем обработчики к width/height
        const widthInput = document.getElementById('width');
        const heightInput = document.getElementById('height');
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

        const widthInput = document.getElementById('width');
        const heightInput = document.getElementById('height');
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
            document.getElementById('filename').value = src;
            document.getElementById('thumbnail').src = src;
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
        document.getElementById('filename').value = this.image.upl_path || '';
        document.getElementById('thumbnail').src = (Energine.media || '') + (this.image.upl_path || '');
        document.getElementById('width').value = this.image.upl_width || 0;
        document.getElementById('height').value = this.image.upl_height || 0;
        document.getElementById('align').value = this.image.align || '';

        this.imageMargins.forEach(propertyName => {
            const field = document.getElementById(propertyName);
            if (field) {
                field.value = field.value || this.image[propertyName] || '0';
            }
        });

        const alt = document.getElementById('alt');
        if (alt && !alt.value) {
            alt.value = this.image.upl_title || '';
        }
    }

    /**
     * Вставить картинку (отправить данные обратно).
     */
    insertImage() {
        if (document.getElementById('filename').value) {
            this.image.filename = document.getElementById('filename').value;
            this.image.width = parseInt(document.getElementById('width').value) || '';
            this.image.height = parseInt(document.getElementById('height').value) || '';
            this.image.align = document.getElementById('align').value || '';

            this.imageMargins.forEach(propertyName => {
                this.image[propertyName] = parseInt(document.getElementById(propertyName).value) || 0;
            });
            this.image.alt = document.getElementById('alt').value;
            this.image.thumbnail = document.getElementById('thumbnail').src;

            ModalBox.setReturnValue(this.image);
        }
        this.close();
    }
}

export { ImageManager };
export default ImageManager;
if (typeof registerEnergineBehavior === 'function') {
    registerEnergineBehavior('ImageManager', ImageManager);
}
