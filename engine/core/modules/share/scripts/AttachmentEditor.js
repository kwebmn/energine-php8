import Energine from './Energine.js';
import GridManager from './GridManager.js';
import ModalBox from './ModalBox.js';
import {
import { globalScope, attachToWindow as registerGlobal } from './exportToWindow.js';
    bindDragAndDrop,
    createUploadUid,
    uploadFiles
} from './nativeFileHelpers.js';

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

        // Drag & Drop
        this.repository = this;

        bindDragAndDrop(document, {
            onDrop: (files) => {
                if (!files.length) {
                    return;
                }
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
                                        this.saveQuickUpload(response.data);
                                    }
                                }
                            );
                        }
                    },
                    currentPID
                );
            },
            onDragEnter: () => {
                this.element.style.opacity = '0.5';
            },
            onDragLeave: () => {
                this.element.style.opacity = '1';
            }
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
        ModalBox.open({
            url: `${this.singlePath}file-library/${this.quick_upload_pid}/add/`,
            onClose: (response) => {
                if (response && response.result && response.data) {
                    this.saveQuickUpload(response.data, {
                        showOverlay: true,
                        onSuccess: (data) => {
                            if (data && data.result) {
                                this.loadPage(1);
                            }
                        }
                    });
                }
            }
        });
    }

    /**
     * Выполнить сохранение быстрого аплоада через общий helper
     * @param {string|number} uploadId
     * @param {{showOverlay?: boolean, onSuccess?: Function, onError?: Function}} [options]
     */
    saveQuickUpload(uploadId, options = {}) {
        const { showOverlay = false, onSuccess, onError } = options;
        const overlay = this.overlay;

        if (showOverlay && overlay) {
            overlay.show();
        }

        const finalize = (callback) => (response) => {
            if (showOverlay && overlay) {
                overlay.hide();
            }
            if (typeof callback === 'function') {
                callback(response);
            }
        };

        Energine.request(
            `${this.singlePath}savequickupload/`,
            {
                json: 1,
                componentAction: 'add',
                upl_id: uploadId
            },
            finalize(onSuccess),
            finalize(onError),
            finalize(onError)
        );
    }

    /**
     * Загрузка файла нативными средствами
     * @param {string} field_name
     * @param {File[]|FileList} files
     * @param {Function} response_callback
     * @param {string|number} currentPID
     * @returns {*}
     */
    xhrFileUpload(field_name, files, response_callback, currentPID) {
        this.progressBar.style.display = 'block';
        if (this.progressText) {
            this.progressText.style.display = 'block';
            this.progressText.innerText = '0%';
        }

        return uploadFiles({
            url: `${this.singlePath}file-library/upload-temp/?json`,
            fieldName: field_name,
            files,
            data: {
                key: field_name,
                pid: currentPID
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
                    // Handle JSON parse error
                }
            },
            onProgress: (evt) => {
                const loaded = typeof evt.loaded === 'number' ? evt.loaded : 0;
                const total = typeof evt.total === 'number' && evt.total > 0 ? evt.total : Math.max(loaded, 1);
                const percent = Math.min(100, Math.round((loaded / total) * 100));
                this.progressBar.style.width = `${percent}%`;
                if (this.progressText) {
                    this.progressText.innerText = `${percent}%`;
                }
            },
            onComplete: () => {
                setTimeout(() => {
                    this.element.style.opacity = '1';
                    this.progressBar.style.display = 'none';
                    this.progressBar.style.width = '0%';
                    if (this.progressText) {
                        this.progressText.style.display = 'none';
                        this.progressText.innerText = '0%';
                    }
                    this.loadPage(1);
                }, 500);
            }
        });
    }
}

export { AttachmentEditor };
export default AttachmentEditor;

export function attachToWindow(target = globalScope) {
    return registerGlobal('AttachmentEditor', AttachmentEditor, target);
}

attachToWindow();