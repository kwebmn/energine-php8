import Energine, { registerBehavior as registerEnergineBehavior } from './Energine.js';
import GridManager, { Grid } from './GridManager.js';
import Cookie from './Cookie.js';
import ModalBox from './ModalBox.js';
import {
    bindDragAndDrop,
    createUploadUid,
    uploadFiles
} from './nativeFileHelpers.js';

const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

// Глобальное имя cookie для файла
const FILE_COOKIE_NAME = 'NRGNFRPID';

const FILE_REPO_ICON_MAP = {
    folder: 'fa-solid fa-folder text-warning',
    repo: 'fa-solid fa-database text-primary',
    folderup: 'fa-solid fa-arrow-up text-secondary',
    image: 'fa-solid fa-file-image text-info',
    video: 'fa-solid fa-file-video text-info',
    audio: 'fa-solid fa-file-audio text-info',
    zip: 'fa-solid fa-file-zipper text-warning',
    text: 'fa-solid fa-file-lines text-secondary',
    unknown: 'fa-solid fa-file text-secondary',
    file: 'fa-solid fa-file text-secondary',
    error: 'fa-solid fa-triangle-exclamation text-danger'
};

const createIconElement = (type) => {
    const icon = document.createElement('i');
    const className = FILE_REPO_ICON_MAP[type] || FILE_REPO_ICON_MAP.file;
    icon.className = `file-repo-icon fa-2x fa-fw ${className}`;
    icon.setAttribute('aria-hidden', 'true');
    return icon;
};

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

                let container = document.createElement('div');
                container.className = 'thumb_container d-flex align-items-center justify-content-center';
                container.style.width = '40px';
                container.style.height = '40px';
                container.style.overflow = 'hidden';
                container.style.borderRadius = '0.35rem';
                container.style.backgroundColor = 'var(--bs-tertiary-bg, #f8f9fa)';
                cell.appendChild(container);

                const appendIcon = (type) => {
                    container.appendChild(createIconElement(type));
                };

                switch (record['upl_internal_type']) {
                    case 'folder':
                        appendIcon('folder');
                        break;
                    case 'repo':
                        appendIcon('repo');
                        break;
                    case 'folderup':
                        appendIcon('folderup');
                        break;
                    case 'video':
                    case 'image': {
                        const image = document.createElement('img');
                        const dimensions = { width: 40, height: 40 };
                        Object.assign(image, dimensions);
                        image.className = 'img-fluid rounded';
                        image.style.objectFit = 'cover';
                        image.style.border = '1px solid transparent';

                        if (record[fieldName]) {
                            image.src = ((Energine?.resizer) || '') + 'w60-h45/' + record[fieldName];
                        } else {
                            appendIcon(record['upl_internal_type']);
                            break;
                        }

                        image.onerror = () => {
                            image.remove();
                            appendIcon('error');
                            container.onmouseenter = null;
                            container.onmouseleave = null;
                        };

                        container.appendChild(image);
                        break;
                    }
                    case 'audio':
                        appendIcon('audio');
                        break;
                    case 'zip':
                        appendIcon('zip');
                        break;
                    case 'text':
                        appendIcon('text');
                        break;
                    case 'unknown':
                        appendIcon('unknown');
                        break;
                    default:
                        appendIcon('file');
                        break;
                }
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

        if (globalScope) {
            globalScope.repository = this; // Сохраняем ссылку для совместимости со старыми FileAPI callback-ами
        }

        bindDragAndDrop(document, {
            onDrop: (files) => {
                if (!files.length) {
                    return;
                }
                const targetPID = this.resolveTargetPID({ preferSelectedFolder: true });
                this.xhrFileUpload('uploader', files, (uploadResult) => {
                    if (!uploadResult.error) {
                        Energine.request(
                            this.singlePath + 'save',
                            {
                                'componentAction': 'add',
                                'share_uploads[upl_id]': '',
                                'share_uploads[upl_pid]': targetPID,
                                'share_uploads[upl_path]': uploadResult.tmp_name,
                                'share_uploads[upl_title]': uploadResult.name,
                                'share_uploads[upl_name]': uploadResult.name,
                                'share_uploads[upl_filename]': uploadResult.name
                            },
                            function(data){}
                        );
                    }
                }, targetPID);
            },
            onDragEnter: () => {
                this.element.style.opacity = '0.5';
            },
            onDragLeave: () => {
                this.element.style.opacity = '1';
            }
        });
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
        const headReference = this.grid.headOff || (this.grid.table ? this.grid.table.tHead : null);
        if (headReference) {
            const firstHeaderCell = headReference.querySelector('th:nth-child(1)');
            if (firstHeaderCell) {
                firstHeaderCell.style.width = '100px';
            }
        }
        if (!this.initialized) {
            this.grid.setMetadata(result.meta);
            this.initialized = true;
        }
        if (!result.data) result.data = [];
        const breadcrumbs = result.breadcrumbs || {};
        const breadcrumbIds = Object.keys(breadcrumbs);
        if (breadcrumbIds.length) {
            const lastBreadcrumbId = breadcrumbIds[breadcrumbIds.length - 1];
            if (lastBreadcrumbId !== '' && lastBreadcrumbId !== null && typeof lastBreadcrumbId !== 'undefined') {
                const normalizedBreadcrumbId = String(lastBreadcrumbId).trim();
                if (normalizedBreadcrumbId && normalizedBreadcrumbId !== '0') {
                    this.currentPID = normalizedBreadcrumbId;
                }
            }
        }

        if (!this.currentPID) {
            const cookiePID = Cookie.read(FILE_COOKIE_NAME);
            if (cookiePID && cookiePID !== '0') {
                this.currentPID = cookiePID;
            }
        }

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
            // При смене директории сбрасываем пагинацию на первую страницу,
            // иначе GridManager переиспользует старую currentPage и можем уйти на пустую страницу.
            if (this.pageList) this.pageList.currentPage = 1;
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
                // Сброс пагинации при входе в папку/репозиторий
                if (this.pageList) this.pageList.currentPage = 1;
                this.loadPage(1);
                break;
            case 'folderup':
                this.currentPID = r.upl_id;
                // Сброс пагинации при переходе на уровень вверх
                if (this.pageList) this.pageList.currentPage = 1;
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
        const targetPID = this.resolveTargetPID();
        const pidSegment = this.buildPidSegment(targetPID);
        ModalBox.open({
            url: `${this.singlePath}${pidSegment}add/`,
            onClose: this.processAfterCloseAction.bind(this)
        });
    }

    addMulti() {
        const targetPID = this.resolveTargetPID();
        const pidSegment = this.buildPidSegment(targetPID);
        ModalBox.open({
            url: `${this.singlePath}${pidSegment}addMulti/`,
            onClose: this.processAfterCloseAction.bind(this)
        });
    }

    addDir() {
        const targetPID = this.resolveTargetPID();
        const pidSegment = this.buildPidSegment(targetPID);
        ModalBox.open({
            url: `${this.singlePath}${pidSegment}add-dir/`,
            onClose: (response) => {
                if (response && response.result) {
                    this.currentPID = response.data;
                    // После создания папки меняется контекст — сбрасываем пагинацию
                    if (this.pageList) this.pageList.currentPage = 1;
                    this.processAfterCloseAction(response);
                }
            }
        });
    }

    uploadZip(data) {
        const targetPID = this.resolveTargetPID();
        Energine.request(
            `${this.singlePath}upload-zip`,
            `PID=${targetPID}&data=${encodeURIComponent(data.result)}`,
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

    xhrFileUpload(field_name, files, response_callback, pidOverride) {
        if (globalScope) {
            globalScope.repository = this;
        }
        const record = this.grid.getSelectedRecord();
        const targetPID = this.resolveTargetPID({ pidOverride, record });

        this.progressBar.style.display = 'block';
        this.progressBar.style.width = '0%';
        if (this.progressText) {
            this.progressText.style.display = 'block';
            this.progressText.innerText = '0%';
        }

        return uploadFiles({
            url: `${this.singlePath}upload-temp/?json`,
            fieldName: field_name,
            files,
            data: {
                'key': field_name,
                'pid': targetPID
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
                    // ignore parse errors
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

    resolveTargetPID({ pidOverride, record, preferSelectedFolder = false } = {}) {
        if (typeof pidOverride !== 'undefined' && pidOverride !== null && pidOverride !== '') {
            return pidOverride;
        }

        const selectedRecord = record || this.grid.getSelectedRecord();
        if (preferSelectedFolder && selectedRecord &&
            (selectedRecord.upl_internal_type === 'folder' || selectedRecord.upl_internal_type === 'repo') &&
            typeof selectedRecord.upl_id !== 'undefined' && selectedRecord.upl_id !== null && selectedRecord.upl_id !== '') {
            return selectedRecord.upl_id;
        }
        if (selectedRecord && typeof selectedRecord.upl_pid !== 'undefined' && selectedRecord.upl_pid !== null && selectedRecord.upl_pid !== '') {
            return selectedRecord.upl_pid;
        }

        if (typeof this.currentPID !== 'undefined' && this.currentPID !== null && this.currentPID !== '') {
            return this.currentPID;
        }

        if (this.currentPID === 0) {
            return 0;
        }

        const cookiePID = Cookie.read(FILE_COOKIE_NAME);
        if (cookiePID && cookiePID !== '0') {
            return cookiePID;
        }

        return '';
    }

    buildPidSegment(pid) {
        if (pid === '' || pid === null || typeof pid === 'undefined') {
            return '';
        }

        if (pid === 0 || pid === '0') {
            return '';
        }

        return `${pid}/`;
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

export { GridWithPopImage, FileRepository, PathList };
export default FileRepository;

export function attachToWindow(target = globalScope) {
    if (!target) {
        return FileRepository;
    }

    target.GridWithPopImage = GridWithPopImage;
    target.FileRepository = FileRepository;
    target.PathList = PathList;

    return FileRepository;
}

attachToWindow();

if (typeof registerEnergineBehavior === 'function') {
    registerEnergineBehavior('FileRepository', FileRepository);
}
