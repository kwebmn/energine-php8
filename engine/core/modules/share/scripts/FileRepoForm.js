ScriptLoader.load('Form', 'FileAPI/FileAPI');

// FileRepoForm.js

class FileRepoForm extends Form {
    constructor(el) {
        super(el);

        FileAPI.staticPath = Energine.base + 'scripts/FileAPI/';
        FileAPI.debug = false;

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
        const files = FileAPI.getFiles(evt);

        for (const file of files) {
            if (/^image\//.test(file.type)) {
                this.xhrFileUpload(el.id, files, (response) => {
                    const previewSelector = el.getAttribute('preview');
                    const dataSelector = el.getAttribute('data');
                    const previewElement = previewSelector ? document.getElementById(previewSelector) : null;
                    const dataElement = dataSelector ? document.getElementById(dataSelector) : null;

                    if (previewElement) {
                        previewElement.classList.remove('d-none');
                        previewElement.src = Energine.base + 'resizer/w0-h0/' + response.tmp_name;
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
                el.classList.remove('d-none');
                el.src = `${Energine.base}resizer/w${el.getAttribute('width')}-h${el.getAttribute('height')}/${tmpFileName}`;
            });
        }
    }

    // Загрузка файла через FileAPI.upload
    xhrFileUpload(field_name, files, response_callback) {
        const f = {};
        f[field_name] = files;

        return FileAPI.upload({
            url: this.singlePath + 'upload-temp/?json',
            data: {
                key: field_name,
                pid: document.getElementById('upl_pid')?.value || ''
            },
            files: f,
            prepare: (file, options) => {
                options.data[FileAPI.uid()] = 1;
            },
            filecomplete: (err, xhr, file) => {
                if (!err) {
                    try {
                        const result = FileAPI.parseJSON(xhr.responseText);
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
            previewElement.removeAttribute('src');
            previewElement.classList.remove('d-none');
            previewElement.src = Energine.base + 'images/loading.gif';
        }

        if (this.thumbs && this.thumbs.length) {
            this.thumbs.forEach(thumb => {
                thumb.removeAttribute('src');
                thumb.classList.add('d-none');
            });
        }

        const files = FileAPI.getFiles(evt);
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
                        previewElement.removeAttribute('src');
                        previewElement.classList.add('d-none');
                        previewElement.src = Energine.base + 'resizer/w0-h0/' + response.tmp_name;
                    }
                    generatePreviews(response.tmp_name);
                    enableTab();
                } else {
                    if (previewElement) previewElement.src = Energine['static'] + 'images/icons/icon_undefined.gif';
                }
                if (previewElement) previewElement.classList.remove('d-none');
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

// Привязка к глобальному пространству (если нужно)
// window.FileRepoForm = FileRepoForm;
