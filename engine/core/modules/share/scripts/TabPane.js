const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

class TabPane {
    static count = 1;
    static assignID() {
        return this.count++;
    }

    constructor(element, options = {}) {
        // Динамически подключаем CSS (если нужно)
        this._events = {};
        this.setOptions(options);

        // Получаем корневой элемент
        this.element = typeof element === 'string' ? document.querySelector(element) : element;
        if (!this.element) {
            this.tabs = [];
            this.currentTab = null;
            return;
        }
        this.element.classList.add('d-flex', 'flex-column', 'h-100');

        // Ищем контейнер вкладок
        const tabsList = this.element.querySelector('[data-role="tabs"]');
        if (!tabsList) {
            this.tabs = [];
            this.currentTab = null;
            return;
        }

        tabsList.classList.add('nav', 'nav-tabs');
        tabsList.classList.remove('mb-3');
        tabsList.classList.add('mb-0');
        tabsList.setAttribute('role', 'tablist');

        const tabContent = this.element.querySelector('[data-role="tab-content"]');
        if (tabContent) {
            tabContent.classList.add('tab-content');
        }

        const bodyPart = this.element.querySelector('[data-pane-part="body"]');
        if (bodyPart) {
            bodyPart.classList.add('flex-grow-1', 'overflow-auto');
        }

        this.tabs = Array.from(tabsList.querySelectorAll('[data-role="tab"]'));
        const presetActiveTab = this.tabs.find(tab => {
            if (tab.classList.contains('current') || tab.classList.contains('active')) {
                return true;
            }
            const activeLink = tab.querySelector('[data-role="tab-link"]') || tab.querySelector('a');
            return !!(activeLink && activeLink.classList.contains('active'));
        });
        this.currentTab = presetActiveTab || this.tabs[0];

        this.tabs.forEach(tab => {
            tab.setAttribute('unselectable', 'on');
            tab.classList.add('nav-item');
            tab.setAttribute('role', 'presentation');

            // ensure legacy markup with preset "active" state does not keep multiple active tabs
            tab.classList.remove('current', 'active');

            const anchor = tab.querySelector('[data-role="tab-link"]') || tab.querySelector('a');
            if (!anchor) return;

            anchor.classList.remove('active');

            const href = anchor.getAttribute('href');
            const paneId = href.slice(href.lastIndexOf('#'));
            const paneName = paneId.replace('#', '');
            const anchorId = anchor.id || `${paneName || 'tab'}-link`;
            anchor.id = anchorId;
            anchor.classList.add('nav-link');
            anchor.setAttribute('role', 'tab');
            anchor.setAttribute('data-bs-toggle', 'tab');
            anchor.setAttribute('aria-controls', paneName);
            anchor.setAttribute('aria-selected', tab === this.currentTab ? 'true' : 'false');
            anchor.setAttribute('tabindex', tab === this.currentTab ? '0' : '-1');
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
                tab.pane.classList.add('tab-pane', 'fade', 'p-3');
                tab.pane.setAttribute('data-role', 'pane-item');
                tab.pane.classList.remove('show', 'active');
                tab.pane.setAttribute('role', 'tabpanel');
                tab.pane.setAttribute('aria-labelledby', anchorId);
                tab.pane.setAttribute('aria-hidden', 'true');
                tab.pane.tab = tab;
            }

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
            if (currentLink) {
                currentLink.classList.remove('active');
                currentLink.setAttribute('aria-selected', 'false');
                currentLink.setAttribute('tabindex', '-1');
            }
            if (this.currentTab.pane) {
                this.currentTab.pane.classList.remove('show', 'active');
                this.currentTab.pane.setAttribute('aria-hidden', 'true');
            }
        }

        tab.classList.add('current', 'active');
        const link = tab.querySelector('[data-role="tab-link"]') || tab.querySelector('a');
        if (link) {
            link.classList.add('active');
            link.setAttribute('aria-selected', 'true');
            link.setAttribute('tabindex', '0');
        }
        if (tab.pane) {
            tab.pane.classList.add('show', 'active');
            tab.pane.setAttribute('aria-hidden', 'false');
        }
        this.currentTab = tab;

        this.focusFirstControl(tab.pane);
    }

    getTabs() {
        return this.tabs;
    }
    getCurrentTab() {
        return this.currentTab;
    }

    focusFirstControl(pane) {
        if (!pane) return;

        const firstControl = pane.querySelector('.form-control');
        if (!firstControl || typeof firstControl.focus !== 'function') return;

        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(() => firstControl.focus());
        } else {
            firstControl.focus();
        }
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
        titleElement.id = `${tabID}-link`;
        titleElement.classList.add('nav-link');
        titleElement.setAttribute('data-role', 'tab-link');
        titleElement.setAttribute('role', 'tab');
        titleElement.setAttribute('data-bs-toggle', 'tab');
        titleElement.setAttribute('aria-controls', tabID);
        titleElement.setAttribute('aria-selected', 'false');
        titleElement.setAttribute('tabindex', '-1');

        const tabPane = document.createElement('div');
        tabPane.id = tabID;
        tabPane.className = 'tab-pane fade p-3';
        tabPane.setAttribute('data-role', 'pane-item');
        tabPane.classList.remove('show', 'active');
        tabPane.setAttribute('role', 'tabpanel');
        tabPane.setAttribute('aria-labelledby', titleElement.id);
        tabPane.setAttribute('aria-hidden', 'true');
        const paneContent = this.element.querySelector('[data-role="tab-content"]');
        if (paneContent) paneContent.appendChild(tabPane);

        const tabElement = document.createElement('li');
        tabElement.setAttribute('unselectable', 'on');
        tabElement.className = 'nav-item';
        tabElement.setAttribute('data-role', 'tab');
        tabElement.setAttribute('role', 'presentation');
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

export { TabPane };
export default TabPane;

export function attachToWindow(target = globalScope) {
    if (!target) {
        return TabPane;
    }

    target.TabPane = TabPane;
    return TabPane;
}

attachToWindow();
