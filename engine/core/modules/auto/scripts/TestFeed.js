const resolveElement = (element) => {
    if (typeof element === 'string') {
        return document.querySelector(element) || document.getElementById(element);
    }
    return element || null;
};

const readTemplateAttribute = (element, options = {}) => {
    if (!element) {
        return options.template || null;
    }
    if (options.template) {
        return options.template;
    }
    if (element.getAttribute) {
        return element.getAttribute('data-energine-param-template')
            || element.getAttribute('template')
            || null;
    }
    return null;
};

class TestFeed {
    constructor(element, options = {}) {
        this.element = resolveElement(element);
        this.componentElement = this.element;
        this.options = options;
        this.singlePath = readTemplateAttribute(this.element, options);
    }
}

if (typeof window !== 'undefined') {
    window.TestFeed = TestFeed;
}

export default TestFeed;
