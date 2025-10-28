import Energine, { showLoader, registerBehavior as registerEnergineBehavior } from './Energine.js';
import DivManager from './DivManager.js';
import TabPane from './TabPane.js';
import './ModalBox.js';

const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

const $ = globalScope?.jQuery || globalScope?.$;
const ModalBox = globalScope?.top?.ModalBox || globalScope?.ModalBox || null;

class DivSidebar extends DivManager {
    /**
     * @param {Element|string} element
     */
    constructor(element) {
        super(element); // Можно вызвать super(), затем переопределить специфичное

        this.contentPanel = this.element ? this.element.querySelector('[data-role="editor-content"]') : null;
        if (this.contentPanel) {
            this.contentPanel.classList.add('flex-grow-1', 'd-flex', 'flex-column', 'gap-3', 'w-100');
        }
        this.organizeContentPanel();
    }

    initManager() {
        Energine.loadCSS('scripts/jstree/themes/default/style.min.css');

        if (!this.element) throw new Error('DivManager: element not found');

        this.toolbar = null;
        this.tabPane = new TabPane(this.element);
        this.langId = this._resolveDatasetValue('eLangId', 'data-e-lang-id');
        this.singlePath = this._resolveDatasetValue('eSingleTemplate', 'data-e-single-template');
        this.site = this._resolveDatasetValue('eSite', 'data-e-site');

        this.treeContainer = this._ensureTreeContainer();
        const divTree = this._ensureTreeElement();

        this.jstree = $(divTree);
        this.jstree.jstree({
            plugins: ['contextmenu'],
            core: { data: [], multiple: false },
            contextmenu: {
                items: () => this._createContextMenuItems(),
            },
        });

        this._bindTreeEvents();

        showLoader(this.treeContainer);
        this.loadTree();
    }


    // Статический метод для подключения CSS (наследуется от DivManager, но дублирую на всякий случай)

    /**
     * Перегрузка метода attachToolbar — только добавляет нужные кнопки
     * @param {Toolbar} toolbar
     */
    attachToolbar(toolbar) {
        if (toolbar) {
            // Вставить тулбар в самое начало контейнера
            this.element.insertBefore(toolbar.getElement(), this.element.firstChild);
            toolbar.disableControls();
            const addBtn = toolbar.getControlById('add');
            if (addBtn) addBtn.enable();
            const selectBtn = toolbar.getControlById('select');
            if (selectBtn) selectBtn.enable();
            toolbar.bindTo(this);
            this.toolbar = toolbar;
        }
    }

    organizeContentPanel() {
        if (!this.contentPanel) return;

        const panesToMove = [];
        for (let sibling = this.element.nextElementSibling; sibling; sibling = sibling.nextElementSibling) {
            if (sibling.matches?.('[data-role="pane"]')) {
                panesToMove.push(sibling);
            }
        }

        panesToMove.forEach(node => this.contentPanel.appendChild(node));

        const isEmpty = this.contentPanel.children.length === 0;
        this.contentPanel.classList.toggle('d-none', isEmpty);
        this.contentPanel.classList.toggle('flex-grow-1', !isEmpty);
    }

    _resolveDatasetValue(datasetKey, attributeName) {
        const dataset = this.element?.dataset || {};
        return dataset[datasetKey]
            || this.element?.getAttribute(attributeName)
            || null;
    }

    _ensureTreeContainer() {
        return this.element.querySelector('[data-role="tree-panel"]')
            || this.element;
    }

    _ensureTreeElement() {
        let divTree = this.treeContainer.querySelector('#divTree');
        if (!divTree) {
            divTree = document.createElement('div');
            divTree.id = 'divTree';
            this.treeContainer.appendChild(divTree);
        }
        return divTree;
    }

    _createContextMenuItems() {
        const reloadTree = () => this.loadTree();
        const getNode = (data) => $.jstree.reference(data.reference).get_node(data.reference);
        const confirmDeleteMessage = Energine.translations.get('MSG_CONFIRM_DELETE');

        const openModal = (pathBuilder) => (data) => {
            const node = getNode(data);
            ModalBox?.open({
                url: pathBuilder(node),
                onClose: reloadTree,
            });
        };

        const requestAndReload = (pathBuilder, { confirmMessage } = {}) => (data) => {
            if (confirmMessage && !confirm(confirmMessage)) return;
            const node = getNode(data);
            $.get(pathBuilder(node), reloadTree);
        };

        const urlBase = this.singlePath || '';

        return {
            create: {
                label: Energine.translations.get('BTN_ADD'),
                action: openModal(node => `${urlBase}add/${node.id}/`),
            },
            edit: {
                label: Energine.translations.get('BTN_EDIT'),
                action: openModal(node => `${urlBase}${node.id}/edit/`),
            },
            delete: {
                label: Energine.translations.get('BTN_DELETE'),
                action: requestAndReload(node => `${urlBase}${node.id}/delete/`, {
                    confirmMessage: confirmDeleteMessage,
                }),
            },
            refresh: {
                separator_before: true,
                label: Energine.translations.get('BTN_REFRESH'),
                action: reloadTree,
            },
            up: {
                separator_before: true,
                label: Energine.translations.get('BTN_UP'),
                action: requestAndReload(node => `${urlBase}${node.id}/up/`),
            },
            down: {
                separator_before: true,
                label: Energine.translations.get('BTN_DOWN'),
                action: requestAndReload(node => `${urlBase}${node.id}/down/`),
            },
        };
    }

    _bindTreeEvents() {
        if (!this.jstree) return;

        this.jstree.on('select_node.jstree', (e, data) => this.onSelectNode?.(data.node));

        this.jstree.on('dblclick.jstree', '.jstree-anchor', (e) => {
            const node = this.jstree.jstree().get_node(e.target);
            this.go?.(node);
        });

        this.jstree.on('refresh.jstree', (event) => {
            const instance = $(event.currentTarget).jstree(true);
            const firstNodeId = instance.get_node('#')?.children?.[0];
            if (firstNodeId) {
                instance.open_node(firstNodeId);
            }
        });
    }
}

export { DivSidebar };
export default DivSidebar;
try {
    if (typeof registerEnergineBehavior === 'function') {
        registerEnergineBehavior('DivSidebar', DivSidebar);
    }
} catch (error) {
    if (Energine && typeof Energine.safeConsoleError === 'function') {
        Energine.safeConsoleError(error, '[DivSidebar] Failed to register behavior');
    } else if (typeof console !== 'undefined' && console.warn) {
        console.warn('[DivSidebar] Failed to register behavior', error);
    }
}
