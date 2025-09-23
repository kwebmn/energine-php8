ScriptLoader.load('GridManager', 'Cookie', 'FileAPI/FileAPI');

// Глобальное имя cookie для файла
const FILE_COOKIE_NAME = 'NRGNFRPID';

/**
 * Расширяем Grid: popImage (заглушка для всплывающего превью) и кастомная отрисовка полей (iterateFields)
 */
class GridWithPopImage extends Grid {
    popImage(path, tmplElement) {
        // Stub for compatibility; implement preview if needed.
    }

    createColumnDefinition(fieldName, fieldMeta) {
        const column = super.createColumnDefinition(fieldName, fieldMeta);

        if (fieldName === 'upl_path') {
            column.width = 100;
            column.hozAlign = 'center';
            column.resizable = false;
            column.formatter = (cell) => {
                const record = cell.getData();
                const value = cell.getValue();
                const container = document.createElement('div');
                container.className = 'thumb_container d-flex justify-content-center';
                const image = document.createElement('img');
                image.width = 40;
                image.height = 40;
                image.className = 'img-thumbnail rounded';

                switch (record.upl_internal_type) {
                    case 'folder':
                        image.src = 'images/icons/icon_folder.gif';
                        break;
                    case 'repo':
                        image.src = 'images/icons/icon_repository.gif';
                        break;
                    case 'folderup':
                        image.src = 'images/icons/icon_folder_up.gif';
                        break;
                    case 'video':
                    case 'image':
                        if (value) {
                            image.src = ((window.Energine && window.Energine.resizer) || '') + 'w60-h45/' + value;
                        } else {
                            image.src = 'images/icons/icon_undefined.gif';
                        }
                        image.style.borderRadius = '5px';
                        image.style.border = '1px solid transparent';
                        image.onerror = () => {
                            image.src = 'images/icons/icon_error_image.gif';
                            image.onerror = null;
                        };
                        break;
                    default:
                        image.src = 'images/icons/icon_undefined.gif';
                }

                container.appendChild(image);
                return container;
            };
            return column;
        }

        if (fieldName === 'upl_properties') {
            column.formatter = (cell) => this.renderProperties(cell.getData());
            return column;
        }

        if (fieldName === 'upl_title') {
            column.formatter = (cell) => {
                const record = cell.getData();
                const title = cell.getValue() ? String(cell.getValue()).trim() : '';
                if (title && !/folder|repo/.test(record.upl_internal_type || '')) {
                    const link = document.createElement('a');
                    link.target = '_blank';
                    link.href = ((window.Energine && window.Energine.media) || '') + record.upl_path;
                    link.textContent = title;
                    return link;
                }
                return title;
            };
            return column;
        }

        return column;
    }

