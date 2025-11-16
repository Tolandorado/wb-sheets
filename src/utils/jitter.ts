export type JitterMode = "none" | "full" | "equal";

export function applyJitter(delayMs: number, mode: JitterMode = "none"): number {
    if (mode === "none") return delayMs;
    if (mode === "full") return Math.floor(Math.random() * delayMs);
    const half = delayMs / 2;
    return Math.floor(half + Math.random() * half);
}