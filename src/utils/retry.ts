import { sleep } from "#utils/sleep.js";
import { backoffDelay } from "#utils/backoff.js";
import { applyJitter, type JitterMode } from "#utils/jitter.js";

export type AsyncFn<A extends any[], R> = (...args: A) => Promise<R>;

export function withRetry<A extends any[], R>(
    fn: AsyncFn<A, R>,
    options: {
        retries: number;
        baseMs?: number;
        factor?: number;
        jitterMode?: JitterMode;
        retryOn?: (error: unknown) => boolean;
    },
): AsyncFn<A, R> {
    const { retries, baseMs = 500, factor = 2, jitterMode = "full", retryOn } = options;
    return async (...args: A): Promise<R> => {
        let attempt = 0;
        while (true) {
            try {
                return await fn(...args);
            } catch (error) {
                attempt += 1;
                const shouldRetry = typeof retryOn === "function" ? retryOn(error) : true;
                if (!shouldRetry || attempt > retries) throw error;
                const delay = applyJitter(backoffDelay(attempt, baseMs, factor), jitterMode);
                await sleep(delay);
            }
        }
    };
}