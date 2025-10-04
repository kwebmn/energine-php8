import GridManager from '../../share/scripts/GridManager.js';

/**
 * UserManager (ES6 version)
 * @extends GridManager
 */
export default class UserManager extends GridManager {
    /**
     * Активировать пользователя
     */
    activate() {
        this.request(
            `${this.singlePath}${this.grid.getSelectedRecordKey()}/activate/`,
            null,
            () => this.loadPage(this.pageList.currentPage)
        );
    }

    /**
     * Авторизация пользователя
     */
    auth() {
        this.request(
            `${this.singlePath}${this.grid.getSelectedRecordKey()}/auth/`,
            null,
            () => this.loadPage(this.pageList.currentPage)
        );
        setTimeout(() => {
            window.top.location.href = '/my/';
        }, 1000);
    }
}

if (typeof window !== 'undefined') {
    window.UserManager = UserManager;
}