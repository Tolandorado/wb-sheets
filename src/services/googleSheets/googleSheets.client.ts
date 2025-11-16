import { google } from "googleapis";
import type { Env } from "#config/env/env.js";
import log4js from "log4js";
import { withRetry } from "#utils/retry.js";

const logger = log4js.getLogger("google-sheets-client");
logger.level = process.env.LOG_LEVEL ?? "info";

export class GoogleSheetsClient {
    private readonly auth;
    private readonly sheets;
    private readonly sheetExistsCache = new Map<string, boolean>();

    constructor(serviceAccount: Env["GOOGLE_SERVICE_ACCOUNT"]) {
        this.auth = new google.auth.GoogleAuth({
            credentials: serviceAccount,
            scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });
        this.sheets = google.sheets({ version: "v4", auth: this.auth });
    }

    /**
     * Проверяет существование листа, если нет - создает его
     */
    private async ensureSheetExists(
        spreadsheetId: string,
        sheetName: string,
        options?: { timeout?: number; signal?: AbortSignal },
    ): Promise<void> {
        try {
            const cacheKey = `${spreadsheetId}:${sheetName}`;
            if (this.sheetExistsCache.get(cacheKey)) return;
            const spreadsheet = await this.sheets.spreadsheets.get({
                spreadsheetId,
            }, options);

            const sheetExists = spreadsheet.data.sheets?.some(
                (sheet) => sheet.properties?.title === sheetName,
            );

            if (!sheetExists) {
                await this.sheets.spreadsheets.batchUpdate({
                    spreadsheetId,
                    requestBody: {
                        requests: [
                            {
                                addSheet: {
                                    properties: {
                                        title: sheetName,
                                    },
                                },
                            },
                        ],
                    },
                }, options);
                logger.info(`Created sheet ${sheetName} in ${spreadsheetId}`);
            }
            this.sheetExistsCache.set(cacheKey, true);
        } catch (error) {
            logger.error(
                `Failed to ensure sheet exists ${spreadsheetId}/${sheetName}`,
                error instanceof Error ? error.message : String(error),
            );
            throw error;
        }
    }

     /**
     * Очищает лист и записывает новые данные чанками
     */
    async updateSheetChunked(
        spreadsheetId: string,
        sheetName: string,
        data: string[][],
        chunkSize = 30,
    ): Promise<void> {
        const ensure = withRetry(async () => {
            await this.ensureSheetExists(spreadsheetId, sheetName, { timeout: 10000 });
        }, { retries: 3, baseMs: 500, factor: 2, jitterMode: "full" });
        await ensure();

        const clear = withRetry(async () => {
            await this.sheets.spreadsheets.values.clear({
                spreadsheetId,
                range: `${sheetName}!A:Z`,
            }, { timeout: 10000 });
        }, { retries: 3, baseMs: 500, factor: 2, jitterMode: "full" });
        await clear();

        if (data.length === 0) return;

        let startRow = 1;
        for (let i = 0; i < data.length; i += chunkSize) {
            const part = data.slice(i, i + chunkSize);
            const write = withRetry(async () => {
                await this.sheets.spreadsheets.values.update({
                    spreadsheetId,
                    range: `${sheetName}!A${startRow}`,
                    valueInputOption: "RAW",
                    requestBody: { values: part },
                }, { timeout: 20000 });
            }, { retries: 3, baseMs: 500, factor: 2, jitterMode: "full" });
            await write();
            startRow += part.length;
        }
    }
}

