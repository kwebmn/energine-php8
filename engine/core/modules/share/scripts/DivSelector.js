import DivManager from './DivManager.js';
import { registerBehavior as registerEnergineBehavior } from './Energine.js';

const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

const getJsTreeInstance = (jstree) => {
    if (!jstree || typeof jstree.jstree !== 'function') {
        return null;
    }

    try {
        return jstree.jstree(true);
    } catch (error) {
        return null;
    }
};

class DivSelector extends DivManager {
    constructor(element) {
        super(element);

        this.allowRootSelection = element?.dataset?.allowRootSelection === '1';
        this.selectOnDoubleClick = element?.dataset?.selectOnDoubleClick !== '0';

        const treeInstance = getJsTreeInstance(this.jstree);
        if (this.selectOnDoubleClick && treeInstance) {
            this.jstree.on('dblclick.jstree', '.jstree-anchor', (event) => {
                const node = treeInstance.get_node(event.target);
                if (!node || !node.id) {
                    return;
                }
                if (!treeInstance.is_selected(node.id)) {
                    treeInstance.deselect_all();
                    treeInstance.select_node(node.id);
                }
                this.select();
            });
        }
    }

    attachToolbar(toolbar) {
        super.attachToolbar(toolbar);

        if (!toolbar) {
            return;
        }

        const hideControl = (id) => {
            const control = toolbar.getControlById(id);
            if (!control) {
                return;
            }
            control.disable?.();
            if (control.element && control.element.classList) {
                control.element.classList.add('d-none');
            }
        };

        ['add', 'edit', 'delete', 'up', 'down'].forEach(hideControl);

        const selectControl = toolbar.getControlById('select');
        if (selectControl) {
            selectControl.disable();
        }
    }

    onSelectNode(node) {
        if (typeof super.onSelectNode === 'function') {
            super.onSelectNode(node);
        }

        const selectControl = this.toolbar?.getControlById?.('select');
        if (!selectControl) {
            return;
        }

        const selectable = this.isNodeSelectable(node);
        if (selectable) {
            selectControl.enable?.();
        } else {
            selectControl.disable?.();
        }
    }

    select() {
        const node = this.getSelectedNode();
        if (!this.isNodeSelectable(node)) {
            return;
        }
        super.select();
    }

    go(node) {
        if (!this.isNodeSelectable(node)) {
            return;
        }

        const nodeId = typeof node === 'object' ? node.id : node;
        const treeInstance = getJsTreeInstance(this.jstree);
        if (nodeId && treeInstance && !treeInstance.is_selected(nodeId)) {
            treeInstance.deselect_all();
            treeInstance.select_node(nodeId);
        }

        this.select();
    }

    isNodeSelectable(node) {
        if (!node) {
            return false;
        }

        const nodeId = typeof node === 'object' ? node.id : node;
        if (!nodeId || nodeId === '#') {
            return false;
        }

        if (this.allowRootSelection) {
            return true;
        }

        const parentId = typeof node === 'object' ? node.parent : null;
        return parentId && parentId !== '#';
    }
}

export { DivSelector };
export default DivSelector;

export function attachToWindow(target = globalScope) {
    if (!target) {
        return DivSelector;
    }

    target.DivSelector = DivSelector;
    return DivSelector;
}

attachToWindow();

if (typeof registerEnergineBehavior === 'function') {
    registerEnergineBehavior('DivSelector', DivSelector);
}
