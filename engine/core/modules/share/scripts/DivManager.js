import Energine from './Energine.js';
import TabPane from './TabPane.js';
import './Toolbar.js';
import './ModalBox.js';
import { request } from './energine-network.js';
import { showLoader, hideLoader } from './energine-ui.js';

const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

const $ = globalScope?.jQuery || globalScope?.$;
const ModalBox = globalScope?.top?.ModalBox || globalScope?.ModalBox || null;

const DIVISION_ICON_MAP = {
    'divisions_list.icon.gif': 'fa-solid fa-diagram-project text-primary',
    'form.icon.gif': 'fa-solid fa-list-check text-primary',
    'login_form.icon.gif': 'fa-solid fa-right-to-bracket text-secondary',
    'rss.icon.gif': 'fa-solid fa-square-rss text-warning',
    'editor.icon.gif': 'fa-solid fa-pen-to-square text-info',
    'gallery.icon.gif': 'fa-solid fa-images text-info',
    'profile_form.icon.gif': 'fa-solid fa-id-card text-primary',
    'sitemap.icon.gif': 'fa-solid fa-sitemap text-secondary',
    'empty.icon.gif': 'fa-solid fa-file text-secondary',
    'home_page.icon.gif': 'fa-solid fa-house text-primary',
    'restore_password_form.icon.gif': 'fa-solid fa-unlock-keyhole text-warning',
    'text_page.icon.gif': 'fa-solid fa-file-lines text-secondary'
};

const getDivisionIconClass = (path) => {
    if (!path) {
        return 'fa-solid fa-file text-secondary';
    }
    const fileName = path.split('/').pop();
    const className = DIVISION_ICON_MAP[fileName] || 'fa-solid fa-file text-secondary';
    return `${className} fa-fw`;
};

class DivManager {

    constructor(element) {
        this.element = typeof element === 'string'
            ? document.querySelector(element) || document.getElementById(element)
            : element;

        this.selectOnStart = false;

        this.initManager();
    }

    initManager() {
        Energine.loadCSS('scripts/jstree/themes/default/style.min.css');

        if (!this.element) throw new Error('DivManager: element not found');

        this.toolbar = null;
        this.tabPane = new TabPane(this.element);
        this.langId = this.element.getAttribute('lang_id');

        const isSingleMode = document.body?.classList?.contains('e-singlemode-layout');

        this.element.classList.add('d-flex', 'flex-column', 'gap-4');
        this.element.classList.toggle('flex-lg-row', !isSingleMode);
        this.element.classList.toggle('align-items-start', !isSingleMode);

        // --- Создание структуры дерева (div для jsTree) ---
        this.treeContainer = this.element.querySelector('[data-role="tree-panel"]')
            || this.element.querySelector('#treeContainer')
            || this.element;
        let divTree = this.treeContainer.querySelector('#divTree');
        if (!divTree) {
            divTree = document.createElement('div');
            divTree.id = 'divTree';
            this.treeContainer.appendChild(divTree);
        }
        //this.treeContainer.classList.add('position-relative', 'w-100', 'bg-body', 'border', 'rounded-3', 'p-3', 'shadow-sm');
        this.treeContainer.classList.toggle('flex-shrink-0', !isSingleMode);
        this.treeContainer.classList.toggle('w-lg-auto', !isSingleMode);
        if (isSingleMode) {
            this.treeContainer.style.removeProperty('maxWidth');
            this.treeContainer.style.removeProperty('maxHeight');
        } else {
            this.treeContainer.style.maxWidth = '340px';
            this.treeContainer.style.maxHeight = 'calc(100vh - 6rem)';
        }
        this.treeContainer.style.overflowY = 'auto';
        this.treeContainer.classList.add('mb-3');
        this.treeContainer.classList.toggle('mb-lg-0', !isSingleMode);

        this.singlePath = this.element.getAttribute('single_template');
        this.site = this.element.getAttribute('site');

        // --- Инициализация jsTree (без данных) ---
        this.jstree = $(divTree);
        this.jstree.jstree({
            'core': { 'data': [] , 'multiple': false}
        });

        // --- Навешиваем события ---
        this.jstree.on('select_node.jstree', (e, data) => this.onSelectNode && this.onSelectNode(data.node));
        this.jstree.on('dblclick.jstree', '.jstree-anchor', (e) => {
            const node = this.jstree.jstree().get_node(e.target);
            this.go && this.go(node);
        });



        showLoader(this.treeContainer);
        this.loadTree();

        this.jstree.on('refresh.jstree', function(e, data) {
            // Получить id первого корневого узла
            var firstNode = $(this).jstree(true).get_node('#').children[0];
            if (firstNode) {
                $(this).jstree(true).open_node(firstNode);
            }
        });
    }



    attachToolbar(toolbar) {
        const toolbarContainer = this.element.querySelector('[data-pane-part="footer"]');
        this.toolbar = toolbar;
        if (toolbarContainer) {
            toolbarContainer.appendChild(this.toolbar.getElement());
        } else {
            this.element.appendChild(this.toolbar.getElement());
        }
        this.toolbar.disableControls();

        ['add', 'select', 'close', 'edit'].forEach(btnID => {
            const btn = this.toolbar.getControlById(btnID);
            if (btn) btn.enable();
        });
        toolbar.bindTo(this);
    }

