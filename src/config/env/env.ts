import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const coerceNumberFromString = () =>
    z
        .string()
        .regex(/^[0-9]+$/)
        .transform((value) => parseInt(value, 10));

const googleServiceAccountSchema = z.object({
    type: z.literal("service_account"),
    project_id: z.string(),
    private_key_id: z.string(),
    private_key: z.string(),
    client_email: z.string().email(),
    client_id: z.string(),
    auth_uri: z.string().url(),
    token_uri: z.string().url(),
    auth_provider_x509_cert_url: z.string().url(),
    client_x509_cert_url: z.string().url(),
    universe_domain: z.union([z.string(), z.undefined()]),
});

const envSchema = z.object({
    NODE_ENV: z.union([z.undefined(), z.enum(["development", "production"])]),
    POSTGRES_HOST: z.union([z.undefined(), z.string()]),
    POSTGRES_PORT: coerceNumberFromString(),
    POSTGRES_DB: z.string(),
    POSTGRES_USER: z.string(),
    POSTGRES_PASSWORD: z.string(),
    APP_PORT: z.union([z.undefined(), coerceNumberFromString()]),
    WB_API_URL: z.union([
        z.undefined(),
        z.string().url(),
    ]).transform((value) => value ?? "https://common-api.wildberries.ru"),
    WB_API_KEY: z.string(),
    GOOGLE_SPREADSHEET_IDS: z
        .string()
        .transform((value) =>
            value
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
        ),
    GOOGLE_SERVICE_ACCOUNT: z.string().transform((value, ctx) => {
        const candidates = [value];
        // Try to treat value as base64-encoded JSON if direct parse fails.
        try {
            return googleServiceAccountSchema.parse(JSON.parse(value));
        } catch {
            try {
                const decoded = Buffer.from(value, "base64").toString("utf-8");
                return googleServiceAccountSchema.parse(JSON.parse(decoded));
            } catch (error) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message:
                        "GOOGLE_SERVICE_ACCOUNT must be a JSON or base64 encoded JSON for a Google service account",
                });
                throw error;
            }
        }
    }),
});

const env = envSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    POSTGRES_HOST: process.env.POSTGRES_HOST,
    POSTGRES_PORT: process.env.POSTGRES_PORT,
    POSTGRES_DB: process.env.POSTGRES_DB,
    POSTGRES_USER: process.env.POSTGRES_USER,
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
    APP_PORT: process.env.APP_PORT,
    WB_API_URL: process.env.WB_API_URL,
    WB_API_KEY: process.env.WB_API_KEY,
    GOOGLE_SERVICE_ACCOUNT: process.env.GOOGLE_SERVICE_ACCOUNT,
    GOOGLE_SPREADSHEET_IDS: process.env.GOOGLE_SPREADSHEET_IDS ?? "",
});

export type Env = typeof env;
export default env;
