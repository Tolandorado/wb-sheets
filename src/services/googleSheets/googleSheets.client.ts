import { google } from "googleapis";
import type { Env } from "#config/env/env.js";
import log4js from "log4js";

const logger = log4js.getLogger("google-sheets-client");
logger.level = process.env.LOG_LEVEL ?? "info";

export class GoogleSheetsClient {
    private readonly auth;
    private readonly sheets;

    constructor(serviceAccount: Env["GOOGLE_SERVICE_ACCOUNT"]) {
        this.auth = new google.auth.GoogleAuth({
            credentials: serviceAccount,
            scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });
        this.sheets = google.sheets({ version: "v4", auth: this.auth });
    }

    /**
     * Очищает лист и записывает новые данные
     */
    async updateSheet(
        spreadsheetId: string,
        sheetName: string,
        data: string[][],
    ): Promise<void> {
        try {
            // Проверяем существование листа, если нет - создаем
            await this.ensureSheetExists(spreadsheetId, sheetName);

            // Очищаем лист
            await this.sheets.spreadsheets.values.clear({
                spreadsheetId,
                range: `${sheetName}!A:Z`,
            });

            // Если данных нет, просто очищаем и выходим
            if (data.length === 0) {
                logger.warn(`No data to write to ${spreadsheetId}/${sheetName}`);
                return;
            }

            // Записываем данные
            await this.sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `${sheetName}!A1`,
                valueInputOption: "RAW",
                requestBody: {
                    values: data,
                },
            });

            logger.info(
                `Successfully updated ${spreadsheetId}/${sheetName} with ${data.length} rows`,
            );
        } catch (error) {
            logger.error(
                `Failed to update ${spreadsheetId}/${sheetName}`,
                error instanceof Error ? error.message : String(error),
            );
            throw error;
        }
    }

    /**
     * Проверяет существование листа, если нет - создает его
     */
    private async ensureSheetExists(
        spreadsheetId: string,
        sheetName: string,
    ): Promise<void> {
        try {
            const spreadsheet = await this.sheets.spreadsheets.get({
                spreadsheetId,
            });

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
                });
                logger.info(`Created sheet ${sheetName} in ${spreadsheetId}`);
            }
        } catch (error) {
            logger.error(
                `Failed to ensure sheet exists ${spreadsheetId}/${sheetName}`,
                error instanceof Error ? error.message : String(error),
            );
            throw error;
        }
    }
}

