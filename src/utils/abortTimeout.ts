export type AsyncAbortableFn<A extends any[], R> = (
    signal: AbortSignal,
    ...args: A
) => Promise<R>;

export function withAbortTimeout<A extends any[], R>(
    fn: AsyncAbortableFn<A, R>,
    ms: number,
): (...args: A) => Promise<R> {
    return async (...args: A): Promise<R> => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), ms);
        try {
            const result = await fn(controller.signal, ...args);
            clearTimeout(timer);
            return result;
        } catch (e) {
            clearTimeout(timer);
            throw e;
        }
    };
}