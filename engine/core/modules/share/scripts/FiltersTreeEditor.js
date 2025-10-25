import Energine from './Energine.js';
import ModalBox from './ModalBox.js';

const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

const $ = globalScope?.jQuery || globalScope?.$;

class FiltersTreeEditor {
    /**
     * @param {HTMLElement|string} element
     */
    constructor(element) {
        if (!$) {
            throw new Error('FiltersTreeEditor requires jQuery to be loaded globally.');
        }

        this.componentElement = (typeof element === 'string')
            ? document.querySelector(element)
            : element;

        if (!this.componentElement) {
            throw new Error('FiltersTreeEditor: component element was not found.');
        }

        const dataset = this.componentElement.dataset || {};
        this.singlePath = dataset.eSingleTemplate
            || this.componentElement.getAttribute?.('data-e-single-template')
            || '';

        this.translations = {
            add: dataset.eTxtAdd || this.componentElement.getAttribute?.('data-e-txt-add') || '',
            edit: dataset.eTxtEdit || this.componentElement.getAttribute?.('data-e-txt-edit') || '',
            delete: dataset.eTxtDelete || this.componentElement.getAttribute?.('data-e-txt-delete') || '',
            confirm: dataset.eTxtConfirm || this.componentElement.getAttribute?.('data-e-txt-confirm') || '',
            refresh: dataset.eTxtRefresh || this.componentElement.getAttribute?.('data-e-txt-refresh') || '',
            up: dataset.eTxtUp || this.componentElement.getAttribute?.('data-e-txt-up') || '',
            down: dataset.eTxtDown || this.componentElement.getAttribute?.('data-e-txt-down') || '',
        };

        this.treeElement = this.componentElement.querySelector('[data-role="filter-tree"]');
        if (!this.treeElement) {
            throw new Error('FiltersTreeEditor: tree container [data-role="filter-tree"] is required.');
        }

        this.$tree = $(this.treeElement);
        Energine.loadCSS('scripts/jstree/themes/default/style.css');
        this.initTree();
        this.initKeyboard();
    }

    moveUp(obj) {
        if (!obj) return;
        if (!this.$tree || !this.$tree.length) return;

        $.get(
            `${this.singlePath}${obj.id}/up/`,
            () => {
                this.$tree.jstree(true).load_node(obj.parent);
                setTimeout(() => {
                    this.$tree.jstree('deselect_all');
                    this.$tree.jstree('select_node', obj.id);
                }, 200);
            }
        );
    }

    moveDown(obj) {
        if (!obj) return;
        if (!this.$tree || !this.$tree.length) return;

        $.get(
            `${this.singlePath}${obj.id}/down/`,
            () => {
                this.$tree.jstree(true).load_node(obj.parent);
                setTimeout(() => {
                    this.$tree.jstree('deselect_all');
                    this.$tree.jstree('select_node', obj.id);
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
        if (!this.$tree || !this.$tree.length) {
            return;
        }

        this.$tree.jstree({
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
                            label: self.translations.add,
                            action: function(data) {
                                const inst = $.jstree.reference(data.reference);
                                const obj = inst.get_node(data.reference);
                                let url = (obj.id == '0')
                                    ? `${self.singlePath}add`
                                    : `${self.singlePath}${obj.id}/add`;
                                ModalBox.open({
                                    url,
                                    onClose: function() {
                                        self.$tree.jstree(true).load_node(obj.parent || '#');
                                        self.$tree.jstree('deselect_all');
                                    }
                                });
                            }
                        },
                        "edit": {
                            label: self.translations.edit,
                            action: function(data) {
                                const inst = $.jstree.reference(data.reference);
                                const obj = inst.get_node(data.reference);
                                ModalBox.open({
                                    url: `${self.singlePath}${obj.id}/edit/`,
                                    onClose: function() {
                                        self.$tree.jstree(true).load_node(obj.parent);
                                        self.$tree.jstree('deselect_all');
                                    }
                                });
                            }
                        },
                        "delete": {
                            label: self.translations.delete,
                            action: function(data) {
                                const inst = $.jstree.reference(data.reference);
                                const obj = inst.get_node(data.reference);
                                if (confirm(self.translations.confirm)) {
                                    $.get(
                                        `${self.singlePath}${obj.id}/delete/`,
                                        function() {
                                            self.$tree.jstree(true).load_node(obj.parent);
                                            self.$tree.jstree('deselect_all');
                                        }
                                    );
                                }
                            }
                        },
                        "refresh": {
                            separator_before: true,
                            label: self.translations.refresh,
                            action: function() {
                                self.$tree.jstree(true).load_node('#');
                                self.$tree.jstree('deselect_all');
                            }
                        },
                        "up": {
                            separator_before: true,
                            label: self.translations.up,
                            action: function(data) {
                                const inst = $.jstree.reference(data.reference);
                                const obj = inst.get_node(data.reference);
                                self.moveUp(obj);
                            }
                        },
                        "down": {
                            label: self.translations.down,
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

        this.$tree.on('check_node.jstree', (e, data) => {
            self.checkNode(data.node.id);
            self.$tree.jstree(true).check_node(data.node.parents);
        });

        this.$tree.on('uncheck_node.jstree', (e, data) => {
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
                    self.$tree.jstree(true).load_node(parentID);
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
                const obj = self.$tree.jstree('get_selected', true);
                if (obj && obj.length) self.moveUp(obj[0]);
            }
            // Minus key
            if (e.charCode === 45) {
                const obj = self.$tree.jstree('get_selected', true);
                if (obj && obj.length) self.moveDown(obj[0]);
            }
        });
    }
}

export { FiltersTreeEditor };
export default FiltersTreeEditor;

export function attachToWindow(target = globalScope) {
    if (!target) {
        return FiltersTreeEditor;
    }

    target.FiltersTreeEditor = FiltersTreeEditor;
    return FiltersTreeEditor;
}

attachToWindow();
