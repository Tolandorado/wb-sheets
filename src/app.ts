import knex, { migrate, seed } from "#postgres/knex.js";
import { startTariffsCollector, stopTariffsCollector } from "#workers/tariffsCollector.js";
import { startSheetsPublisher, stopSheetsPublisher } from "#workers/sheetsPublisher.js";
import log4js from "log4js";

const logger = log4js.getLogger("app");
logger.level = process.env.LOG_LEVEL ?? "info";

async function bootstrap() {
    logger.info("Running migrations");
    await migrate.latest();
    logger.info("Running seeds");
    await seed.run();
    logger.info("Database is up to date");
    
    // Запускаем сборщик тарифов, и после успешного сбора запускаем синхронизацию
    startTariffsCollector(60, () => {
        // После успешного сбора тарифов запускаем синхронизацию
        logger.info("Tariffs collected, starting Google Sheets sync");
        startSheetsPublisher();
    });
    
    logger.info("All workers started");
}

bootstrap().catch((error) => {
    logger.fatal("Application failed to start", { error });
    void knex.destroy().finally(() => process.exit(1));
});

function gracefulShutdown(code: string): void {
    logger.info(`Received ${code}, shutting down`);
    try {
        stopTariffsCollector();
        stopSheetsPublisher();
    } catch {}
    void knex.destroy().finally(() => process.exit(0));
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));