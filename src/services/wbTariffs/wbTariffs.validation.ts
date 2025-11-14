import { z } from "zod";

const numericString = z.preprocess(
    (value) => {
        if (value === null || value === undefined) return "0";
        if (typeof value === "number") return value.toString();
        if (typeof value === "string") {
            const cleaned = value.trim().replace(/\s+/g, "");
            if (cleaned === "" || cleaned === "-" || cleaned === "+") return "0";
            return cleaned;
        }
        return String(value).trim().replace(/\s+/g, "");
    },
    z
        .string()
        .regex(/^-?\d+([.,]\d+)?$/, { message: "Invalid numeric format" })
        .transform((value) => {
            const normalized = value.replace(",", ".");
            const parsed = parseFloat(normalized);
            return isNaN(parsed) ? 0 : parsed;
        }),
).default(0);

export const wbTariffsWarehouseSchema = z.object({
    warehouseName: z.string(),
    geoName: z.string(),
    boxDeliveryBase: numericString,
    boxDeliveryCoefExpr: numericString,
    boxDeliveryLiter: numericString,
    boxDeliveryMarketplaceBase: numericString,
    boxDeliveryMarketplaceCoefExpr: numericString,
    boxDeliveryMarketplaceLiter: numericString,
    boxStorageBase: numericString,
    boxStorageCoefExpr: numericString,
    boxStorageLiter: numericString,
});

export const wbTariffsDataSchema = z.object({
    dtNextBox: z.string(),
    dtTillMax: z.string(),
    warehouseList: z.array(wbTariffsWarehouseSchema),
});

export const wbTariffsResponseSchema = z.object({
    response: z.object({
        data: wbTariffsDataSchema,
    }),
});

