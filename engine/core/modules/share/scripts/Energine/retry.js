/**
 * Async retry helpers extracted for reuse and testing.
 * @module Energine/retry
 */

/**
 * @typedef {{
 *   attempts?: number,
 *   delay?: number,
 *   onError?: (error: unknown) => void,
 *   onGiveUp?: () => void
 * }} RetryOptions
 */

/**
 * Create retry executor bound to runtime scheduler.
 *
 * @param {(task: () => boolean, options: RetryOptions) => void} scheduler
 */
export const createRetryExecutor = (scheduler) => ({
    /**
     * Execute task with retry semantics.
     *
     * @param {() => boolean} task
     * @param {RetryOptions} options
     */
    execute(task, options) {
        scheduler(task, options);
    },
});
