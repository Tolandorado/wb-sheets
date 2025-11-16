export function backoffDelay(attempt: number, baseMs = 500, factor = 2): number {
    return Math.floor(baseMs * Math.pow(factor, Math.max(0, attempt - 1)));
}