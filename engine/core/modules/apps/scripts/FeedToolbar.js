import Energine from '../../share/scripts/Energine.js';
import Toolbar from '../../share/scripts/Toolbar.js';
import ModalBox from '../../share/scripts/ModalBox.js';
import { request } from '../../share/scripts/energine-network.js';

const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

class FeedToolbar extends Toolbar {
    // Сохраняем request для совместимости
    static request = request;

    constructor(Container) {
        super('feed_toolbar');

        // Подключаем CSS динамически (эмуляция Asset.css)
        // FeedToolbar.loadCSS('stylesheets/pagetoolbar.css');
         FeedToolbar.loadCSS('stylesheets/feedtoolbar.css');

        this.bindTo = this.bindTo?.bind?.(this) || (() => {}); // если осталась поддержка bindTo
        this.bindTo(this);
        this.dock?.();

        // Вставляем элемент в .e-topframe (как inject)

        const html = document.documentElement;
        if (html.classList.contains('e-has-topframe1')) {
            html.classList.remove('e-has-topframe1');
            html.classList.add('e-has-topframe2');
        }
        if (html.classList.contains('e-has-topframe2')) {
            html.classList.remove('e-has-topframe2');
            html.classList.add('e-has-topframe3');
        }

        this.load(Container);
        this.singlePath = Container.getAttribute('single_template');
        const linkedToId = Container.getAttribute('linkedTo');
        const feedElement = linkedToId ? document.getElementById(linkedToId) : null;

        this.disableControls();

        if (feedElement) {
            this._prepareDataSet(feedElement);
            const current = feedElement.getProperty?.('current');
            if (this.selected = current) {
                this.enableControls('add', 'edit');
            } else {
                this.enableControls('add');
                this.selected = false;
            }
        }
        if (Container.dispose) Container.dispose();

        if (globalScope) {
            globalScope.feedToolbar = this;
        }
        this.container = Container;
        this.previous = false;

        if (this.element) {
            this.element.classList.add('mt-3', 'mt-lg-0', 'ms-0');
        }

        setTimeout(() => {
            if (!this.element) {
                return;
            }

            const topFrame = document.querySelector('.e-topframe');
            if (!topFrame) {
                return;
            }

            const collapse = topFrame.querySelector('.navbar-collapse');
            const navbarNav = topFrame.querySelector('.navbar-nav');
            const target = collapse || navbarNav || topFrame;

            if (!target.contains(this.element)) {
                target.appendChild(this.element);
            }

            if (collapse && !this.element.classList.contains('ms-lg-auto')) {
                this.element.classList.add('ms-lg-auto');
            }
        }, 100);


    }

    initializeFeedElements() {
        this.singlePath = this.container.getProperty('single_template');
        const linkedToId = this.container.getProperty('linkedTo');
        const feedElement = linkedToId ? document.getElementById(linkedToId) : null;
        this.disableControls();
        if (feedElement) {
            this._prepareDataSet(feedElement);
            const current = feedElement.getProperty?.('current');
            if (this.selected = current) {
                this.enableControls('add', 'edit');
            } else {
                this.enableControls('add');
                this.selected = false;
            }
        }
        if (this.container.dispose) this.container.dispose();
    }

    add() {
        ModalBox.open({
            url: this.singlePath + 'add/',
            onClose: (returnValue) => {
                if (returnValue === 'add') {
                    this.add();
                } else if (returnValue) {
                    this._reload(true);
                }
            }
        });
    }

    edit() {
        ModalBox.open({
            url: this.singlePath + this.selected + '/edit/',
            onClose: this._reload.bind(this)
        });
    }

    del() {
        const MSG_CONFIRM_DELETE = (Energine.translations?.get('MSG_CONFIRM_DELETE]')) || 'Do you really want to delete selected record?';
        if (globalScope?.confirm?.(MSG_CONFIRM_DELETE)) {
            request(this.singlePath + this.selected + '/delete/', null, this._reload.bind(this));
        }
    }

    up() {
        request(this.singlePath + this.selected + '/up/', null, this._aftermove.bind(this, 'up'));
    }

    down() {
        request(this.singlePath + this.selected + '/down/', null, this._aftermove.bind(this, 'down'));
    }

    _aftermove(direction) {
        try {
            if (direction === 'up') {
                const sibling = this.previous?.previousElementSibling;
                if (!sibling || !sibling.hasAttribute('record')) throw 'error';
                sibling.parentNode.insertBefore(this.previous, sibling);
            } else {
                const next = this.previous?.nextElementSibling;
                if (next) next.parentNode.insertBefore(this.previous, next.nextElementSibling);
            }
        } catch (err) {
            console.warn(err);
            this._reload(true);
        }
    }

    _select(element) {
        if (this.previous) this.previous.classList.remove('record_select');
        if (this.previous === element) {
            this.selected = this.previous = false;
            this.disableControls();
            this.enableControls('add');
        } else {
            this.previous = element;
            element.classList.add('record_select');
            this.selected = element.getAttribute('record');
            this.enableControls();
        }
    }

    _reload(data) {
        if (data) {
            const form = document.createElement('form');
            form.action = '';
            form.method = 'POST';
            const input = document.createElement('input');
            input.name = 'editMode';
            input.type = 'hidden';
            form.appendChild(input);
            document.body.appendChild(form);
            form.submit();
        }
    }

    _prepareDataSet(linkID) {
        const linkChilds = Array.from(linkID.querySelectorAll('[record]'));
        if (linkChilds.length) {
            linkID.classList.add('active_component');
            linkID.style.opacity = 0.7;
            linkChilds.forEach((element) => {
                element.addEventListener('mouseover', () => {
                    element.classList.add('record_highlight');
                });
                element.addEventListener('mouseout', () => {
                    element.classList.remove('record_highlight');
                });
                element.addEventListener('click', (e) => {
                    e.preventDefault();
                    this._select(element);
                });
            });
        }
    }

    // --- Вспомогательная функция для подключения CSS как Asset.css ---
    static loadCSS(href) {
        if (!document.querySelector(`link[href*="${href}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            document.head.appendChild(link);
        }
    }
}

export { FeedToolbar };
export default FeedToolbar;

export function attachToWindow(target = globalScope) {
    if (!target) {
        return FeedToolbar;
    }

    target.FeedToolbar = FeedToolbar;
    return FeedToolbar;
}

attachToWindow();
