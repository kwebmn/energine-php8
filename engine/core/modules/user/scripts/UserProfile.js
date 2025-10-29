import Energine, { registerBehavior as registerEnergineBehavior } from '../../share/scripts/Energine.js';
import ValidForm from '../../share/scripts/ValidForm.js';

const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

const normalizeSegment = (segment = '') => {
    if (segment === null || typeof segment === 'undefined') {
        return '';
    }
    return String(segment).trim().replace(/^\/+/g, '').replace(/\/+$/g, '');
};

const normalizeBase = (base = '') => {
    if (!base) {
        return '';
    }
    return String(base).trim().replace(/\/+$/g, '');
};

const toArray = (value) => (Array.isArray(value) ? value : [value]);

const composeUrl = ({ base = '', segments = [], trailingSlash = true } = {}) => {
    const normalizedBase = normalizeBase(base);
    const normalizedSegments = segments
        .map((segment) => normalizeSegment(segment))
        .filter(Boolean);

    let url;
    if (normalizedBase) {
        url = normalizedSegments.length
            ? `${normalizedBase}/${normalizedSegments.join('/')}`
            : normalizedBase;
    } else if (normalizedSegments.length) {
        url = `/${normalizedSegments.join('/')}`;
    } else {
        url = '/';
    }

    if (trailingSlash && url[url.length - 1] !== '/') {
        url += '/';
    }

    return url;
};

const buildLangAwareUrl = (segments = [], options = {}) => {
    const normalizedLang = normalizeSegment(Energine?.lang);
    const combinedSegments = normalizedLang
        ? [normalizedLang, ...toArray(segments)]
        : toArray(segments);

    return composeUrl({ base: Energine?.base, segments: combinedSegments, ...options });
};

const buildComponentUrl = (singleTemplate, segments = [], options = {}) => {
    const normalizedSingle = normalizeSegment(singleTemplate);
    const combinedSegments = normalizedSingle
        ? [normalizedSingle, ...toArray(segments)]
        : toArray(segments);

    return buildLangAwareUrl(combinedSegments, options);
};

const $ = globalScope?.jQuery || globalScope?.$;

/**
 * UserProfile (ES6 version)
 * @extends ValidForm
 */
class UserProfile extends ValidForm {
    /**
     * @param {HTMLElement|string} element
     */
    constructor(element) {
        if (!$) {
            throw new Error('UserProfile requires jQuery to be available globally.');
        }

        const elementRef = (typeof element === 'string')
            ? document.querySelector(element)
            : element;
        super(elementRef);
        this.componentElement = elementRef;
        const dataset = this.componentElement?.dataset || {};
        // Получаем путь для сохранения
        this.singleTemplate = dataset.eSingleTemplate
            || this.componentElement.getAttribute('data-e-single-template')
            || this.componentElement.getAttribute('single_template')
            || '';

        // Привязываем обработчик отправки формы через jQuery
        $(this.componentElement).on('submit', (event) => {
            event.preventDefault();
            const data = $(this.componentElement).serialize();
            const saveUrl = buildComponentUrl(this.singleTemplate, 'save');

            $.post(saveUrl, data, (result) => {
                if (result.result) {
                    Energine.noticeBox(result.message, 'success');
                } else {
                    Energine.noticeBox(result.message, 'error');
                }
            }, 'json');

            return false;
        });
    }

}

export { UserProfile };
export default UserProfile;
if (typeof registerEnergineBehavior === 'function') {
    registerEnergineBehavior('UserProfile', UserProfile);
}
