/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function seed(knex) {
    await knex("spreadsheets")
        .insert([
            {
                spreadsheet_id: "example_spreadsheet",
                sheet_name: "stocks_coefs",
                is_active: true,
            },
        ])
        .onConflict(["spreadsheet_id"])
        .ignore();
}
