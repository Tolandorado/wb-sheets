import { GoogleSheetsService } from "#services/googleSheets/googleSheets.service.js";
import log4js from "log4js";

const logger = log4js.getLogger("sheets-publisher");
logger.level = process.env.LOG_LEVEL ?? "info";

const service = new GoogleSheetsService();

async function runPublish(): Promise<void> {
    try {
        logger.info("Running Google Sheets sync");
        await service.syncAllSpreadsheets();
        logger.info("Google Sheets sync completed");
    } catch (error) {
        logger.error(
            "Failed to sync Google Sheets",
            error instanceof Error ? error.message : String(error),
        );
    }
}

/**
 * Запускает воркер для регулярного обновления данных в Google Sheets
 * @param intervalMinutes интервал обновления в минутах (по умолчанию 30)
 */
export function startSheetsPublisher(intervalMinutes = 30): void {
    logger.info(`Starting Google Sheets publisher every ${intervalMinutes} minutes`);
    const intervalMs = intervalMinutes * 60 * 1000;

    // Запускаем сразу при старте
    void runPublish();

    // Затем запускаем по расписанию
    setInterval(() => {
        void runPublish();
    }, intervalMs);
}

