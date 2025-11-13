import log4js from "log4js";
import { WbTariffsService } from "#services/wbTariffs/wbTariffs.service.js";

const logger = log4js.getLogger("tariffs-collector-worker");
logger.level = process.env.LOG_LEVEL ?? "info";

const service = new WbTariffsService();

async function runCollection(): Promise<void> {
    try {
        await service.collectTariffs();
    } catch (error) {
        logger.error("Failed to collect WB tariffs", { error });
    }
}

export function startTariffsCollector(intervalMinutes = 60): void {
    logger.info(`Starting tariffs collector every ${intervalMinutes} minutes`);
    runCollection();
    const intervalMs = intervalMinutes * 60 * 1000;
    setInterval(() => {
        void runCollection();
    }, intervalMs);
}

