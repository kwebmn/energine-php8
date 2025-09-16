ScriptLoader.load('GridManager', 'FileAPI/FileAPI');

/**
 * AttachmentEditor
 * @extends GridManager
 */
class AttachmentEditor extends GridManager {
    /**
     * @param {HTMLElement|string} element
     */
    constructor(element) {
        super(element);

        this.quick_upload_path = this.element.getAttribute('quick_upload_path');
        this.quick_upload_pid = this.element.getAttribute('quick_upload_pid');
        this.quick_upload_enabled = this.element.getAttribute('quick_upload_enabled');

        // Drag & Drop + FileAPI
        this.repository = this;

        FileAPI.event.dnd(
            document,
            () => {},
            (files) => {
                const r = this.grid.getSelectedRecord();
                const currentPID = r ? r.upl_pid : this.quick_upload_pid;

                this.xhrFileUpload(
                    'uploader',
                    files,
                    (uploadResult) => {

                        if (!uploadResult.error) {
                            Energine.request(
                                `${this.singlePath}file-library/save/`,
                                {
                                    'componentAction': 'add',
                                    'share_uploads[upl_id]': '',
                                    'share_uploads[upl_pid]': this.quick_upload_pid,
                                    'share_uploads[upl_path]': uploadResult.tmp_name,
                                    'share_uploads[upl_title]': uploadResult.name,
                                    'share_uploads[upl_name]': uploadResult.name,
                                    'share_uploads[upl_filename]': uploadResult.name
                                },
                                (response) => {
                                    if (response.data) {
                                        // Второй запрос — уже без Request.JSON!
                                        Energine.request(
                                            `${this.singlePath}savequickupload/`,
                                            {
                                                json: 1,
                                                componentAction: 'add',
                                                upl_id: response.data
                                            },
                                            (data) => {
                                                // Здесь твой onComplete (data) код, если нужен
                                            },
                                            (userErr) => {
                                                // обработка пользовательской ошибки (опционально)
                                            },
                                            (serverErr) => {
                                                // обработка server-side ошибки (опционально)
                                            }
                                        );
                                    }                                }
                            );
                        }

                    },
                    currentPID
                );

            }
        );

        FileAPI.event.on(document, 'dragleave', () => {
            this.element.style.opacity = '1';
        });
        FileAPI.event.on(document, 'dragover', () => {
            this.element.style.opacity = '0.5';
        });

        // Прогрессбар
        const progressBar = document.createElement('div');
        Object.assign(progressBar.style, {
            backgroundColor: 'green',
            width: '0%',
            height: '100%',
            opacity: '0.2',
            position: 'fixed',
            zIndex: 10,
            top: '0%',
            left: '0%',
            display: 'none'
        });
        const progressText = document.createElement('div');
        Object.assign(progressText.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#333',
            fontWeight: 'bold',
            fontSize: '1.8em',
            zIndex: 11,
            background: 'rgba(255,255,255,0.75)',
            padding: '8px 24px',
            borderRadius: '6px',
            display: 'none'
        });
        progressText.innerText = '0%';

        this.element.prepend(progressText);
        this.element.prepend(progressBar);

        this.progressBar = progressBar;
        this.progressText = progressText;
    }

    /**
     * Переопределяем обработку ответа сервера
     * @param {Object} response
     */
    processServerResponse(response) {
        super.processServerResponse(response);
        if (this.toolbar && this.toolbar.getControlById) {
            const control = this.toolbar.getControlById('quickupload');
            if (control) {
                if (this.quick_upload_enabled) {
                    control.enable();
                } else {
                    control.disable();
                }
            }
        }
    }

    /**
     * Открыть окно быстрого аплоада
     */
    quickupload() {
        const overlay = this.overlay;
        ModalBox.open({
            url: `${this.singlePath}file-library/${this.quick_upload_pid}/add/`,
            onClose: (response) => {
                if (response && response.result && response.data) {
                    this.overlay.show();
                    new Request.JSON({
                        url: `${this.singlePath}savequickupload/`,
                        method: 'post',
                        data: {
                            json: 1,
                            componentAction: 'add',
                            upl_id: response.data
                        },
                        evalResponse: true,
                        onComplete: (data) => {
                            overlay.hide();
                            if (data && data.result) {
                                this.loadPage(1);
                            }
                        },
                        onFailure: () => {
                            overlay.hide();
                        }
                    }).send();
                }
            }
        });
    }

    /**
     * Загрузка файла через FileAPI
     * @param {string} field_name
     * @param {*} files
     * @param {*} response_callback
     * @param {*} currentPID
     * @returns {*}
     */
    xhrFileUpload(field_name, files, response_callback, currentPID) {
        this.progressBar.style.display = 'block';

        const f = {};
        f[field_name] = files;

        return FileAPI.upload({
            url: `${this.singlePath}file-library/upload-temp/?json`,
            data: {
                key: field_name,
                pid: currentPID
            },
            files: f,
            prepare: function (file, options) {
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
                        // Handle JSON parse error
                    }
                }
            },
            progress: (evt, file) => {
                this.progressBar.style.width = (evt.loaded / evt.total * 100) + '%';
            },
            complete: (err, xhr) => {
                setTimeout(() => {
                    this.element.style.opacity = '1';
                    this.progressBar.style.display = 'none';
                    this.progressBar.style.width = '0%';
                    this.loadPage(1);
                }, 500);
            }
        });
    }
}

// Привязка глобально, если требуется:
window.AttachmentEditor = AttachmentEditor;