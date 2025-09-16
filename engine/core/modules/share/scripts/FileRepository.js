ScriptLoader.load('GridManager', 'Cookie', 'FileAPI/FileAPI');

// Глобальное имя cookie для файла
const FILE_COOKIE_NAME = 'NRGNFRPID';

/**
 * Расширяем Grid: popImage (заглушка для всплывающего превью) и кастомная отрисовка полей (iterateFields)
 */
class GridWithPopImage extends Grid {
    /**
     * Показывает превью изображения (заглушка, реализация по желанию)
     * @param {string} path
     * @param {HTMLElement} tmplElement
     */
    popImage(path, tmplElement) {
        // Реализуй превью, если нужно
        // Например, через модальное окно или всплывающее изображение
    }

    /**
     * Кастомная отрисовка ячеек (перезапись для файлового репозитория)
     * @param {string} fieldName
     * @param {Object} record
     * @param {HTMLElement} row
     */
    iterateFields(fieldName, record, row) {
        if (!this.metadata[fieldName].visible || this.metadata[fieldName].type === 'hidden') return;

        let cell = document.createElement('td');
        row.appendChild(cell);

        switch (fieldName) {
            case 'upl_path': {
                cell.style.textAlign = 'center';
                cell.style.verticalAlign = 'middle';

                let image = document.createElement('img');
                let dimensions = { width: 40, height: 40 };
                let container = document.createElement('div');
                container.className = 'thumb_container';
                cell.appendChild(container);

                switch (record['upl_internal_type']) {
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
                        // Только если есть полный путь!
                        if (record[fieldName]) {
                            image.src = (window.Energine.resizer || '') + 'w60-h45/' + record[fieldName];
                        } else {
                            image.src = 'images/icons/icon_undefined.gif';
                        }
                        image.style.borderRadius = '5px';
                        image.style.border = '1px solid transparent';
                        image.onerror = () => {
                            image.src = 'images/icons/icon_error_image.gif';
                            container.onmouseenter = null;
                            container.onmouseleave = null;
                        };
                        // ... далее твой код ...
                        break;
                    default:
                        image.src = 'images/icons/icon_undefined.gif';
                        break;
                }
                Object.assign(image, dimensions);
                container.appendChild(image);
                break;
            }

            case 'upl_publication_date':
                cell.innerHTML = record[fieldName] ? record[fieldName].toString().trim() : '';
                break;

            case 'upl_properties': {
                cell.classList.add('properties');
                let propsTable = document.createElement('tbody');
                let table = document.createElement('table');
                table.appendChild(propsTable);
                cell.appendChild(table);

                if (!/folder|repo/.test(record['upl_internal_type'])) {
                    if (!record['upl_is_ready']) {
                        let tr = document.createElement('tr');
                        tr.innerHTML = `<td>${this.metadata['upl_is_ready'].title} :</td>
                                        <td>${Energine.translations['TXT_NOT_READY']}</td>`;
                        propsTable.appendChild(tr);
                    }
                    if (record['upl_mime_type']) {
                        let video_types = [];
                        if (record['upl_is_mp4'] === '1') video_types.push('mp4');
                        if (record['upl_is_webm'] === '1') video_types.push('webm');
                        if (record['upl_is_flv'] === '1') video_types.push('flv');

                        let tr = document.createElement('tr');
                        tr.innerHTML = `<td>${this.metadata['upl_mime_type'].title} :</td>
                                        <td>${video_types.length ? video_types.join(', ') : record['upl_mime_type']}</td>`;
                        propsTable.appendChild(tr);
                    }
                    switch (record['upl_internal_type']) {
                        case 'video':
                            if (record['upl_duration']) {
                                let tr = document.createElement('tr');
                                tr.innerHTML = `<td>${this.metadata['upl_duration'].title} :</td>
                                                <td>${record['upl_duration']}</td>`;
                                propsTable.appendChild(tr);
                            }
                            break;
                        case 'image':
                            if (record['upl_width']) {
                                let tr = document.createElement('tr');
                                tr.innerHTML = `<td>${this.metadata['upl_width'].title} :</td>
                                                <td>${record['upl_width']}</td>`;
                                propsTable.appendChild(tr);
                            }
                            if (record['upl_height']) {
                                let tr = document.createElement('tr');
                                tr.innerHTML = `<td>${this.metadata['upl_height'].title} :</td>
                                                <td>${record['upl_height']}</td>`;
                                propsTable.appendChild(tr);
                            }
                            break;
                        default:
                            break;
                    }
                }
                break;
            }

            case 'upl_title':
                let title = record[fieldName] ? record[fieldName].toString().trim() : '';
                if (!/folder|repo/.test(record['upl_internal_type'])) {
                    cell.innerHTML = `<a target="_blank" href="${Energine.media + record['upl_path']}">${title}</a>`;
                } else {
                    cell.textContent = title;
                }
                break;

            default:
                // Можно добавить generic отображение
                break;
        }
    }
}

/**
 * Класс FileRepository
 * @extends GridManager
 */
class FileRepository extends GridManager {
    constructor(element) {
        super(element);
        this.grid = new GridWithPopImage(this.element.querySelector('[data-role="grid"]'), {
            onSelect: this.onSelect.bind(this),
            onSortChange: this.onSortChange.bind(this),
            onDoubleClick: this.onDoubleClick.bind(this)
        });
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

    processServerResponse(result) {
        this.grid.headOff.querySelector('th:nth-child(1)').style.width = '100px';
        if (!this.initialized) {
            this.grid.setMetadata(result.meta);
            this.initialized = true;
        }
        if (!result.data) result.data = [];
        if (this.currentPID) {
            Cookie.write(FILE_COOKIE_NAME, this.currentPID, { path: (new URL(Energine.base)).pathname, duration: 1 });
        }
        this.grid.setData(result.data);

        if (result.pager) {
            this.pageList.build(result.pager.count, result.pager.current, result.pager.records);
            const toolbarContainer = this.tabPane.element.querySelector('[data-pane-part="footer"]');
            if (toolbarContainer) toolbarContainer.insertBefore(this.pageList.getElement(), toolbarContainer.firstChild);
        }
        if (!this.grid.isEmpty()) {
            this.toolbar.enableControls();
            this.pageList.enable();
        }

        this.pathBreadCrumbs.load(result.breadcrumbs, (upl_id) => {
            this.currentPID = upl_id;
            if (this.filter) this.filter.remove();
            this.loadPage(1);
        });

        this.grid.build();
        // this.overlay.hide();
        hideLoader();
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
