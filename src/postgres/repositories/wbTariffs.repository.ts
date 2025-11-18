import knex from "#postgres/knex.js";
import type { WbTariffWarehouseRow } from "#services/wbTariffs/wbTariffs.types.js";
import { chunk } from "#utils/chunk.js";

export type TariffRowForSheets = {
    warehouseName: string;
    geoName: string;
    boxDeliveryBase: number;
    boxDeliveryCoefExpr: number;
    boxDeliveryLiter: number;
    boxDeliveryMarketplaceBase: number;
    boxDeliveryMarketplaceCoefExpr: number;
    boxDeliveryMarketplaceLiter: number;
    boxStorageBase: number;
    boxStorageCoefExpr: number;
    boxStorageLiter: number;
};

const TABLE_NAME = "wb_tariffs_box_daily";

export async function upsertTariffs(rows: WbTariffWarehouseRow[]): Promise<void> {
    await upsertTariffsChunked(rows);
}

export async function upsertTariffsChunked(
    rows: WbTariffWarehouseRow[],
    batchSize = 1000,
): Promise<void> {
    if (rows.length === 0) return;
    await knex.transaction(async (trx) => {
        for (const part of chunk(rows, batchSize)) {
            const payload = part.map((row) => ({
                tariff_date: row.tariffDate,
                warehouse_name: row.warehouseName,
                geo_name: row.geoName,
                box_delivery_base: row.boxDeliveryBase,
                box_delivery_coef_expr: row.boxDeliveryCoefExpr,
                box_delivery_liter: row.boxDeliveryLiter,
                box_delivery_marketplace_base: row.boxDeliveryMarketplaceBase,
                box_delivery_marketplace_coef_expr: row.boxDeliveryMarketplaceCoefExpr,
                box_delivery_marketplace_liter: row.boxDeliveryMarketplaceLiter,
                box_storage_base: row.boxStorageBase,
                box_storage_coef_expr: row.boxStorageCoefExpr,
                box_storage_liter: row.boxStorageLiter,
                fetched_at: row.fetchedAt,
                updated_at: new Date(),
            }));

            await trx(TABLE_NAME)
                .insert(payload)
                .onConflict(["tariff_date", "warehouse_name"])
                .merge({
                    geo_name: trx.raw("excluded.geo_name"),
                    box_delivery_base: trx.raw("excluded.box_delivery_base"),
                    box_delivery_coef_expr: trx.raw("excluded.box_delivery_coef_expr"),
                    box_delivery_liter: trx.raw("excluded.box_delivery_liter"),
                    box_delivery_marketplace_base: trx.raw(
                        "excluded.box_delivery_marketplace_base",
                    ),
                    box_delivery_marketplace_coef_expr: trx.raw(
                        "excluded.box_delivery_marketplace_coef_expr",
                    ),
                    box_delivery_marketplace_liter: trx.raw(
                        "excluded.box_delivery_marketplace_liter",
                    ),
                    box_storage_base: trx.raw("excluded.box_storage_base"),
                    box_storage_coef_expr: trx.raw("excluded.box_storage_coef_expr"),
                    box_storage_liter: trx.raw("excluded.box_storage_liter"),
                    fetched_at: trx.raw("excluded.fetched_at"),
                    updated_at: trx.fn.now(),
                });
        }
    });
}



/**
 * Получает актуальные тарифы за указанную дату, отсортированные по коэффициенту по возрастанию
 */
export async function getLatestTariffsForDate(
    date: Date = new Date(),
): Promise<TariffRowForSheets[]> {
    const tariffDate = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    )
        .toISOString()
        .split("T")[0];

    const rows = await knex(TABLE_NAME)
        .select(
            "warehouse_name as warehouseName",
            "geo_name as geoName",
            "box_delivery_base as boxDeliveryBase",
            "box_delivery_coef_expr as boxDeliveryCoefExpr",
            "box_delivery_liter as boxDeliveryLiter",
            "box_delivery_marketplace_base as boxDeliveryMarketplaceBase",
            "box_delivery_marketplace_coef_expr as boxDeliveryMarketplaceCoefExpr",
            "box_delivery_marketplace_liter as boxDeliveryMarketplaceLiter",
            "box_storage_base as boxStorageBase",
            "box_storage_coef_expr as boxStorageCoefExpr",
            "box_storage_liter as boxStorageLiter",
        )
        .where("tariff_date", tariffDate)
        .orderBy("box_delivery_coef_expr", "asc");

    return rows as TariffRowForSheets[];
}
