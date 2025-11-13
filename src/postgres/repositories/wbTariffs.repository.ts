import knex from "#postgres/knex.js";
import type { WbTariffWarehouseRow } from "#services/wbTariffs/wbTariffs.types.js";

const TABLE_NAME = "wb_tariffs_box_daily";

export async function upsertTariffs(rows: WbTariffWarehouseRow[]): Promise<void> {
    if (rows.length === 0) return;

    const payload = rows.map((row) => ({
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

    await knex(TABLE_NAME)
        .insert(payload)
        .onConflict(["tariff_date", "warehouse_name"])
        .merge({
            geo_name: knex.raw("excluded.geo_name"),
            box_delivery_base: knex.raw("excluded.box_delivery_base"),
            box_delivery_coef_expr: knex.raw("excluded.box_delivery_coef_expr"),
            box_delivery_liter: knex.raw("excluded.box_delivery_liter"),
            box_delivery_marketplace_base: knex.raw(
                "excluded.box_delivery_marketplace_base",
            ),
            box_delivery_marketplace_coef_expr: knex.raw(
                "excluded.box_delivery_marketplace_coef_expr",
            ),
            box_delivery_marketplace_liter: knex.raw(
                "excluded.box_delivery_marketplace_liter",
            ),
            box_storage_base: knex.raw("excluded.box_storage_base"),
            box_storage_coef_expr: knex.raw("excluded.box_storage_coef_expr"),
            box_storage_liter: knex.raw("excluded.box_storage_liter"),
            fetched_at: knex.raw("excluded.fetched_at"),
            updated_at: knex.fn.now(),
        });
}

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
