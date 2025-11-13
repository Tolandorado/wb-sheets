/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function up(knex) {
    await knex.schema.createTable("wb_tariffs_box_daily", (table) => {
        table.increments("id").primary();
        table.date("tariff_date").notNullable();
        table.string("warehouse_name").notNullable();
        table.string("geo_name").notNullable();
        table.decimal("box_delivery_base", 14, 4).notNullable();
        table.decimal("box_delivery_coef_expr", 14, 4).notNullable();
        table.decimal("box_delivery_liter", 14, 4).notNullable();
        table.decimal("box_delivery_marketplace_base", 14, 4).notNullable();
        table.decimal("box_delivery_marketplace_coef_expr", 14, 4).notNullable();
        table.decimal("box_delivery_marketplace_liter", 14, 4).notNullable();
        table.decimal("box_storage_base", 14, 4).notNullable();
        table.decimal("box_storage_coef_expr", 14, 4).notNullable();
        table.decimal("box_storage_liter", 14, 4).notNullable();
        table.timestamp("fetched_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.timestamps(true, true);
        table.unique(["tariff_date", "warehouse_name"]);
    });

    await knex.schema.alterTable("spreadsheets", (table) => {
        table.string("sheet_name").notNullable().defaultTo("stocks_coefs");
        table.boolean("is_active").notNullable().defaultTo(true);
        table.timestamp("last_synced_at", { useTz: true });
        table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    });
}

/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function down(knex) {
    await knex.schema.alterTable("spreadsheets", (table) => {
        table.dropColumn("sheet_name");
        table.dropColumn("is_active");
        table.dropColumn("last_synced_at");
        table.dropColumn("created_at");
        table.dropColumn("updated_at");
    });

    await knex.schema.dropTableIfExists("wb_tariffs_box_daily");
}

