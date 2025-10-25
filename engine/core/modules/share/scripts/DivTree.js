import DivManager from './DivManager.js';

const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

class DivTree extends DivManager {
    /**
     * @param {Element|string} el The main holder element.
     */
    constructor(el) {
        super(el); // Создаст дерево, this.tree, this.treeRoot и всё остальное

        const dataset = this.element?.dataset || {};
        this.langId = dataset.eLangId || this.element.getAttribute('lang_id');
        this.singlePath = dataset.eSingleTemplate || this.element.getAttribute('single_template');
        this.site = dataset.eSite || this.element.getAttribute('site');

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

export { DivTree };
export default DivTree;

export function attachToWindow(target = globalScope) {
    if (!target) {
        return DivTree;
    }

    target.DivTree = DivTree;
    return DivTree;
}

attachToWindow();
