import { upsertTariffsChunked } from "#postgres/repositories/wbTariffs.repository.js";
import env from "#config/env/env.js";
import log4js from "log4js";
import { WbTariffsClient, mapWarehouseRows } from "./wbTariffs.client.js";

const logger = log4js.getLogger("wb-tariffs-service");
logger.level = process.env.LOG_LEVEL ?? "info";

export class WbTariffsService {
    private readonly client = new WbTariffsClient(env.WB_API_KEY);

    public async collectTariffs(date: Date = new Date()): Promise<void> {
        logger.info("Fetching WB tariffs for boxes", { date: date.toISOString() });
        const tariffDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        const fetchedAt = new Date();
        const response = await this.client.fetchBoxTariffs(
            tariffDate.toISOString().split("T")[0],
        );
        const rows = mapWarehouseRows(response, tariffDate, fetchedAt);
        await upsertTariffsChunked(rows, 1000);
        logger.info("WB tariffs updated", { rows: rows.length });
    }
}


