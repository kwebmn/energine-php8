class PageList extends EventTarget {
    /**
     * @param {Object} [options]
     */
    constructor(options = {}) {
        super();

        this.currentPage = 1;
        this.disabled = false;

        // Подключаем стили (если нужно)
        Energine.loadCSS('stylesheets/pagelist.css');

        // Основной элемент списка
        this.element = document.createElement('ul');
        this.element.className = 'e-pane-toolbar e-pagelist';
        this.element.setAttribute('unselectable', 'on');

        // Мержим опции (если есть)
        this.options = options;
    }

    getElement() {
        return this.element;
    }

    disable() {
        this.disabled = true;
        this.element.style.opacity = 0.25;
    }

    enable() {
        this.disabled = false;
        this.element.style.opacity = 1;
    }

    /**
     * Строит список страниц.
     * @param {number} numPages
     * @param {number} currentPage
     */
    build(numPages, currentPage) {
        this.currentPage = currentPage;
        this.clear();

        if (numPages <= 1) {
            if (this.element.parentNode) this.element.parentNode.removeChild(this.element);
            return;
        }

        const VISIBLE_PAGES_COUNT = 2;
        let startPage = (currentPage > VISIBLE_PAGES_COUNT) ? currentPage - VISIBLE_PAGES_COUNT : 1;
        let endPage = currentPage + VISIBLE_PAGES_COUNT;
        if (endPage > numPages) endPage = numPages;

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
        if (endPage < numPages) {
            if (endPage < (numPages - 1)) {
                if (endPage < (numPages - 2)) {
                    this._createPageLink('...').appendTo(this.element);
                }
                this._createPageLink(numPages - 1, numPages - 1).appendTo(this.element);
            }
            this._createPageLink(numPages, numPages).appendTo(this.element);
        }

        // выделяем текущую страницу
        const currentLi = this.element.querySelector(`li[data-index="${this.currentPage}"]`);
        if (currentLi) currentLi.classList.add('current');

        // Кнопки prev/next
        if (currentPage !== 1) {
            this._createPageLink('previous', currentPage - 1, 'fas fa-angle-left')
                .prependTo(this.element);
        }
        if (currentPage !== numPages) {
            this._createPageLink('next', currentPage + 1, 'fas fa-angle-right')
                .appendTo(this.element);
        }
    }

    selectPage(listItem) {

        const prevCurrent = this.element.querySelector('li.current');
        if (prevCurrent) prevCurrent.classList.remove('current');
        this.currentPage = parseInt(listItem.dataset.index, 10);
        listItem.classList.add('current');
        // Генерируем событие
        // this.dispatchEvent(new CustomEvent('pageSelect', { detail: this.currentPage }));
        this.options.onPageSelect();
    }

    selectPageByNum(num) {
        this.currentPage = num;
        // this.dispatchEvent(new CustomEvent('pageSelect', { detail: this.currentPage }));
        this.options.onPageSelect(num);
    }

    /**
     * Создать элемент пагинации для MDB-стиля.
     * @param {string} title - Текст или alt для иконки/страницы.
     * @param {number} index - Номер страницы (0 если нестраничный элемент).
     * @param {string} icon - FA/Material класс или пусто ('left'/'right'/... или свой).
     */
    _createPageLink(title, index = 0, icon = '') {
        const li = document.createElement('li');

        if (icon) {
            // --- Material Symbols ---
            // const span = document.createElement('span');
            // span.className = 'material-symbols-outlined page-link';
            // span.textContent = icon; // Пример: 'chevron_left'
            // li.appendChild(span);

            // --- Font Awesome ---
            const span = document.createElement('span');
            span.className = 'page-link';
            const i = document.createElement('i');
            i.className = icon; // Например: 'fas fa-angle-left'
            i.setAttribute('aria-label', title);
            span.appendChild(i);
            li.appendChild(span);

        } else {
            li.textContent = title;
        }

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
            li.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') li.click();
            });
        }

        li.appendTo = (parent) => { parent.appendChild(li); return li; };
        li.prependTo = (parent) => { parent.insertBefore(li, parent.firstChild); return li; };

        return li;
    }
    clear() {
        this.element.innerHTML = '';
    }

    // Подключение CSS
    }
