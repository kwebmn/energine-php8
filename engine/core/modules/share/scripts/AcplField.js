/**
 * @file Contain the description of the next classes:
 * <ul>
 *     <li>[Words]{@link Words}</li>
 *     <li>[ActiveList]{@link ActiveList}</li>
 *     <li>[DropBoxList]{@link DropBoxList}</li>
 *     <li>[AcplField]{@link AcplField}</li>
 * </ul>
 *
 * @author Pavel Dubenko
 *
 * @version 1.0.1
 */

/**
 * Words — работа с разделёнными строками.
 */
class Words {
    /**
     * @param {string} initialValue — исходная строка
     * @param {string} sep — разделитель
     */
    constructor(initialValue, sep) {
        this.separator = sep;
        this._elements = initialValue.split(this.separator);
        this.currentIndex = 0;
    }

    /**
     * Установить текущий индекс слова
     * @param {number} index
     */
    setCurrentIndex(index) {
        if (this._elements[index]) {
            this.currentIndex = index;
        }
    }

    /**
     * Вернуть строку обратно через разделитель
     * @returns {string}
     */
    asString() {
        return this._elements.join(this.separator);
    }

    /**
     * Получить количество слов
     * @returns {number}
     */
    getLength() {
        return this._elements.length;
    }

    /**
     * Получить слово по индексу
     * @param {number} index
     * @returns {string}
     */
    getAt(index) {
        return (index < this._elements.length && index >= 0)
            ? this._elements[index]
            : '';
    }

    /**
     * Задать слово по индексу
     * @param {number} index
     * @param {string} value
     */
    setAt(index, value) {
        // index может быть строкой, поэтому приводим к числу
        this._elements[parseInt(index, 10)] = value;
    }

    /**
     * Найти слово по позиции курсора
     * @param {number} curPos
     * @returns {{index:number, str:string}}
     */
    findWord(curPos) {
        let leftMargin = 0, rightMargin = 0;
        for (let i = 0; i < this._elements.length; i++) {
            rightMargin = leftMargin + this._elements[i].length;
            if (curPos >= leftMargin && curPos <= rightMargin) {
                return {
                    index: i,
                    str: this._elements[i]
                };
            }
            leftMargin += this._elements[i].length + 1;
        }
        return {
            index: this._elements.length,
            str: ''
        };
    }
}

// Подключить acpl.css для списка (как раньше Asset.css('acpl.css'))
if (!document.querySelector('link[href$="acpl.css"]')) {
    const link = document.createElement('link');
    link.rel = "stylesheet";
    link.href = "stylesheets/acpl.css";
    document.head.appendChild(link);
}

/**
 * Класс активного списка с событиями.
 */
class ActiveList {
    /**
     * @param {HTMLElement|string} container — контейнер (DOM-элемент или id)
     */
    constructor(container) {
        this.active = false;
        this.selected = -1;

        // События — простая реализация, аналог MooTools.Events
        this._events = {};

        this.container = typeof container === 'string'
            ? document.getElementById(container)
            : container;
        this.container.classList.add('alist');
        this.container.tabIndex = 1;
        this.container.style.userSelect = 'none';

        // Первый ul внутри контейнера
        this.ul = this.container.querySelector('ul');
        if (!this.ul) {
            this.ul = document.createElement('ul');
            this.container.appendChild(this.ul);
        }
        this.items = Array.from(this.ul.children);
    }

    /**
     * Активация списка — обработчики мыши и клавиш.
     * @fires ActiveList#choose
     */
    activate() {
        this.items = Array.from(this.ul.children);
        this.active = true;

        this.selectItem();

        this._keypressHandler = this.keyPressed.bind(this);
        this.container.addEventListener('keydown', this._keypressHandler);

        this.items.forEach((item, idx) => {
            item.addEventListener('mouseover', () => {
                this.selectItem(idx);
            });
            item.addEventListener('click', () => {
                this._fireEvent('choose', this.items[this.selected]);
            });
        });
    }

