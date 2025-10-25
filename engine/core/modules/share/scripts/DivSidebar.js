import Energine, { showLoader } from './Energine.js';
import DivManager from './DivManager.js';
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
        const dataset = this.element?.dataset || {};

        this.langId = dataset.eLangId || this.element.getAttribute('lang_id');

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

        this.singlePath = dataset.eSingleTemplate || this.element.getAttribute('single_template');
        this.site = dataset.eSite || this.element.getAttribute('site');


        // Energine.translations['BTN_ADD'] = 'test';
        // --- Инициализация jsTree (без данных) ---
        let urlSingle = this.singlePath;
        let tmpEl = this;
        this.jstree = $(divTree);
        this.jstree.jstree({
            plugins: ["contextmenu"],
            'core': { 'data': [] , 'multiple': false},
            contextmenu: {
                items: function (o, cb) {
                    return {
                        "create": {
                            label: Energine.translations.get('BTN_ADD'),
                            action: function(data) {
                                const inst = $.jstree.reference(data.reference);
                                const obj = inst.get_node(data.reference);
                                let url = urlSingle +  'add/' + obj.id + '/';
                                ModalBox?.open({
                                    url,
                                    onClose: function() {
                                        tmpEl.loadTree();
                                    }
                                });
                            }
                        },
                        "edit": {
                            label: Energine.translations.get('BTN_EDIT'),
                            action: function(data) {
                                const inst = $.jstree.reference(data.reference);
                                const obj = inst.get_node(data.reference);
                                let url = urlSingle +   obj.id + '/edit/';
                                ModalBox?.open({
                                    url,
                                    onClose: function() {
                                        tmpEl.loadTree();;
                                    }
                                });
                            }
                        },
                        "delete": {
                            label: Energine.translations.get('BTN_DELETE'),
                            action: function(data) {
                                const inst = $.jstree.reference(data.reference);
                                const obj = inst.get_node(data.reference);
                                if (confirm(Energine.translations.get('MSG_CONFIRM_DELETE'))) {
                                    $.get(
                                        urlSingle +   obj.id + '/delete/',
                                        function() {
                                            tmpEl.loadTree();;
                                        }
                                    );
                                }
                            }
                        },
                        "refresh": {
                            separator_before: true,
                            label: Energine.translations.get('BTN_REFRESH'),
                            action: function() {
                                tmpEl.loadTree();
                            }
                        },
                        "up": {
                            separator_before: true,
                            label: Energine.translations.get('BTN_UP'),
                            action: function(data) {
                                const inst = $.jstree.reference(data.reference);
                                const obj = inst.get_node(data.reference);
                                $.get(
                                    urlSingle +   obj.id + '/up/',
                                    function() {
                                        tmpEl.loadTree();;
                                    }
                                );
                            }
                        },
                        "down": {
                            separator_before: true,
                            label: Energine.translations.get('BTN_DOWN'),
                            action: function(data) {
                                const inst = $.jstree.reference(data.reference);
                                const obj = inst.get_node(data.reference);
                                $.get(
                                    urlSingle +   obj.id + '/down/',
                                    function() {
                                        tmpEl.loadTree();;
                                    }
                                );
                            }
                        },


                    };
                }
            },

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
        let sibling = this.element.nextElementSibling;
        while (sibling) {
            const next = sibling.nextElementSibling;
            if (sibling.matches && sibling.matches('[data-role="pane"]')) {
                panesToMove.push(sibling);
            }
            sibling = next;
        }

        panesToMove.forEach(node => this.contentPanel.appendChild(node));

        if (this.contentPanel.children.length === 0) {
            this.contentPanel.classList.add('d-none');
        } else {
            this.contentPanel.classList.remove('d-none');
            this.contentPanel.classList.add('flex-grow-1');
        }
    }
}

export { DivSidebar };
export default DivSidebar;

export function attachToWindow(target = globalScope) {
    if (!target) {
        return DivSidebar;
    }

    target.DivSidebar = DivSidebar;
    return DivSidebar;
}

attachToWindow();
