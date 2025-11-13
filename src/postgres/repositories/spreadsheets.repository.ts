import knex from "#postgres/knex.js";

const TABLE_NAME = "spreadsheets";

export type SpreadsheetRow = {
    spreadsheetId: string;
    sheetName: string;
    isActive: boolean;
    lastSyncedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
};

/**
 * Получает все активные таблицы для синхронизации
 */
export async function getActiveSpreadsheets(): Promise<SpreadsheetRow[]> {
    const rows = await knex(TABLE_NAME)
        .select("*")
        .where("is_active", true)
        .orderBy("created_at", "asc");

    return rows.map((row) => ({
        spreadsheetId: row.spreadsheet_id,
        sheetName: row.sheet_name,
        isActive: row.is_active,
        lastSyncedAt: row.last_synced_at ? new Date(row.last_synced_at) : null,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    }));
}

/**
 * Обновляет время последней синхронизации для таблицы
 */
export async function updateLastSyncedAt(spreadsheetId: string): Promise<void> {
    await knex(TABLE_NAME)
        .where("spreadsheet_id", spreadsheetId)
        .update({
            last_synced_at: knex.fn.now(),
            updated_at: knex.fn.now(),
        });
}

