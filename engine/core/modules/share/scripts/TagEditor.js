ScriptLoader.load('GridManager');
/**
 * Tag editor.
 * @extends GridManager
 */
class TagEditor extends GridManager {
    /**
     * @param {HTMLElement|string} element The main holder element.
     */
    constructor(element) {
        super(element);
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
        const overlay = this.overlay;
        overlay.show();

        fetch(this.singlePath + 'tags/get-tags/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                json: 1,
                tag_id: this.tag_id
            })
        })
            .then(response => response.json())
            .then(data => {
                overlay.hide();
                if (data && data.data && data.data.length) {
                    ModalBox.setReturnValue(data.data.join(','));
                } else {
                    ModalBox.setReturnValue('');
                }
                ModalBox.close();
            })
            .catch(() => {
                overlay.hide();
            });
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
        if (r && !this.tag_id) {
            if (addBtn) addBtn.enable(true);
            if (selectBtn) selectBtn.enable(true);
        }
    }
}