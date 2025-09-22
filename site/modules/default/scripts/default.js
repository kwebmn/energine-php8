'use strict';

document.addEventListener('DOMContentLoaded', () => {
    const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach((tooltipTriggerEl) => {
        new bootstrap.Tooltip(tooltipTriggerEl);
    });

    const popoverTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.forEach((popoverTriggerEl) => {
        new bootstrap.Popover(popoverTriggerEl);
    });

    const dropdownTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="dropdown"]'));
    dropdownTriggerList.forEach((dropdownTriggerEl) => {
        new bootstrap.Dropdown(dropdownTriggerEl);
    });
});
