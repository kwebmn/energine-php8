/**
 * Resolve fetch implementation from provided scope or global fallback.
 *
 * @param {any} scope
 * @param {any} [fallbackScope]
 * @returns {typeof fetch}
 */
export const resolveFetchImplementation = (scope, fallbackScope) => {
    const ownerScope = scope || fallbackScope;
    if (ownerScope && typeof ownerScope.fetch === 'function') {
        return ownerScope.fetch.bind(ownerScope);
    }

    if (typeof fetch === 'function') {
        const globalOwner = typeof globalThis !== 'undefined' ? globalThis : undefined;
        return globalOwner ? fetch.bind(globalOwner) : fetch;
    }

    throw new Error('Global fetch implementation is not available for Energine requests');
};
