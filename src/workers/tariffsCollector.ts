import log4js from "log4js";
import { WbTariffsService } from "#services/wbTariffs/wbTariffs.service.js";
import { createWorker, type WorkerController } from "#utils/worker.js";

const logger = log4js.getLogger("tariffs-collector-worker");
logger.level = process.env.LOG_LEVEL ?? "info";

const service = new WbTariffsService();
let controller: WorkerController | undefined;

export function startTariffsCollector(
    intervalMinutes = 60,
    onSuccess?: () => void,
): void {
    logger.info(`Starting tariffs collector every ${intervalMinutes} minutes`);
    let first = true;
    const task = async () => {
        try {
            await service.collectTariffs();
            if (first && onSuccess) {
                onSuccess();
                first = false;
            }
        } catch (error) {
            logger.error("Failed to collect WB tariffs", { error });
        }
    };
    controller = createWorker(task, intervalMinutes, true);
    controller.start();
}

export function stopTariffsCollector(): void {
    controller?.stop();
}

