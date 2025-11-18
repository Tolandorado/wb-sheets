import { GoogleSheetsService } from "#services/googleSheets/googleSheets.service.js";
import log4js from "log4js";
import { createWorker, type WorkerController } from "#utils/worker.js";

const logger = log4js.getLogger("sheets-publisher");
logger.level = process.env.LOG_LEVEL ?? "info";

const service = new GoogleSheetsService();
let controller: WorkerController | undefined;

async function runPublish(): Promise<void> {
    logger.info("Running Google Sheets sync");
    await service.syncAllSpreadsheets();
    logger.info("Google Sheets sync completed");
}

/**
 * Запускает воркер для регулярного обновления данных в Google Sheets
 * @param intervalMinutes интервал обновления в минутах (по умолчанию 30)
 */
export function startSheetsPublisher(intervalMinutes = 30): void {
    logger.info(`Starting Google Sheets publisher every ${intervalMinutes} minutes`);
    controller = createWorker(runPublish, intervalMinutes, true);
    controller.start();
}

export function stopSheetsPublisher(): void {
    controller?.stop();
}

