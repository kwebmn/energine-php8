const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

function assignToTarget(target, key, value) {
    if (!target || !key) {
        return value;
    }

    target[key] = value;
    return value;
}

export function attachToWindow(nameOrMap, value, target = globalScope) {
    const resolvedTarget = target ?? globalScope;

    if (!resolvedTarget) {
        return typeof value !== 'undefined' ? value : nameOrMap;
    }

    if (nameOrMap && typeof nameOrMap === 'object' && !Array.isArray(nameOrMap)) {
        Object.entries(nameOrMap).forEach(([key, val]) => {
            if (typeof key === 'string' && key.length) {
                assignToTarget(resolvedTarget, key, val);
            }
        });
        return nameOrMap;
    }

    if (typeof nameOrMap === 'string') {
        return assignToTarget(resolvedTarget, nameOrMap, value);
    }

    if (typeof nameOrMap === 'function' && nameOrMap.name) {
        return assignToTarget(resolvedTarget, nameOrMap.name, nameOrMap);
    }

    if (typeof value === 'function' && value.name) {
        return assignToTarget(resolvedTarget, value.name, value);
    }

    return typeof value !== 'undefined' ? value : nameOrMap;
}

export { globalScope };
export default attachToWindow;
