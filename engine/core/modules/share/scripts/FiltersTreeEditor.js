import ModalBox from './ModalBox.js';

export default class FiltersTreeEditor {
    /**
     * @param {HTMLElement|string} element
     * @param {Object} [options]
     */
    constructor(element, options = {}) {
        this.componentElement = (typeof element === 'string')
            ? document.querySelector(element)
            : element;
        this.options = options;
        this.singlePath = this.componentElement.getAttribute('single-template');
        Energine.loadCSS('scripts/jstree/themes/default/style.css');
        this.initTree();
        this.initKeyboard();
    }

    moveUp(obj) {
        if (!obj) return;
        $.get(
            `${this.singlePath}${obj.id}/up/`,
            () => {
                $('#filter-tree').jstree(true).load_node(obj.parent);
                setTimeout(() => {
                    $('#filter-tree').jstree("deselect_all");
                    $('#filter-tree').jstree('select_node', obj.id);
                }, 200);
            }
        );
    }

    moveDown(obj) {
        if (!obj) return;
        $.get(
            `${this.singlePath}${obj.id}/down/`,
            () => {
                $('#filter-tree').jstree(true).load_node(obj.parent);
                setTimeout(() => {
                    $('#filter-tree').jstree("deselect_all");
                    $('#filter-tree').jstree('select_node', obj.id);
                }, 200);
            }
        );
    }

    checkNode(id) {
        $.post(
            `${this.singlePath}select`,
            { id },
            function() {},
            'json'
        );
    }

    uncheckNode(id) {
        $.post(
            `${this.singlePath}deselect`,
            { id },
            function() {},
            'json'
        );
    }

    initTree() {
        const self = this;
        $('#filter-tree').jstree({
            plugins: [ "checkbox", "contextmenu", "dnd" ],
            core: {
                expand_selected_onload: false,
                data: {
                    url: `${self.singlePath}get-tree/`,
                    dataType: 'json',
                    data: node => ({ id: node.id })
                },
                multiple: false,
                check_callback: function (op, node, par, pos, more) {
                    if (more && more.dnd) {
                        return more.pos !== "i";
                    }
                    return true;
                }
            },
            contextmenu: {
                items: function (o, cb) {
                    return {
                        "create": {
                            label: self.componentElement.getAttribute('txt_add'),
                            action: function(data) {
                                const inst = $.jstree.reference(data.reference);
                                const obj = inst.get_node(data.reference);
                                let url = (obj.id == '0')
                                    ? `${self.singlePath}add`
                                    : `${self.singlePath}${obj.id}/add`;
                                ModalBox.open({
                                    url,
                                    onClose: function() {
                                        $('#filter-tree').jstree(true).load_node(obj.parent || '#');
                                        $('#filter-tree').jstree("deselect_all");
                                    }
                                });
                            }
                        },
                        "edit": {
                            label: self.componentElement.getAttribute('txt_edit'),
                            action: function(data) {
                                const inst = $.jstree.reference(data.reference);
                                const obj = inst.get_node(data.reference);
                                ModalBox.open({
                                    url: `${self.singlePath}${obj.id}/edit/`,
                                    onClose: function() {
                                        $('#filter-tree').jstree(true).load_node(obj.parent);
                                        $('#filter-tree').jstree("deselect_all");
                                    }
                                });
                            }
                        },
                        "delete": {
                            label: self.componentElement.getAttribute('txt_delete'),
                            action: function(data) {
                                const inst = $.jstree.reference(data.reference);
                                const obj = inst.get_node(data.reference);
                                if (confirm(self.componentElement.getAttribute('txt_confirm'))) {
                                    $.get(
                                        `${self.singlePath}${obj.id}/delete/`,
                                        function() {
                                            $('#filter-tree').jstree(true).load_node(obj.parent);
                                            $('#filter-tree').jstree("deselect_all");
                                        }
                                    );
                                }
                            }
                        },
                        "refresh": {
                            separator_before: true,
                            label: self.componentElement.getAttribute('txt_refresh'),
                            action: function() {
                                $('#filter-tree').jstree(true).load_node('#');
                                $('#filter-tree').jstree("deselect_all");
                            }
                        },
                        "up": {
                            separator_before: true,
                            label: self.componentElement.getAttribute('txt_up'),
                            action: function(data) {
                                const inst = $.jstree.reference(data.reference);
                                const obj = inst.get_node(data.reference);
                                self.moveUp(obj);
                            }
                        },
                        "down": {
                            label: self.componentElement.getAttribute('txt_down'),
                            action: function(data) {
                                const inst = $.jstree.reference(data.reference);
                                const obj = inst.get_node(data.reference);
                                self.moveDown(obj);
                            }
                        }
                    };
                }
            },
            checkbox: {
                three_state: false,
                whole_node: false,
                tie_selection: false,
                undetermined: true
            }
        });

        $('#filter-tree').on('check_node.jstree', (e, data) => {
            self.checkNode(data.node.id);
            $('#filter-tree').jstree(true).check_node(data.node.parents);
        });

        $('#filter-tree').on('uncheck_node.jstree', (e, data) => {
            self.uncheckNode(data.node.id);
        });

        // dnd (drag-n-drop)
        $(document).on('dnd_stop.vakata', function (e, data) {
            const t = $(data.event.target);
            const targetnode = t.closest('.jstree-node').attr('id');
            const targetNodeID = targetnode;
            const nodeID = data.data.nodes[0];
            const parentID = $('#' + nodeID).parents('li:first').attr('id');
            $.get(
                `${self.singlePath}move/${nodeID}/above/${targetNodeID}/?json`,
                function() {
                    $('#filter-tree').jstree(true).load_node(parentID);
                },
                'json'
            );
        });
    }

    initKeyboard() {
        const self = this;
        $(document).keypress(function(e) {
            // Plus or = key
            if (e.charCode === 61 || e.charCode === 43) {
                const obj = $('#filter-tree').jstree('get_selected', true);
                if (obj && obj.length) self.moveUp(obj[0]);
            }
            // Minus key
            if (e.charCode === 45) {
                const obj = $('#filter-tree').jstree('get_selected', true);
                if (obj && obj.length) self.moveDown(obj[0]);
            }
        });
    }
}

if (typeof window !== 'undefined') {
    window.FiltersTreeEditor = FiltersTreeEditor;
}

// Пример создания экземпляра
// new FiltersTreeEditor(document.getElementById('your-element-id'));
