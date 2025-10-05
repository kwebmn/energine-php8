import DivManager from './DivManager.js';

// DivTree.js

// Предполагаем, что DivManager уже определён как ES6-класс
// и что TreeView тоже — ES6 или совместимая конструкция.

export default class DivTree extends DivManager {
    /**
     * @param {Element|string} el The main holder element.
     */
    constructor(el, options = {}) {
        super(el, options); // Создаст дерево, this.tree, this.treeRoot и всё остальное

        this.langId = this.element.getAttribute('lang_id');
        this.singlePath = this.element.getAttribute('single_template');
        this.site = this.element.getAttribute('site');

        this.currentID = 0;

        var iframes = window.top.document.getElementsByTagName('iframe'),
            srcWindows = [window.top],
            result = false,
            i;

        for (i = 0; i < iframes.length; i++) {
            if (iframes[i].contentWindow) {
                srcWindows.push(iframes[i].contentWindow);
            }
        }

        for (i = 0; i < srcWindows.length; i++) {
            try {
                result = srcWindows[i].document.getElementById('smap_id');
                if (result) {

                    this.currentID = result.value;

                    break;
                }
            }
            catch (e) {

            }
        }

        this.jstree.jstree('select_node', this.currentID);

    }

    /**
     * Расширяет onSelectNode родителя.
     * @param {TreeView.Node} node
     */
    onSelectNode(node) {
        // Вызовем родительскую логику
        if (super.onSelectNode) {
            super.onSelectNode(node);
        }

        const btnSelect = this.toolbar?.getControlById?.('select');
        if (this.currentID) {
            if (this.currentID === node.id) {
                btnSelect?.disable();
            } else {
                const p = node.getParents?.() || [];
                if (p.length) {
                    for (const parent of p) {
                        if (parent.id === this.currentID) {
                            btnSelect?.disable();
                            return;
                        }
                    }
                }
                btnSelect?.enable();
            }
        } else {
            btnSelect?.enable();
        }
    }
}

if (typeof window !== 'undefined') {
    window.DivTree = DivTree;
}

// Если нужен экспорт как модуль:


// Для обратной совместимости (если нужно глобально)
window.DivTree = DivTree;
