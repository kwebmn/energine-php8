import Energine from './Energine.js';
import Form from './Form.js';
import ModalBox from './ModalBox.js';
import {
import { globalScope, attachToWindow as registerGlobal } from './exportToWindow.js';
    createUploadUid,
    getFilesFromEvent,
    uploadFiles
} from './nativeFileHelpers.js';

// FileRepoForm.js

class FileRepoForm extends Form {
    constructor(el) {
        super(el);

        this.componentElement = typeof el === 'string' ? document.getElementById(el) : el;

        this.thumbs = Array.from(this.componentElement.querySelectorAll('img.thumb'));

        // Uploader (основной input[type=file])
        const uploader = this.componentElement.querySelector('#uploader');
        if (uploader) {
            uploader.addEventListener('change', this.showPreview.bind(this));
        }

        // Thumb inputs
        const thumbInputs = Array.from(this.componentElement.querySelectorAll('input.thumb'));
        thumbInputs.forEach(input => input.addEventListener('change', this.showThumbPreview.bind(this)));

        // Alt preview
        const altPreviewInputs = Array.from(this.componentElement.querySelectorAll('input.preview'));
        altPreviewInputs.forEach(input => input.addEventListener('change', this.showAltPreview.bind(this)));

        // Tab disable
        const data = this.componentElement.querySelector('#data');
        if (data && !data.value && this.tabPane && this.tabPane.disableTab) {
            this.tabPane.disableTab(1);
        }
    }

    // Альтернативный превью
    showAltPreview(evt) {
        this.showThumbPreview(evt);
    }

    // Превью для thumb-инпутов
    showThumbPreview(evt) {
        const el = evt.target;
        const files = getFilesFromEvent(evt);

        files.filter(file => /^image\//.test(file.type)).forEach((file) => {
            this.xhrFileUpload(el.id, [file], (response) => {
                const previewSelector = el.getAttribute('preview');
                const dataSelector = el.getAttribute('data');
                const previewElement = previewSelector ? document.getElementById(previewSelector) : null;
                const dataElement = dataSelector ? document.getElementById(dataSelector) : null;

                if (previewElement) {
                    Form.showImagePreview(previewElement, Energine.base + 'resizer/w0-h0/' + response.tmp_name);
                }
                if (dataElement) {
                    dataElement.value = response.tmp_name;
                }
            });
        });
    }

    // Генерация превьюшек для всех thumbs
    generatePreviews(tmpFileName) {
        if (this.thumbs && this.thumbs.length) {
            this.thumbs.forEach(el => {
                Form.showImagePreview(
                    el,
                    `${Energine.base}resizer/w${el.getAttribute('width')}-h${el.getAttribute('height')}/${tmpFileName}`
                );
            });
        }
    }

    // Загрузка файла нативными средствами
    xhrFileUpload(field_name, files, response_callback) {
        const pid = document.getElementById('upl_pid')?.value || '';

        return uploadFiles({
            url: `${this.singlePath}upload-temp/?json`,
            fieldName: field_name,
            files,
            data: {
                key: field_name,
                pid
            },
            onPrepare: (file, options) => {
                options.data[createUploadUid()] = 1;
            },
            onFileComplete: (err, xhr) => {
                if (err) {
                    return;
                }
                try {
                    const result = JSON.parse(xhr.responseText || 'null');
                    if (result && !result.error) {
                        response_callback(result);
                    }
                } catch (er) {
                    // Ошибка парсинга
                }
            }
        });
    }

    // Основной превью-файл
    showPreview(evt) {
        const previewElement = document.getElementById('preview');
        if (previewElement) {
            Form.showSpinner(previewElement);
        }

        if (this.thumbs && this.thumbs.length) {
            this.thumbs.forEach(thumb => {
                Form.resetPreview(thumb);
            });
        }

        const files = getFilesFromEvent(evt);
        const enableTab = this.tabPane && this.tabPane.enableTab ? this.tabPane.enableTab.bind(this.tabPane, 1) : () => {};
        const generatePreviews = this.generatePreviews.bind(this);

        files.forEach((file) => {
            this.xhrFileUpload('uploader', [file], (response) => {
                const uplName = document.getElementById('upl_name');
                const uplFilename = document.getElementById('upl_filename');
                const data = document.getElementById('data');
                const uplTitle = document.getElementById('upl_title');

                if (uplName) uplName.value = response.name;
                if (uplFilename) uplFilename.value = response.name;
                if (data) data.value = response.tmp_name;
                if (uplTitle) uplTitle.value = response.name.split('.')[0];

                if (/^(image|video)\//.test(response.type)) {
                    if (previewElement) {
                        Form.showImagePreview(
                            previewElement,
                            Energine.base + 'resizer/w0-h0/' + response.tmp_name,
                            response.name || ''
                        );
                    }
                    generatePreviews(response.tmp_name);
                    enableTab();
                } else if (previewElement) {
                    let iconKey = 'file';
                    if (/^audio\//.test(response.type)) iconKey = 'audio';
                    else if (/zip/.test(response.type)) iconKey = 'zip';
                    else if (/^text\//.test(response.type)) iconKey = 'text';
                    Form.showIconPreview(previewElement, iconKey);
                }
            });
        });
    }

    // Переопределение buildSaveURL
    buildSaveURL() {
        return Energine.base + this.form.getAttribute('action');
    }

    // Получить параметры видеоплеера и закрыть окно
    getPlayerParams() {
        const width = parseInt(this.componentElement.querySelector('#width')?.value) || '';
        const height = parseInt(this.componentElement.querySelector('#height')?.value) || '';
        ModalBox.setReturnValue({ width, height });
        this.close();
    }
}

export { FileRepoForm };
export default FileRepoForm;

export function attachToWindow(target = globalScope) {
    return registerGlobal('FileRepoForm', FileRepoForm, target);
}

attachToWindow();
