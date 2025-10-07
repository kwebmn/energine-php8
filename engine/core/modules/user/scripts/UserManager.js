const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

const GridManager = globalScope?.GridManager;

if (!GridManager) {
    throw new Error('UserManager requires GridManager to be loaded before it executes.');
}

/**
 * UserManager (ES6 version)
 * @extends GridManager
 */
class UserManager extends GridManager {
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
            const targetWindow = globalScope?.top || globalScope;
            if (targetWindow?.location) {
                targetWindow.location.href = '/my/';
            }
        }, 1000);
    }
}

export { UserManager };
export default UserManager;

export function attachToWindow(target = globalScope) {
    if (!target) {
        return UserManager;
    }

    target.UserManager = UserManager;
    return UserManager;
}

attachToWindow();