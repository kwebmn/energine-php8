document.addEventListener('DOMContentLoaded', () => {
    const requiredFieldSelector = '[data-role="form-field"][data-required="true"]';

    const markRequiredFields = (root = document) => {
        const scope = root instanceof Element ? root : document;
        scope.querySelectorAll(requiredFieldSelector).forEach((field) => {
            field.classList.add('required-field');
        });
    };

    markRequiredFields();

    if (typeof MutationObserver === 'function' && document.body) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (!(node instanceof Element)) {
                        return;
                    }

                    if (node.matches(requiredFieldSelector)) {
                        node.classList.add('required-field');
                    } else {
                        markRequiredFields(node);
                    }
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }
});