    /**
     * Обработка клавиш (up/down/enter).
     * @param {KeyboardEvent} e
     * @fires ActiveList#choose
     */
    keyPressed(e) {
        switch (e.key) {
            case 'ArrowUp':
                this.selectItem(this.selected - 1);
                e.preventDefault();
                break;
            case 'ArrowDown':
                this.selectItem(this.selected + 1);
                e.preventDefault();
                break;
            case 'Enter':
                this._fireEvent('choose', this.items[this.selected]);
                e.stopPropagation();
                break;
        }
    }

    /**
     * Выбрать элемент по индексу.
     * @param {number} [id=0]
     */
    selectItem(id = 0) {
        const itemsLength = this.items.length;
        if (itemsLength === 0) return;

        if (id < 0) {
            id = itemsLength + id;
        } else if (id >= itemsLength) {
            id = id - itemsLength;
        }

        this.unselectItem(this.selected);

        if (this.items[id]) {
            this.items[id].classList.add('selected');
            this.selected = id;
            // Скроллинг, если список длиннее экрана
            // if (document.body.scrollHeight > window.innerHeight) {
            //     this.items[id].scrollIntoView({ block: "nearest", behavior: "smooth" });
            // }
        }
    }

    /**
     * Снять выделение с элемента по индексу.
     * @param {number} id
     */
    unselectItem(id) {
        if (this.items[id]) {
            this.items[id].classList.remove('selected');
        }
    }

    /**
     * Простая система событий (on/emit)
     */
    on(event, handler) {
        if (!this._events[event]) this._events[event] = [];
        this._events[event].push(handler);
    }
    off(event, handler) {
        if (!this._events[event]) return;
        this._events[event] = this._events[event].filter(fn => fn !== handler);
    }
    _fireEvent(event, ...args) {
        if (this._events[event]) {
            this._events[event].forEach(fn => fn.apply(this, args));
        }
    }
}

// Пример совместимости с MooTools-стилем:
window.ActiveList = ActiveList;

/**
 * Выпадающий список (drop box) — наследуется от ActiveList.
 */
class DropBoxList extends ActiveList {
    /**
     * @param {HTMLElement|string} input — элемент input для автокомплита
     */
    constructor(input) {
        // Основной контейнер — новый div с классом acpl_variants
        const container = document.createElement('div');
        container.className = 'acpl_variants';
        super(container);

        // Привязываем input
        this.input = (typeof input === 'string')
            ? document.getElementById(input)
            : input;

        // Прячем по дефолту
        this.hide();

        // Прячем дропбокс при потере фокуса инпутом
        this.input.addEventListener('blur', this.hide.bind(this));
    }

    /**
     * Открыт ли выпадающий список
     * @returns {boolean}
     */
    isOpen() {
        return !this.container.classList.contains('hidden');
    }

    /**
     * Получить контейнер списка
     * @returns {HTMLElement}
     */
    get() {
        return this.container;
    }

    /**
     * Показать выпадающий список и активировать обработчики
     */
    show() {
        this.container.classList.remove('hidden');
        // Установить ширину по input (минус border, если нужен)
        const inputRect = this.input.getBoundingClientRect();
        const computed = window.getComputedStyle(this.container);
        const borderLeft = parseInt(computed.borderLeftWidth, 10) || 0;
        const borderRight = parseInt(computed.borderRightWidth, 10) || 0;
        this.container.style.width = (inputRect.width - borderLeft - borderRight) + 'px';
        this.activate();
    }

    /**
     * Спрятать список
     */
    hide() {
        this.container.classList.add('hidden');
    }

    /**
     * Очистить список (удалить все li)
     */
    empty() {
        this.ul.innerHTML = '';
        this.items = [];
    }

    /**
     * Создать элемент списка (li)
     * @param {{value: string, key: string}} data
     * @returns {HTMLLIElement}
     */
    create(data) {
        const li = document.createElement('li');
        li.textContent = data.value;
        li.dataset.key = data.key;
        return li;
    }

