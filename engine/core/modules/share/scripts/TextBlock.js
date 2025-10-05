class TextBlock {
    constructor(element, options = {}) {
        this.element = typeof element === 'string'
            ? document.querySelector(element) || document.getElementById(element)
            : element || null;
        this.options = options;
        this.toolbar = null;
    }

    getElement() {
        return this.element;
    }

    attachToolbar(toolbar) {
        this.toolbar = toolbar;
        return this;
    }
}

if (typeof window !== 'undefined') {
    window.TextBlock = TextBlock;
}

export default TextBlock;
