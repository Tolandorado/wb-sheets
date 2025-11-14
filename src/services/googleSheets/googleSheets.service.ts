import { GoogleSheetsClient } from "./googleSheets.client.js";
import { getLatestTariffsForDate, type TariffRowForSheets } from "#postgres/repositories/wbTariffs.repository.js";
import {
    getActiveSpreadsheets,
    updateLastSyncedAt,
} from "#postgres/repositories/spreadsheets.repository.js";
import env from "#config/env/env.js";
import log4js from "log4js";

const logger = log4js.getLogger("google-sheets-service");
logger.level = process.env.LOG_LEVEL ?? "info";

export class GoogleSheetsService {
    private readonly client: GoogleSheetsClient;

    constructor() {
        this.client = new GoogleSheetsClient(env.GOOGLE_SERVICE_ACCOUNT);
    }

    /**
     * Синхронизирует данные тарифов во все активные Google таблицы
     */
    async syncAllSpreadsheets(date: Date = new Date()): Promise<void> {
        logger.info("Starting sync to Google Sheets", { date: date.toISOString() });

        const spreadsheets = await getActiveSpreadsheets();
        if (spreadsheets.length === 0) {
            logger.warn("No active spreadsheets found");
            return;
        }

        const tariffs = await getLatestTariffsForDate(date);
        if (tariffs.length === 0) {
            logger.warn("No tariffs found for date", { date: date.toISOString() });
            return;
        }

        logger.info(`Found ${tariffs.length} tariffs to sync to ${spreadsheets.length} spreadsheets`);

        const sheetData = this.formatTariffsForSheets(tariffs);

        for (const spreadsheet of spreadsheets) {
            try {
                await this.client.updateSheet(
                    spreadsheet.spreadsheetId,
                    spreadsheet.sheetName,
                    sheetData,
                );
                await updateLastSyncedAt(spreadsheet.spreadsheetId);
                logger.info(`Synced ${spreadsheet.spreadsheetId}/${spreadsheet.sheetName}`);
            } catch (error) {
                logger.error(
                    `Failed to sync ${spreadsheet.spreadsheetId}`,
                    error instanceof Error ? error.message : String(error),
                );
            }
        }

        logger.info("Sync to Google Sheets completed");
    }

    /**
     * Форматирует данные тарифов для записи в Google Sheets
     * Первая строка - заголовки, остальные - данные, отсортированные по коэффициенту
     */
    private formatTariffsForSheets(tariffs: TariffRowForSheets[]): string[][] {
        const headers = [
            "Склад",
            "Регион",
            "Доставка (базовая)",
            "Доставка (коэффициент)",
            "Доставка (литр)",
            "Доставка маркетплейс (базовая)",
            "Доставка маркетплейс (коэффициент)",
            "Доставка маркетплейс (литр)",
            "Хранение (базовая)",
            "Хранение (коэффициент)",
            "Хранение (литр)",
        ];

        const rows: string[][] = [headers];

        for (const tariff of tariffs) {
            rows.push([
                tariff.warehouseName,
                tariff.geoName,
                tariff.boxDeliveryBase.toString(),
                tariff.boxDeliveryCoefExpr.toString(),
                tariff.boxDeliveryLiter.toString(),
                tariff.boxDeliveryMarketplaceBase.toString(),
                tariff.boxDeliveryMarketplaceCoefExpr.toString(),
                tariff.boxDeliveryMarketplaceLiter.toString(),
                tariff.boxStorageBase.toString(),
                tariff.boxStorageCoefExpr.toString(),
                tariff.boxStorageLiter.toString(),
            ]);
        }

        return rows;
    }
}

