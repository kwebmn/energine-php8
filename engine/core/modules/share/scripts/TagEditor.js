import GridManager from './GridManager.js';
import ModalBox from './ModalBox.js';
/**
 * Tag editor.
 * @extends GridManager
 */
class TagEditor extends GridManager {
    /**
     * @param {HTMLElement|string} element The main holder element.
     * @param {Object} [options]
     */
    constructor(element, options = {}) {
        super(element, options);
        /**
         * Tag id.
         * @type {string}
         */
        this.tag_id = this.element.getAttribute('tag_id');
    }

    /**
     * Overridden parent buildRequestURL method.
     * @param {number|string} pageNum Page number.
     * @returns {string}
     */
    buildRequestURL(pageNum) {
        let url = '';
        if (this.grid.sort.order) {
            url = `${this.singlePath}${this.tag_id}/get-data/${this.grid.sort.field}-${this.grid.sort.order}/page-${pageNum}`;
        } else {
            url = `${this.singlePath}${this.tag_id}/get-data/page-${pageNum}`;
        }
        return url;
    }

    /**
     * Overridden parent close action.
     */
    close() {
        // Use global loader and Energine.request; close modal even on error
        showLoader();

        Energine.request(
            `${this.singlePath}tags/get-tags/`,
            {
                json: 1,
                tag_id: this.tag_id
            },
            (data) => {
                hideLoader();
                try {
                    if (data && data.data && data.data.length) {
                        ModalBox.setReturnValue(data.data.join(','));
                    } else {
                        // Explicitly return empty value if nothing selected
                        ModalBox.setReturnValue('');
                    }
                } catch (e) {
                    // ignore and just close
                }
                ModalBox.close();
            },
            () => {
                // error or abort: just close to prevent being stuck
                hideLoader();
                ModalBox.close();
            },
            () => {
                hideLoader();
                ModalBox.close();
            }
        );
    }

    /**
     * Select action.
     */
    select() {
        const r = this.grid.getSelectedRecord();
        if (r) {
            this.tag_id = r.tag_id;
            this.close();
        }
    }

    /**
     * Overridden parent onDoubleClick event handler.
     */
    onDoubleClick() {
        this.select();
    }

    /**
     * Overridden parent onSelect event handler.
     */
    onSelect() {
        const r = this.grid.getSelectedRecord();
        this.toolbar.enableControls();
        const selectBtn = this.toolbar.getControlById('select');
        const addBtn = this.toolbar.getControlById('add');
        // Enable selection controls whenever a row is selected
        if (r) {
            if (addBtn) addBtn.enable(true);
            if (selectBtn) selectBtn.enable(true);
        }
    }
}

if (typeof window !== 'undefined') {
    window.TagEditor = TagEditor;
}

export default TagEditor;
