import { applyJitter } from "#utils/jitter.js";

export type WorkerController = {
    start: () => void;
    stop: () => void;
    isRunning: () => boolean;
};

export function createWorker(
    task: () => Promise<void>,
    intervalMinutes: number,
    runImmediately = true,
): WorkerController {
    let isRunning = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const baseMs = intervalMinutes * 60 * 1000;
    const cap = Math.min(60000, Math.floor(baseMs * 0.1));
    const nextDelayMs = (): number => baseMs + applyJitter(cap, "full");

    async function run(): Promise<void> {
        if (isRunning) return;
        isRunning = true;
        try {
            await task();
        } finally {
            isRunning = false;
        }
    }

    function schedule(): void {
        timer = setTimeout(async () => {
            await run();
            schedule();
        }, nextDelayMs());
    }

    function start(): void {
        if (runImmediately) void run();
        schedule();
    }

    function stop(): void {
        if (timer) {
            clearTimeout(timer);
            timer = undefined;
        }
    }

    return { start, stop, isRunning: () => isRunning };
}