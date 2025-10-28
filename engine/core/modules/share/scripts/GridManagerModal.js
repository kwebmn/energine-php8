import GridManager from './GridManager.js';
import ModalBoxModule from './ModalBox.js';
import { registerBehavior as registerEnergineBehavior } from './Energine.js';

const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

const getModalBox = () => ModalBoxModule || globalScope?.top?.ModalBox || globalScope?.ModalBox || null;

/**
 * Grid modal manager that wraps modal-specific actions for grid components.
 * @extends GridManager
 */
class GridManagerModal extends GridManager {
    /**
     * Overridden parent onDoubleClick handler.
     */
    onDoubleClick() {
        this.use();
    }

    /**
     * Return selected record and close modal.
     */
    use() {
        const modal = getModalBox();
        const grid = this.grid;

        if (!modal || !grid) {
            return;
        }

        modal.setReturnValue({
            key: typeof grid.getSelectedRecordKey === 'function' ? grid.getSelectedRecordKey() : null,
            dirty: Boolean(grid.isDirty)
        });
        modal.close();
    }

    /**
     * Close modal without selecting a record.
     */
    close() {
        const modal = getModalBox();
        const grid = this.grid;

        if (!modal || !grid) {
            return;
        }

        modal.setReturnValue({ dirty: Boolean(grid.isDirty) });
        modal.close();
    }
}

export { GridManagerModal };
export default GridManagerModal;
if (typeof registerEnergineBehavior === 'function') {
    registerEnergineBehavior('GridManagerModal', GridManagerModal);
}
