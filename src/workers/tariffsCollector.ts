import log4js from "log4js";
import { WbTariffsService } from "#services/wbTariffs/wbTariffs.service.js";

const logger = log4js.getLogger("tariffs-collector-worker");
logger.level = process.env.LOG_LEVEL ?? "info";
//TODO Добавить ограничение параллелизма: предотвращать перекрытие запусков при долгих запросах

const service = new WbTariffsService();

async function runCollection(onSuccess?: () => void): Promise<void> {
    try {
        await service.collectTariffs();
        if (onSuccess) {
            onSuccess();
        }
    } catch (error) {
        logger.error("Failed to collect WB tariffs", { error });
    }
}

export function startTariffsCollector(
    intervalMinutes = 60,
    onSuccess?: () => void,
): void {
    logger.info(`Starting tariffs collector every ${intervalMinutes} minutes`);
    void runCollection(onSuccess);
    const intervalMs = intervalMinutes * 60 * 1000;
    setInterval(() => {
        void runCollection();
    }, intervalMs);
    //TODO Добавить джиттер к интервалам, таймауты запросов и отмену при остановке приложения
}

