import env from "#config/env/env.js";
import { Logger } from "log4js";
import log4js from "log4js";
import { wbTariffsResponseSchema } from "./wbTariffs.validation.js";
import type { WbTariffWarehouseRow, WbTariffsResponse } from "./wbTariffs.types.js";

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
        const url = new URL("/api/v1/tariffs/box", this.baseUrl);
        if (date) url.searchParams.set("date", date);

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: this.apiKey,
            },
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
        
        // Лог сырой ответ для отладки (только первые несколько складов)
        if (logger.level === "debug" && payload?.response?.data?.warehouseList) {
            logger.debug("Raw API response sample", {
                sample: payload.response.data.warehouseList.slice(0, 2),
            });
        }
        
        try {
            return wbTariffsResponseSchema.parse(payload);
        } catch (error) {
            // Лог проблемные данные для отладки
            logger.error("Validation failed, raw payload sample", {
                firstWarehouse: payload?.response?.data?.warehouseList?.[0],
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
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

