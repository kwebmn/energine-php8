ScriptLoader.load('DivManager', 'jquery.min', 'jstree/jstree');

class DivSidebar extends DivManager {
    /**
     * @param {Element|string} element
     */
    constructor(element) {
        super(element); // Можно вызвать super(), затем переопределить специфичное

        // Переопределяем структуру дерева для сайдбара
        this.element = typeof element === 'string'
            ? document.querySelector(element) || document.getElementById(element)
            : element;

        this.langId = this.element.getAttribute('lang_id');
        this.singlePath = this.element.getAttribute('single_template');
        this.site = this.element.getAttribute('site');

        document.documentElement.classList.add('e-divtree-panel');


    }

    initManager() {
        Energine.loadCSS('stylesheets/div.css');
        Energine.loadCSS('scripts/jstree/themes/default/style.min.css');

        if (!this.element) throw new Error('DivManager: element not found');

        this.toolbar = null;
        this.tabPane = new TabPane(this.element);
        this.langId = this.element.getAttribute('lang_id');

        // --- Создание структуры дерева (div для jsTree) ---
        let treeContainer = document.getElementById('treeContainer') || document.querySelector('#treeContainer') || this.element;
        let divTree = treeContainer.querySelector('#divTree');
        if (!divTree) {
            divTree = document.createElement('div');
            divTree.id = 'divTree';
            treeContainer.appendChild(divTree);
        }

        this.singlePath = this.element.getAttribute('single_template');
        this.site = this.element.getAttribute('site');


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
                                ModalBox.open({
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
                                ModalBox.open({
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



        showLoader(document.getElementById('treeContainer'));
        this.loadTree();

        this.jstree.on('refresh.jstree', function(e, data) {
            // Получить id первого корневого узла
            var firstNode = $(this).jstree(true).get_node('#').children[0];
            if (firstNode) {
                $(this).jstree(true).open_node(firstNode);
            }
        });

        if (!document.querySelector('.e-singlemode-layout')) {
            window.addEventListener('resize', this.fitTreeFormSize.bind(this));
        }
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
}