    renderProperties(record) {
        const wrapper = document.createElement('div');
        wrapper.className = 'properties';
        const table = document.createElement('table');
        const tbody = document.createElement('tbody');
        table.appendChild(tbody);
        wrapper.appendChild(table);

        if (!record || /folder|repo/.test(record.upl_internal_type || '')) {
            return wrapper;
        }

        const addRow = (titleKey, value) => {
            const meta = this.metadata[titleKey] || {};
            const title = meta.title || titleKey;
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${title} :</td><td>${value}</td>`;
            tbody.appendChild(tr);
        };

        if (!record.upl_is_ready) {
            const notReady = (window.Energine && window.Energine.translations && window.Energine.translations['TXT_NOT_READY'])
                || 'Not ready';
            addRow('upl_is_ready', notReady);
        }

        if (record.upl_mime_type) {
            const videoTypes = [];
            if (record.upl_is_mp4 === '1') videoTypes.push('mp4');
            if (record.upl_is_webm === '1') videoTypes.push('webm');
            if (record.upl_is_flv === '1') videoTypes.push('flv');
            const value = videoTypes.length ? videoTypes.join(', ') : record.upl_mime_type;
            addRow('upl_mime_type', value);
        }

        if (record.upl_internal_type === 'video' && record.upl_duration) {
            addRow('upl_duration', record.upl_duration);
        }

        if (record.upl_internal_type === 'image') {
            if (record.upl_width) {
                addRow('upl_width', record.upl_width);
            }
            if (record.upl_height) {
                addRow('upl_height', record.upl_height);
            }
        }

        return wrapper;
    }
}

class FileRepository extends GridManager {
    createGrid(element) {
        return new GridWithPopImage(element, {
            onSelect: this.onSelect.bind(this),
            onSortChange: this.onSortChange.bind(this),
            onDoubleClick: this.onDoubleClick.bind(this),
            onDataLoaded: this.processServerResponse.bind(this),
            onDataError: this.processServerError.bind(this),
        });
    }

    constructor(element) {
        super(element);
        // Путь хлебных крошек
        this.pathBreadCrumbs = new PathList(this.element.querySelector('#breadcrumbs'));
        this.currentPID = '';

        // Drag'n'drop загрузка
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

        window.repository = this; // В старом коде для FileAPI.callback-ов
        FileAPI.event.dnd(
            document,
            function(){},
            files => {
                let r = this.grid.getSelectedRecord();
                let currentPID = r.upl_pid;
                this.xhrFileUpload('uploader', files, (r) => {
                    if (!r.error) {
                        Energine.request(
                            this.singlePath + 'save',
                            {
                                'componentAction': 'add',
                                'share_uploads[upl_id]': '',
                                'share_uploads[upl_pid]': currentPID,
                                'share_uploads[upl_path]': r.tmp_name,
                                'share_uploads[upl_title]': r.name,
                                'share_uploads[upl_name]': r.name,
                                'share_uploads[upl_filename]': r.name
                            },
                            function(data){}
                        );
                    }
                });
            }
        );
        FileAPI.event.on(document, 'dragleave', () => { this.element.style.opacity = '1'; });
        FileAPI.event.on(document, 'dragover', () => { this.element.style.opacity = '0.5'; });
    }

    // --- Событие двойного клика (открытие элемента) ---
    onDoubleClick() {
        this.open();
    }

    // --- Событие выбора элемента ---
    onSelect() {
        this.toolbar.enableControls();
        const r = this.grid.getSelectedRecord();
        const openBtn = this.toolbar.getControlById('open');
        switch (r.upl_internal_type) {
            case 'folder':
                if (openBtn) openBtn.enable();
                break;
            case 'folderup':
                this.toolbar.disableControls();
                if (openBtn) openBtn.enable();
                ['addDir', 'add', 'addMulti'].forEach(id => {
                    if (this.toolbar.getControlById(id)) this.toolbar.getControlById(id).enable();
                });
                break;
            case 'repo':
                this.toolbar.disableControls();
                if (openBtn && r.upl_is_ready) openBtn.enable();
                break;
        }
        const btn_map = {
            addDir: 'upl_allows_create_dir',
            addMulti: 'upl_allows_upload_file',
            add: 'upl_allows_upload_file',
            edit: r.upl_internal_type === 'folder' ? 'upl_allows_edit_dir' : 'upl_allows_edit_file',
            delete: r.upl_internal_type === 'folder' ? 'upl_allows_delete_dir' : 'upl_allows_delete_file'
        };
        Object.entries(btn_map).forEach(([btn, flag]) => {
            if (r[flag] && this.toolbar.getControlById(btn) && !this.toolbar.getControlById(btn).disabled()) {
                this.toolbar.getControlById(btn).enable();
            } else if (this.toolbar.getControlById(btn)) {
                this.toolbar.getControlById(btn).disable();
            }
        });
    }

    processServerResponse(result = {}) {
        if (this.currentPID) {
            Cookie.write(FILE_COOKIE_NAME, this.currentPID, { path: (new URL(Energine.base)).pathname, duration: 1 });
        }

        super.processServerResponse(result);

        if (result.pager) {
            const toolbarContainer = this.tabPane.element.querySelector('[data-pane-part="footer"]');
            if (toolbarContainer) {
                toolbarContainer.insertBefore(this.pageList.getElement(), toolbarContainer.firstChild);
            }
        }

        if (result.breadcrumbs) {
            this.pathBreadCrumbs.load(result.breadcrumbs, (upl_id) => {
                this.currentPID = upl_id;
                if (this.filter) this.filter.remove();
                this.loadPage(1);
            });
        }
    }

    // Открыть папку или репозиторий
    open() {
        const r = this.grid.getSelectedRecord();
        switch (r.upl_internal_type) {
            case 'repo':
            case 'folder':
                this.currentPID = r.upl_id;
                if (this.filter) this.filter.remove();
                this.loadPage(1);
                break;
            case 'folderup':
                this.currentPID = r.upl_id;
                this.loadPage(1);
                break;
            default:
                if (r.upl_is_ready) {
                    if (this.toolbar.getControlById('open')) {
                        if (r['upl_path']) {
                            let t = r['upl_path'].split('?');
                            r['upl_path'] = t[0];
                        }
                        ModalBox.setReturnValue(r);
                        ModalBox.close();
                    } else {
                        this.edit();
                    }
                } else {
                    alert(Energine.translations['ERR_UPL_NOT_READY']);
                }
        }
    }

    add() {
        let pid = this.grid.getSelectedRecord().upl_pid;
        if (pid) pid += '/';
        ModalBox.open({
            url: `${this.singlePath}${pid}add/`,
            onClose: this.processAfterCloseAction.bind(this)
        });
    }

    addMulti() {
        let pid = this.grid.getSelectedRecord().upl_pid;
        if (pid) pid += '/';
        ModalBox.open({
            url: `${this.singlePath}${pid}addMulti/`,
            onClose: this.processAfterCloseAction.bind(this)
        });
    }

    addDir() {
        let pid = this.grid.getSelectedRecord().upl_pid;
        console.log(pid);
        if (pid) pid += '/';
        ModalBox.open({
            url: `${this.singlePath}${pid}add-dir/`,
            onClose: (response) => {
                if (response && response.result) {
                    this.currentPID = response.data;
                    this.processAfterCloseAction(response);
                }
            }
        });
    }

    uploadZip(data) {
        Energine.request(
            `${this.singlePath}upload-zip`,
            `PID=${this.grid.getSelectedRecord().upl_pid}&data=${encodeURIComponent(data.result)}`,
            response => { console.log(response); }
        );
    }

    buildRequestURL(pageNum) {
        let url = '', level = '';
        const cookiePID = Cookie.read(FILE_COOKIE_NAME);
        if (this.currentPID === 0) {
            level = '';
        } else if (this.currentPID) {
            level = `${this.currentPID}/`;
        } else if (cookiePID) {
            this.currentPID = cookiePID;
            level = `${this.currentPID}/`;
        }
        if (this.grid.sort.order) {
            url = `${this.singlePath}${level}get-data/${this.grid.sort.field}-${this.grid.sort.order}/page-${pageNum}/`;
        } else {
            url = `${this.singlePath}${level}get-data/page-${pageNum}/`;
        }
        return url;
    }

    buildRequestPostBody() {
        let postBody = '';
        if (this.filter) postBody += this.filter.getValue();
        return postBody;
    }

    xhrFileUpload(field_name, files, response_callback) {
        window.repository = this;
        this.progressBar.style.display = 'block';
        this.progressBar.style.width = '0%';
        this.progressText.style.display = 'block';
        this.progressText.innerText = '0%';
        const r = this.grid.getSelectedRecord();
        const currentPID = r.upl_id;

        let f = {};
        f[field_name] = files;
        return FileAPI.upload({
            url: `${this.singlePath}upload-temp/?json`,
            data: {
                'key': field_name,
                'pid': currentPID
            },
            files: f,
            prepare: function (file, options) {
                options.data[FileAPI.uid()] = 1;
            },
            beforeupload: function () { },
            upload: function () { },
            fileupload: function (file, xhr) { },
            fileprogress: function (evt, file) { },
            filecomplete: function (err, xhr, file) {
                if (!err) {
                    try {
                        let result = FileAPI.parseJSON(xhr.responseText);
                        if (result && !result.error) {
                            response_callback(result);
                        }
                    } catch (er) { }
                }
            },
            progress: (evt, file) => {
                let percent = Math.round(evt.loaded / evt.total * 100);
                this.progressBar.style.width = percent + '%';
                this.progressText.innerText = percent + '%';
            },
            complete: (err, xhr) => {
                setTimeout(() => {
                    this.element.style.opacity = '1';
                    this.progressBar.style.display = 'none';
                    this.progressBar.style.width = '0%';
                    this.progressText.style.display = 'none';
                    this.progressText.innerText = '0%';
                    this.loadPage(1);
                }, 500);
            }
        });
    }
}

/**
 * Класс PathList — хлебные крошки для файлового менеджера
 */
class PathList {
    /**
     * @param {HTMLElement|string} el
     */
    constructor(el) {
        this.element = (typeof el === 'string') ? document.querySelector(el) : el;
    }

    /**
     * Загрузить/отрисовать хлебные крошки
     * @param {Object} data — {id: title}
     * @param {Function} loader
     */
    load(data, loader) {
        if (!this.element) return;
        this.element.innerHTML = '';
        if (data) {
            Object.entries(data).forEach(([id, title]) => {
                const a = document.createElement('a');
                a.href = '#';
                a.textContent = title;
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    loader(id);
                });
                const sep = document.createElement('span');
                sep.textContent = ' / ';
                this.element.appendChild(a);
                this.element.appendChild(sep);
            });
        }
    }
}

// Привязки к window, если требуется:
window.GridWithPopImage = GridWithPopImage;
window.FileRepository = FileRepository;
window.PathList = PathList;