    /**
     * Добавить элемент в ul
     * @param {HTMLLIElement} li
     */
    add(li) {
        this.ul.appendChild(li);
        this.items = Array.from(this.ul.children);
    }
}

// Для совместимости
window.DropBoxList = DropBoxList;

class AcplField {
    /**
     * @param {HTMLElement|string} element - основной input
     * @param {Object} [options]
     */
    constructor(element, options = {}) {
        // Подключаем стили
        AcplField.assetCss('stylesheets/acpl.css');

        // DOM
        this.element = (typeof element === 'string') ? document.getElementById(element) : element;
        this.options = Object.assign({ startFrom: 1 }, options);

        // Контейнер с .with_append
        const parent = this.element.parentNode;
        this.container = document.createElement('div');
        this.container.className = 'with_append';
        this.container.style.position = 'relative';
        if (parent) {
            parent.insertBefore(this.container, this.element);
        }
        this.container.appendChild(this.element);


        // Кнопка "..." для тегов
        if (this.element.name === 'tags') {
            this.button = document.createElement('button');
            this.button.type = 'button';
            this.button.setAttribute('link', 'tags');
            this.button.style.height = '18px';
            this.button.onclick = () => window[this.element.getAttribute('component_id')].openTagEditor(this.button);
            this.button.innerHTML = '...';

            const appendedBlock = document.createElement('div');
            appendedBlock.className = 'appended_block';
            appendedBlock.appendChild(this.button);

            // вставить appendedBlock после input (т.е. в .container)
            if (this.element.nextSibling) {
                this.container.insertBefore(appendedBlock, this.element.nextSibling);
            } else {
                this.container.appendChild(appendedBlock);
            }
        }
        // DropBoxList (должен быть глобально подключен)
        this.list = new DropBoxList(this.element);
        this.list.get().after(this.element);

        this.list.get().addEventListener('choose', (e) => this.select(e.detail));

        this.url = this.element.getAttribute('nrgn:url');
        this.separator = this.element.getAttribute('nrgn:separator');

        this.value = '';
        this.words = null;
        this.queue = [];

        // input keyup
        this.element.addEventListener('keyup', this.enter.bind(this));
    }

    static assetCss(file) {
        if (!document.querySelector(`link[href$="${file}"]`)) {
            let link = document.createElement('link');
            link.rel = "stylesheet";
            link.href = file;
            document.head.appendChild(link);
        }
    }

    enter(e) {
        if (!this.url) return;

        const val = this.element.value;

        switch (e.key) {
            case 'Escape':
                this.list.hide();
                this.list.empty();
                break;
            case 'ArrowUp':
            case 'ArrowDown':
            case 'Enter':
                this.list.keyPressed(e);
                break;
            default:
                this.value = val;
                this.words = new Words(this.value, this.separator);

                // Определяем позицию курсора в input
                let cursorPos = this.element.selectionStart || 0;
                let word = this.words.findWord(cursorPos);

                if (word.str.length > this.options.startFrom) {
                    this.words.setCurrentIndex(word.index);
                    this.putInQueue(word.str, this.value);
                }
        }
    }

    _prepareData(result) {
        this.setValues(result.data);
    }

    putInQueue(str, val) {
        if (this.value === val) {
            this.requestValues(str);
        }
    }

    requestValues(str) {
        fetch(this.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'value=' + encodeURIComponent(str)
        })
            .then(resp => resp.json())
            .then(data => this._prepareData(data));
    }

    setValues(data) {
        this.list.empty();
        if (data && data.length) {
            data.forEach(row => {
                this.list.add(this.list.create(row));
            });
            this.list.show();
        }
    }

    select(li) {
        const text = li.textContent;
        if (this.list.selected !== false && this.list.items[this.list.selected]) {
            this.words.setAt(this.words.currentIndex, text);
            this.element.value = this.words.asString();
        }
        this.list.hide();
    }
}

// Для совместимости:
window.AcplField = AcplField;
