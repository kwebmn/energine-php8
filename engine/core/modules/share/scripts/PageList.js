class PageList extends EventTarget {
    /**
     * @param {Object} [options]
     */
    constructor(options = {}) {
        super();

        this.currentPage = 1;
        this.disabled = false;

        // Контейнер постраничной навигации
        this.container = document.createElement('div');
        this.container.className = 'grid-pagination d-flex flex-wrap align-items-center justify-content-between gap-3 w-100';
        this.container.setAttribute('data-role', 'grid-pager');
        this.container.setAttribute('unselectable', 'on');

        // Основной элемент списка страниц
        this.element = document.createElement('ul');
        this.element.className = 'pagination pagination-sm mb-0 flex-wrap gap-2';
        this.element.setAttribute('data-role', 'page-list');
        this.container.appendChild(this.element);

        // Элемент с информацией о количестве записей
        this.summaryElement = document.createElement('span');
        this.summaryElement.className = 'page-summary text-muted small d-none';
        this.summaryElement.setAttribute('data-role', 'page-summary');
        this.container.appendChild(this.summaryElement);

        // Мержим опции (если есть)
        this.options = Object.assign({ onPageSelect: null }, options);
    }

    getElement() {
        return this.container;
    }

    disable() {
        this.disabled = true;
        this.container.classList.add('disabled');
        this.container.style.pointerEvents = 'none';
        this.container.style.opacity = 0.5;
    }

    enable() {
        this.disabled = false;
        this.container.classList.remove('disabled');
        this.container.style.pointerEvents = '';
        this.container.style.opacity = 1;
    }

    /**
     * Строит список страниц.
     * @param {number} numPages
     * @param {number} currentPage
     */
    build(numPages, currentPage, recordSummary = '') {
        const totalPages = parseInt(numPages, 10) || 0;
        this.currentPage = parseInt(currentPage, 10) || 1;
        this.clear();

        this.updateSummary(recordSummary);

        if (totalPages <= 1) {
            this.element.classList.add('d-none');
            return;
        }

        this.element.classList.remove('d-none');

        const VISIBLE_PAGES_COUNT = 2;
        let startPage = (this.currentPage > VISIBLE_PAGES_COUNT) ? this.currentPage - VISIBLE_PAGES_COUNT : 1;
        let endPage = this.currentPage + VISIBLE_PAGES_COUNT;
        if (endPage > totalPages) endPage = totalPages;

        // Первые страницы (1 ... 2 ...)
        if (startPage > 1) {
            this._createPageLink(1, 1).appendTo(this.element);
            if (startPage > 2) {
                this._createPageLink(2, 2).appendTo(this.element);
                if (startPage > 3) {
                    this._createPageLink('...').appendTo(this.element);
                }
            }
        }

        // Основной диапазон
        for (let i = startPage; i <= endPage; i++) {
            this._createPageLink(i, i).appendTo(this.element);
        }

        // Последние страницы (... N-1 N)
        if (endPage < totalPages) {
            if (endPage < (totalPages - 1)) {
                if (endPage < (totalPages - 2)) {
                    this._createPageLink('...').appendTo(this.element);
                }
                this._createPageLink(totalPages - 1, totalPages - 1).appendTo(this.element);
            }
            this._createPageLink(totalPages, totalPages).appendTo(this.element);
        }

        // выделяем текущую страницу
        const currentLi = this.element.querySelector(`li[data-index="${this.currentPage}"]`);
        if (currentLi) {
            currentLi.classList.add('current', 'active');
            const link = currentLi.querySelector('.page-link');
            if (link) link.setAttribute('aria-current', 'page');
        }

        // Кнопки prev/next
        if (this.currentPage !== 1) {
            this._createPageLink('previous', this.currentPage - 1, 'fas fa-angle-left')
                .prependTo(this.element);
        }
        if (this.currentPage !== totalPages) {
            this._createPageLink('next', this.currentPage + 1, 'fas fa-angle-right')
                .appendTo(this.element);
        }
    }

    selectPage(listItem) {

        const prevCurrent = this.element.querySelector('li.current');
        if (prevCurrent) {
            prevCurrent.classList.remove('current', 'active');
            const prevLink = prevCurrent.querySelector('.page-link');
            if (prevLink) prevLink.removeAttribute('aria-current');
        }
        this.currentPage = parseInt(listItem.dataset.index, 10);
        listItem.classList.add('current', 'active');
        const link = listItem.querySelector('.page-link');
        if (link) link.setAttribute('aria-current', 'page');
        // Генерируем событие
        // this.dispatchEvent(new CustomEvent('pageSelect', { detail: this.currentPage }));
        Energine.utils.safeCall(this.options.onPageSelect, [this.currentPage], this);
    }

    selectPageByNum(num) {
        this.currentPage = num;
        // this.dispatchEvent(new CustomEvent('pageSelect', { detail: this.currentPage }));
        Energine.utils.safeCall(this.options.onPageSelect, [num], this);
    }

    /**
     * Создать элемент пагинации для MDB-стиля.
     * @param {string} title - Текст или alt для иконки/страницы.
     * @param {number} index - Номер страницы (0 если нестраничный элемент).
     * @param {string} icon - FA/Material класс или пусто ('left'/'right'/... или свой).
     */
    _createPageLink(title, index = 0, icon = '') {
        const li = document.createElement('li');
        li.className = 'page-item';

        const link = document.createElement('a');
        link.className = 'page-link';
        link.href = '#';

        if (icon) {
            const iconElement = document.createElement('i');
            iconElement.className = icon;
            iconElement.setAttribute('aria-label', title);
            link.appendChild(iconElement);
        } else {
            link.textContent = title;
        }

        li.appendChild(link);

        if (index) {
            li.setAttribute('data-index', index);
            li.tabIndex = 0; // Для доступности

            li.addEventListener('mouseover', () => {
                if (!this.disabled) li.classList.add('highlighted');
            });
            li.addEventListener('mouseout', () => {
                li.classList.remove('highlighted');
            });
            li.addEventListener('click', () => {
                if (!this.disabled && String(li.dataset.index) !== String(this.currentPage)) {
                    this.selectPage(li);
                }
            });
            link.addEventListener('click', (event) => {
                event.preventDefault();
                if (!this.disabled && String(li.dataset.index) !== String(this.currentPage)) {
                    this.selectPage(li);
                }
            });
            li.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') li.click();
            });
        } else {
            li.classList.add('disabled');
            link.setAttribute('tabindex', '-1');
            link.setAttribute('aria-disabled', 'true');
        }

        li.appendTo = (parent) => { parent.appendChild(li); return li; };
        li.prependTo = (parent) => { parent.insertBefore(li, parent.firstChild); return li; };

        return li;
    }
    clear() {
        this.element.innerHTML = '';
        this.element.classList.add('d-none');
        this.updateSummary('');
    }

    updateSummary(text) {
        if (!this.summaryElement) {
            return;
        }
        const normalized = (text !== null && text !== undefined) ? String(text).trim() : '';
        if (normalized) {
            this.summaryElement.textContent = normalized;
            this.summaryElement.classList.remove('d-none');
        } else {
            this.summaryElement.textContent = '';
            this.summaryElement.classList.add('d-none');
        }
    }

    // Подключение CSS
    }
