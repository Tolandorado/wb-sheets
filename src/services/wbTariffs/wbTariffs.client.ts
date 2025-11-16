import env from "#config/env/env.js";
import { Logger } from "log4js";
import log4js from "log4js";
import { wbTariffsResponseSchema } from "./wbTariffs.validation.js";
import type { WbTariffWarehouseRow, WbTariffsResponse } from "./wbTariffs.types.js";
import { withRetry } from "#utils/retry.js";
import { withAbortTimeout } from "#utils/abortTimeout.js";
import { chunk as chunkArray } from "#utils/chunk.js";

const logger: Logger = log4js.getLogger("wb-tariffs-client");
logger.level = process.env.LOG_LEVEL ?? "info";

export class WbTariffsClient {
    private readonly baseUrl: string;

    constructor(
        private readonly apiKey: string = env.WB_API_KEY,
        baseUrl?: string,
    ) {
        this.baseUrl = baseUrl ?? env.WB_API_URL;
    }

    public async fetchBoxTariffs(date?: string): Promise<WbTariffsResponse> {
        const exec = async (signal: AbortSignal): Promise<WbTariffsResponse> => {
            const url = new URL("/api/v1/tariffs/box", this.baseUrl);
            if (date) url.searchParams.set("date", date);

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: this.apiKey,
                },
                signal,
            });

            if (!response.ok) {
                const body = await response.text();
                logger.error("Wildberries API responded with error", {
                    status: response.status,
                    statusText: response.statusText,
                    body,
                });
                throw new Error(`Wildberries API error: ${response.status} ${response.statusText}`);
            }

            const payload = await response.json();

            if (logger.level === "debug" && payload?.response?.data?.warehouseList) {
                logger.debug("Raw API response sample", {
                    sample: payload.response.data.warehouseList.slice(0, 2),
                });
            }

            return wbTariffsResponseSchema.parse(payload);
        };

        const wrapped = withRetry(withAbortTimeout(exec, 10000), {
            retries: 3,
            baseMs: 500,
            factor: 2,
            jitterMode: "full",
            retryOn: (error) => {
                const msg = error instanceof Error ? error.message : String(error);
                return /Wildberries API error: (429|5\d{2})/.test(msg) || /fetch failed|network/i.test(msg);
            },
        });
        return wrapped();
    }
}

export function mapWarehouseRows(
    data: WbTariffsResponse,
    tariffDate: Date,
    fetchedAt: Date,
): WbTariffWarehouseRow[] {
    return data.response.data.warehouseList.map((warehouse) => ({
        tariffDate,
        warehouseName: warehouse.warehouseName,
        geoName: warehouse.geoName,
        boxDeliveryBase: warehouse.boxDeliveryBase,
        boxDeliveryCoefExpr: warehouse.boxDeliveryCoefExpr,
        boxDeliveryLiter: warehouse.boxDeliveryLiter,
        boxDeliveryMarketplaceBase: warehouse.boxDeliveryMarketplaceBase,
        boxDeliveryMarketplaceCoefExpr: warehouse.boxDeliveryMarketplaceCoefExpr,
        boxDeliveryMarketplaceLiter: warehouse.boxDeliveryMarketplaceLiter,
        boxStorageBase: warehouse.boxStorageBase,
        boxStorageCoefExpr: warehouse.boxStorageCoefExpr,
        boxStorageLiter: warehouse.boxStorageLiter,
        fetchedAt,
    }));
}

export function mapWarehouseRowsChunked(
    data: WbTariffsResponse,
    tariffDate: Date,
    fetchedAt: Date,
    batchSize = 1000,
): WbTariffWarehouseRow[][] {
    const rows = mapWarehouseRows(data, tariffDate, fetchedAt);
    return chunkArray(rows, batchSize);
}

