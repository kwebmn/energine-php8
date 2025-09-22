'use strict';

document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.bootstrap === 'undefined') {
        return;
    }

    const baseComponents = [
        { selector: '[data-bs-toggle="tooltip"]', constructor: window.bootstrap.Tooltip },
        { selector: '[data-bs-toggle="popover"]', constructor: window.bootstrap.Popover },
        { selector: '[data-bs-toggle="dropdown"]', constructor: window.bootstrap.Dropdown },
        { selector: '[data-bs-toggle="tab"]', constructor: window.bootstrap.Tab },
    ];

    baseComponents.forEach(({ selector, constructor }) => {
        document.querySelectorAll(selector).forEach((element) => {
            constructor.getOrCreateInstance(element);
        });
    });

    const initTargetComponent = (selector, constructor, options = {}) => {
        const initialized = new Set();

        document.querySelectorAll(selector).forEach((trigger) => {
            const targetSelector = trigger.getAttribute('data-bs-target') || trigger.getAttribute('href');

            if (!targetSelector) {
                return;
            }

            // Only support simple ID selectors (href="#target")
            const idMatch = targetSelector.match(/^#.+/);
            if (!idMatch) {
                return;
            }

            const targetId = idMatch[0];
            if (initialized.has(targetId)) {
                return;
            }

            const target = document.querySelector(targetId);
            if (!target) {
                return;
            }

            constructor.getOrCreateInstance(target, options);
            initialized.add(targetId);
        });
    };

    initTargetComponent('[data-bs-toggle="collapse"]', window.bootstrap.Collapse, { toggle: false });
    initTargetComponent('[data-bs-toggle="modal"]', window.bootstrap.Modal);
});
