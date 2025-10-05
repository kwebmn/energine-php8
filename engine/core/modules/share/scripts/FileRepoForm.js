import Form from './Form.js';
import './FileAPI/FileAPI.js';

const ensureFileAPI = () => {
    if (typeof window === 'undefined' || !window.FileAPI) {
        throw new Error('FileAPI is required for FileRepoForm');
    }
    return window.FileAPI;
};

// FileRepoForm.js

class FileRepoForm extends Form {
    constructor(el, options = {}) {
        super(el, options);

        this.fileAPI = ensureFileAPI();
        this.fileAPI.staticPath = Energine.base + 'scripts/FileAPI/';
        this.fileAPI.debug = false;

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
        const fileAPI = this.fileAPI || ensureFileAPI();
        const files = fileAPI.getFiles(evt);

        for (const file of files) {
            if (/^image\//.test(file.type)) {
                this.xhrFileUpload(el.id, files, (response) => {
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
            }
        }
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

    // Загрузка файла через FileAPI.upload
    xhrFileUpload(field_name, files, response_callback) {
        const f = {};
        f[field_name] = files;

        const fileAPI = this.fileAPI || ensureFileAPI();

        return fileAPI.upload({
            url: this.singlePath + 'upload-temp/?json',
            data: {
                key: field_name,
                pid: document.getElementById('upl_pid')?.value || ''
            },
            files: f,
            prepare: (file, options) => {
                options.data[fileAPI.uid()] = 1;
            },
            filecomplete: (err, xhr, file) => {
                if (!err) {
                    try {
                        const result = fileAPI.parseJSON(xhr.responseText);
                        if (result && !result.error) {
                            response_callback(result);
                        }
                    } catch (er) {
                        // Ошибка парсинга
                    }
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

        const fileAPI = this.fileAPI || ensureFileAPI();
        const files = fileAPI.getFiles(evt);
        const enableTab = this.tabPane && this.tabPane.enableTab ? this.tabPane.enableTab.bind(this.tabPane, 1) : () => {};
        const generatePreviews = this.generatePreviews.bind(this);

        for (const file of files) {
            this.xhrFileUpload('uploader', files, (response) => {
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
        }
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

if (typeof window !== 'undefined') {
    window.FileRepoForm = FileRepoForm;
}

// Привязка к глобальному пространству (если нужно)
// window.FileRepoForm = FileRepoForm;

export default FileRepoForm;
