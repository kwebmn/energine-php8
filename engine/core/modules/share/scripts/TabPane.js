class TabPane {
    static count = 1;
    static assignID() {
        return this.count++;
    }

    constructor(element, options = {}) {
        // Динамически подключаем CSS (если нужно)
        Energine.loadCSS('stylesheets/tabpane.css');
        this._events = {};
        this.setOptions(options);

        // Получаем корневой элемент
        this.element = typeof element === 'string' ? document.querySelector(element) : element;
        if (!this.element) {
            this.tabs = [];
            this.currentTab = null;
            return;
        }

        // Ищем контейнер вкладок
        const tabsList = this.element.querySelector('[data-role="tabs"]');
        if (!tabsList) {
            this.tabs = [];
            this.currentTab = null;
            return;
        }

        this.tabs = Array.from(tabsList.querySelectorAll('[data-role="tab"]'));
        this.currentTab = this.tabs[0];

        this.tabs.forEach(tab => {
            tab.setAttribute('unselectable', 'on');
            const anchor = tab.querySelector('[data-role="tab-link"]') || tab.querySelector('a');
            if (!anchor) return;

            const href = anchor.getAttribute('href');
            const paneId = href.slice(href.lastIndexOf('#'));
            anchor.addEventListener('click', (event) => {
                event.preventDefault();
                tab.blur && tab.blur();
            });

            // --- Поддержка старого и нового формата данных ---
            const tabData = tab.querySelector('[data-role="tab-meta"]');
            tab.data = tabData ? TabPane.safeJsonParse(tabData.textContent.trim()) : {};

            // --- Привязка панели к вкладке ---
            tab.pane = this.element.querySelector(`div${paneId}`);
            if (tab.pane) {
                tab.pane.classList.add('tab-pane');
                tab.pane.setAttribute('data-role', 'pane-item');
                tab.pane.classList.remove('show', 'active');
                tab.pane.tab = tab;
            }

            // --- События на вкладках ---
            tab.addEventListener('mouseover', () => {
                if (tab !== this.currentTab) tab.classList.add('highlighted');
            });
            tab.addEventListener('mouseout', () => {
                tab.classList.remove('highlighted');
            });
            tab.addEventListener('click', () => {
                if (tab !== this.currentTab && !tab.classList.contains('disabled')) {
                    this.show(tab);
                }
            });
        });

        if (this.currentTab) {
            this.selectTab(this.currentTab);
        }
    }

    // MooTools Events совместимость
    setOptions(options = {}) {
        this._options = options;
        if (options.onTabChange) this.addEvent('tabChange', options.onTabChange);

        return this;
    }
    addEvent(event, handler) {
        if (!this._events[event]) this._events[event] = [];
        this._events[event].push(handler);
    }
    fireEvent(event, data) {
        (this._events[event] || []).forEach(fn => fn.call(this, data));
    }

    show(tab) {
        this.selectTab(tab);
        this.fireEvent('tabChange', this.currentTab);
    }

    selectTab(tab) {
        if (!tab || !tab.pane) return;

        if (this.currentTab) {
            this.currentTab.classList.remove('current', 'active');
            const currentLink = this.currentTab.querySelector('[data-role="tab-link"]') || this.currentTab.querySelector('a');
            if (currentLink) currentLink.classList.remove('active');
            if (this.currentTab.pane) {
                this.currentTab.pane.classList.remove('show', 'active');
            }
        }

        tab.classList.add('current', 'active');
        const link = tab.querySelector('[data-role="tab-link"]') || tab.querySelector('a');
        if (link) link.classList.add('active');
        tab.pane.classList.add('show', 'active');
        this.currentTab = tab;

        // Фокус на первый input/textarea (если есть)
        const inp = tab.pane.querySelector('div.field div.control input[type=text]')
            || tab.pane.querySelector('div.field div.control textarea');
        if (inp) inp.focus();
    }

    getTabs() {
        return this.tabs;
    }
    getCurrentTab() {
        return this.currentTab;
    }

    setTabTitle(title, tab) {
        tab = tab || this.getCurrentTab();
        const a = tab.querySelector('[data-role="tab-link"]') || tab.querySelector('a');
        if (a) a.innerHTML = title;
    }

    createNewTab(tabTitle) {
        const tabID = 'id' + TabPane.assignID();

        const titleElement = document.createElement('a');
        titleElement.setAttribute('href', '#' + tabID);
        titleElement.innerHTML = tabTitle;

        const tabPane = document.createElement('div');
        tabPane.id = tabID;
        tabPane.className = 'tab-pane';
        tabPane.setAttribute('data-role', 'pane-item');
        tabPane.classList.remove('show', 'active');
        const paneContent = this.element.querySelector('[data-role="tab-content"]');
        paneContent.appendChild(tabPane);

        const tabElement = document.createElement('li');
        tabElement.setAttribute('unselectable', 'on');
        tabElement.className = 'nav-item';
        tabElement.setAttribute('data-role', 'tab');
        titleElement.classList.add('nav-link');
        titleElement.setAttribute('data-role', 'tab-link');
        tabElement.appendChild(titleElement);

        const tabsList = this.element.querySelector('[data-role="tabs"]');
        tabsList.appendChild(tabElement);
        this.tabs.push(tabElement);

        titleElement.addEventListener('click', (event) => {
            event.preventDefault();
            tabElement.blur && tabElement.blur();
        });

        tabElement.pane = tabPane;
        tabPane.tab = tabElement;

        tabElement.addEventListener('mouseover', function() {
            if (tabElement !== this.currentTab) tabElement.classList.add('highlighted');
        }.bind(this));
        tabElement.addEventListener('mouseout', function() {
            tabElement.classList.remove('highlighted');
        });
        tabElement.addEventListener('click', function() {
            if (tabElement !== this.currentTab) this.show(tabElement);
        }.bind(this));

        return tabElement;
    }

    whereIs(element) {
        let el = typeof element === 'string' ? document.querySelector(element) : element;
        while (el = el.parentElement) {
            if (el?.getAttribute('data-role') === 'pane-item' && el.tab) {
                return el.tab;
            }
        }
        return null;
    }

    enableTab(tabIndex) {
        if (this.tabs[tabIndex]) {
            this.tabs[tabIndex].classList.remove('disabled');
        }
    }
    disableTab(tabIndex) {
        if (this.tabs[tabIndex]) {
            this.tabs[tabIndex].classList.add('disabled');
        }
    }

    // --- Грубый парсер для поддержки { lang: 5 } -> {"lang":5}
    static safeJsonParse(text) {
        if (!text) return {};
        try {
            return JSON.parse(text);
        } catch (e) {
            // Приводим к JSON-формату из { lang: 5 } в {"lang":5}
            let fixed = text.replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');
            try {
                return JSON.parse(fixed);
            } catch {
                return {};
            }
        }
    }

    // --- Динамически подгружаем CSS только один раз
    static _loadCSS(href) {
        if (document.querySelector(`link[data-tabpane="${href}"]`)) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.dataset.tabpane = href;
        document.head.appendChild(link);
    }
}