    loadTree() {
        showLoader(this.treeContainer);
        request(
            this.singlePath + this.site + '/get-data/',
            'languageID=' + this.langId,
            response => {
                // 1. Преобразуем данные
                const jsTreeData = this.transformToJsTree(response.data);

                // 2. Обновляем jsTree (с заменой всех данных)
                this.jstree.jstree(true).settings.core.data = jsTreeData;
                this.jstree.jstree(true).refresh();

                // 3. После обновления — выделяем текущий раздел (если есть)

                if (response.current && !this.selectOnStart) {
                    this.jstree.one('refresh.jstree', () => {

                        // this.jstree.one('refresh.jstree', () => {
                            const id = String(response.current);
                            const node = this.jstree.jstree('get_node', id);

                            if (node) {
                                this.jstree.jstree('select_node', id);
                            }
                            this.selectOnStart = true;
                        // });
                    });
                }

                // 4. Остальная логика
                hideLoader(this.treeContainer);
            }
        );
    }

    transformToJsTree(data) {
        return data.map(node => ({
            id: String(node.smap_id),
            parent: node.smap_pid && node.smap_pid !== "" ? String(node.smap_pid) : "#",
            text: node.smap_name,
            icon: getDivisionIconClass(node.tmpl_icon),
            data: {
                segment: node.smap_segment,
                lang_id: node.lang_id,
                smap_id: node.smap_id,
                smap_pid: node.smap_pid,
                smap_segment: node.smap_segment,
                smap_name: node.smap_name
            }
        }));

    }

    reload() {
        this.loadTree();
    }

    // -------- Actions --------

    getSelectedNode() {
        // Аналог старого this.tree.getSelectedNode()
        const selected = this.jstree.jstree('get_selected', true);
        return selected.length ? selected[0] : null;
    }

    add() {
        const node = this.getSelectedNode();
        const nodeId = node?.id;
        ModalBox.open({
            url: this.singlePath + 'add/' + nodeId + '/',
            onClose: returnValue => {
                if (returnValue) {
                    switch (returnValue.afterClose) {
                        case 'add': this.add(); break;
                        case 'go': window.top.location.href = Energine.base + returnValue.url; break;
                        default: this.reload();
                    }
                }
            },
            extraData: node
        });
    }

    edit() {
        const node = this.getSelectedNode();
        const nodeId = node?.id;
        ModalBox.open({
            url: this.singlePath + nodeId + '/edit',
            onClose: this.refreshNode.bind(this),
            extraData: node
        });
    }

    del() {
        const MSG_CONFIRM_DELETE = Energine.translations.get('MSG_CONFIRM_DELETE') ||
            'Do you really want to delete record?';
        if (!window.confirm(MSG_CONFIRM_DELETE)) return;
        const node = this.getSelectedNode();
        const nodeId = node?.id;
        request(
            this.singlePath + nodeId + '/delete',
            '',
            response => {
                this.jstree.jstree('delete_node', nodeId);
                // select root node after delete
                this.jstree.jstree('select_node', '#');
            }
        );
    }

    changeOrder(response) {
        if (!response.result) return;
        const moveMethod = (response.dir == '<') ? 'move_node_up' : 'move_node_down';
        const node = this.getSelectedNode();
        if (!node) return;
        // jsTree не имеет move_node_up/move_node_down, используем move_node
        // Реализуй по своему алгоритму, если требуется
    }

    up() {
        const node = this.getSelectedNode();
        if (!node) return;
        const nodeId = node.id;

        request(
            this.singlePath + nodeId + '/up',
            '',
            (response) => {
                // Сервер меняет порядок, теперь просто перезагрузи дерево!
                this.loadTree();
            }
        );
    }

    down() {
        const node = this.getSelectedNode();
        if (!node) return;
        const nodeId = node.id;

        request(
            this.singlePath + nodeId + '/down',
            '',
            (response) => {
                this.loadTree();
            }
        );
    }

    select() {
        const node = this.getSelectedNode();
        const nodeData = node?.data;
        const siteSelector = document.getElementById('site_selector') || document.querySelector('#site_selector');
        if (siteSelector && nodeData) {
            const selectedOption = siteSelector.querySelector('option:checked');
            if (selectedOption) {
                nodeData.site_name = selectedOption.textContent;
                nodeData.site_id = selectedOption.value;
            }
        }
        ModalBox.setReturnValue(nodeData);
        ModalBox.close();
    }

    close() {
        ModalBox.close();
    }

    go(node) {
        if (!node) return;
        const data = node.data || {};
        // Если segment пустой — ничего не делаем!
        if (typeof data.segment !== 'string' || data.segment === '') return;

        // Если site не определён — подставь Energine.base
        const url = (data.site && data.site !== '') ? data.site + Energine.lang + '/' + data.segment : (Energine.base || '') + Energine.lang + '/' + data.segment;

        // Переходим по ссылке
        window.top.document.location = url;
    }

    onSelectNode(node) {

        if (!this.toolbar) return;
        const data = node.data;
        let buttons = [this.toolbar.getControlById('close')];

        if (node.parent && node.parent !== '#') {
            this.toolbar.enableControls();
        } else {
            this.toolbar.disableControls();
            buttons = buttons.concat([
                this.toolbar.getControlById('add'),
                this.toolbar.getControlById('edit'),
                this.toolbar.getControlById('select')
            ]);
        }


        buttons.forEach(btn => {
            if (btn) btn.enable();
        });
    }

    refreshNode() {
        const node = this.getSelectedNode();
        const nodeId = node?.id;
        request(
            this.singlePath + 'get-node-data',
            `languageID=${this.langId}&id=${nodeId}`,
            response => {
                // Можно просто перезагрузить всё дерево или обновить отдельный узел (jsTree API)
                this.reload();
            }
        );
    }
}

export { DivManager };
export default DivManager;

export function attachToWindow(target = globalScope) {
    if (!target) {
        return DivManager;
    }

    target.DivManager = DivManager;
    return DivManager;
}

attachToWindow();
