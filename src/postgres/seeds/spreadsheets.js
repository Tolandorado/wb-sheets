/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function seed(knex) {
    const spreadsheetIds =
        process.env.GOOGLE_SPREADSHEET_IDS?.split(",")
            .map((id) => id.trim())
            .filter(Boolean) || [];

    if (spreadsheetIds.length === 0) {
        console.log("No spreadsheet IDs found in GOOGLE_SPREADSHEET_IDS, skipping seed");
        return;
    }

    const spreadsheets = spreadsheetIds.map((spreadsheetId) => ({
        spreadsheet_id: spreadsheetId,
        sheet_name: "stocks_coefs",
        is_active: true,
    }));

    await knex("spreadsheets")
        .insert(spreadsheets)
        .onConflict(["spreadsheet_id"])
        .ignore();
}
