class Testfeed {
    /**
     * @param {Element|string} element
     */
    constructor(element) {
        this.element = typeof element === 'string'
            ? document.querySelector(element) || document.getElementById(element)
            : element;
        this.singlePath = this.componentElement.getProperty('template');
    }
}