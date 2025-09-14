ScriptLoader.load('Toolbar', 'ModalBox', 'Cookie');

class PageToolbar extends Toolbar {
    constructor(componentPath, documentId, toolbarName, controlsDesc = [], props = {}) {
        super(toolbarName, props);

        Energine.loadCSS('stylesheets/pagetoolbar.css');
        this.componentPath = componentPath;
        this.documentId = documentId;
        this.layoutManager = null;

        this.dock();
        this.bindTo(this);

        if (controlsDesc && Array.isArray(controlsDesc)) {
            controlsDesc.forEach(control => this.appendControl(control));
        }

        this.setupLayout();

        // Подписка на oneditmodeunpressed
        window.addEventListener('oneditmodeunpressed', () => {

            if (window.nrgPageEditor) {
                if (confirm(Energine.translations.get('TXT_ARE_YOU_SURE_SAVE'))) {
                    if (window.nrgPageEditor.editors && window.nrgPageEditor.editors.length) {
                        window.nrgPageEditor.editors.forEach(editor => editor.save.call(editor, false));
                    }
                    setTimeout(
                        function()
                        {
                            window.location.href = window.location.href;
                        },
                        1000
                    );
                }
                else
                {
                    window.location = window.location;
                }
            }
            else
            {
                window.location = window.location;
            }

        });
    }

    static _addClass(el, cls) { el.classList.add(cls); }
    static _removeClass(el, cls) { el.classList.remove(cls); }
    static _hasClass(el, cls) { return el.classList.contains(cls); }
    static _toggleClass(el, cls) { el.classList.toggle(cls); }
    static _setProperties(el, props) {
        Object.entries(props).forEach(([k, v]) => el.setAttribute(k, v));
    }
    static _setStyle(el, prop, val) { el.style[prop] = val; }
    static _setStyles(el, styles) { Object.entries(styles).forEach(([k, v]) => el.style[k] = v); }

    // ===== Основная логика =====

    setupLayout() {
        function getCookie(name) {
            let match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[]\/+^])/g, '\\$1') + '=([^;]*)'));
            return match ? decodeURIComponent(match[1]) : undefined;
        }

        const html = document.documentElement;
        if (!PageToolbar._hasClass(html, 'e-has-topframe1')) {
            PageToolbar._addClass(html, 'e-has-topframe1');
        }

        // Основные контейнеры
        const mainFrame = document.createElement('div');
        PageToolbar._addClass(mainFrame, 'e-mainframe');
        const topFrame = document.createElement('div');
        PageToolbar._addClass(topFrame, 'e-topframe');

        // Перенос body-children (кроме svg и e-overlay)
        const toMove = Array.from(document.body.childNodes).filter(el =>
            el.nodeType === 1 && !((el.tagName.toLowerCase() !== 'svg') && PageToolbar._hasClass(el, 'e-overlay'))
        );
        document.body.appendChild(topFrame);
        document.body.appendChild(mainFrame);
        toMove.forEach(child => mainFrame.appendChild(child));
        topFrame.appendChild(this.element);

        // Логотип/иконка
        const gear = document.createElement('img');
        gear.src = window.Energine.static + (window.Energine.debug ? 'images/toolbar/nrgnptbdbg.png' : 'images/toolbar/nrgnptb.png');
        PageToolbar._addClass(gear, 'pagetb_logo');
        topFrame.insertBefore(gear, topFrame.firstChild);

        // Боковая панель (sidebar)
        if (!this.properties['noSideFrame']) {
            if (getCookie('sidebar') == 1) {
                PageToolbar._addClass(html, 'e-has-sideframe');
            }
            const sidebarFrame = document.createElement('div');
            PageToolbar._addClass(sidebarFrame, 'e-sideframe');
            const sidebarFrameContent = document.createElement('div');
            PageToolbar._addClass(sidebarFrameContent, 'e-sideframe-content');
            const sidebarFrameBorder = document.createElement('div');
            PageToolbar._addClass(sidebarFrameBorder, 'e-sideframe-border');
            document.body.appendChild(sidebarFrame);
            sidebarFrame.appendChild(sidebarFrameContent);
            sidebarFrame.appendChild(sidebarFrameBorder);

            const iframe = document.createElement('iframe');
            PageToolbar._setProperties(iframe, {
                src: this.componentPath + 'show/',
                frameBorder: '0'
            });
            sidebarFrameContent.appendChild(iframe);

            gear.addEventListener('click', this.toggleSidebar.bind(this));
        }

        // Деактивируем editBlocks если editMode включён
        const editBlocksButton = this.getControlById('editBlocks');
        const editModeControl = this.getControlById('editMode');
        if (editModeControl && typeof editModeControl.getState === 'function' && editModeControl.getState() && editBlocksButton) {
            editBlocksButton.disable();
        }
    }

    // Actions
    editMode() {
        const editModeControl = this.getControlById('editMode');
        if (editModeControl && editModeControl.getState() == 0) {
            this._reloadWindowInEditMode();
        } else {
            this.onEditModeUnpressed(true);
        }
    }

    add() {
        ModalBox.open({ url: this.componentPath + 'add/' + this.documentId });
    }
    edit() {
        ModalBox.open({ url: this.componentPath + this.documentId + '/edit' });
    }

    toggleSidebar() {
        const html = document.documentElement;
        html.classList.toggle('e-has-sideframe');

        // Используем стандартный URL!
        const url = new URL(window.Energine.base, window.location.origin);
        let domainChunks = url.hostname.split('.');
        if (domainChunks.length > 2) domainChunks.shift();
        const domain = '.' + domainChunks.join('.');

        // Path с / на конце
        const path = url.pathname.endsWith('/') ? url.pathname : url.pathname + '/';

        // Кука на 30 дней
        const value = html.classList.contains('e-has-sideframe') ? '1' : '0';
        const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
        document.cookie = `sidebar=${value}; expires=${expires}; domain=${domain}; path=${path}`;
    }

    showTmplEditor() { ModalBox.open({ url: this.componentPath + 'template' }); }
    showTransEditor() { ModalBox.open({ url: this.componentPath + 'translation' }); }
    showUserEditor() { ModalBox.open({ url: this.componentPath + 'user' }); }
    showRoleEditor() { ModalBox.open({ url: this.componentPath + 'role' }); }
    showLangEditor() { ModalBox.open({ url: this.componentPath + 'languages' }); }
    showFileRepository() { ModalBox.open({ url: this.componentPath + 'file-library' }); }
    showSiteEditor() { ModalBox.open({ url: this.componentPath + 'sites' }); }

    _reloadWindowInEditMode() {
        const form = document.createElement('form');
        PageToolbar._setStyles(form, { display: 'none' });
        PageToolbar._setProperties(form, { action: '', method: 'post' });
        const input = document.createElement('input');
        PageToolbar._setProperties(input, { name: 'editMode', type: 'hidden', value: '1' });
        form.appendChild(input);
        document.body.appendChild(form);
        form.submit();
    }

    // Событие как метод, без глобалки
    onEditModeUnpressed(state) {
        const evt = new CustomEvent('oneditmodeunpressed', { detail: state });
        window.dispatchEvent(evt);
    }

    // Вложенный контрол логотипа (если нужно)
    static Logo = class extends Toolbar.Control {};
}

// экспорт для window, если надо
window.PageToolbar = PageToolbar;
