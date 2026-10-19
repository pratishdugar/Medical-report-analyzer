import { z } from "zod";

/**
 * Central, validated access to environment configuration.
 * Parsed lazily so `next build` works without runtime secrets.
 */
const boolish = z
  .enum(["true", "false", "1", "0", "yes", "no"])
  .transform((v) => v === "true" || v === "1" || v === "yes");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  APP_NAME: z.string().default("SehatLens"),
  /** base64-encoded 32 byte key used to derive per-user encryption keys */
  ENCRYPTION_KEY: z.string().min(40, "ENCRYPTION_KEY must be a base64 encoded 32 byte key"),
  /** optional previous key, used only for decryption during key rotation */
  ENCRYPTION_KEY_PREVIOUS: z.string().optional(),
  STORAGE_DIR: z.string().default("./data/uploads"),
  MAX_UPLOAD_MB: z.coerce.number().int().min(1).max(50).default(15),
  ALLOW_SIGNUPS: boolish.default(true),
  /** refuse to start if the DB role can bypass row level security */
  ALLOW_RLS_BYPASS_ROLE: boolish.default(false),
  SMTP_URL: z.string().optional(),
  EMAIL_FROM: z.string().default("SehatLens <no-reply@localhost>"),
  OCR_ENABLED: boolish.default(true),
  TESSERACT_LANGS: z.string().default("eng"),
  /** Comma separated provider order, e.g. "groq,gemini,openrouter,ollama" */
  LLM_PROVIDERS: z.string().default("groq,gemini,openrouter,ollama,custom"),
  /** Providers allowed to receive un-redacted text and images (self-hosted / contracted) */
  LLM_TRUSTED_PROVIDERS: z.string().default("ollama"),
  LLM_TIMEOUT_MS: z.coerce.number().int().default(60000),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default("llama-3.3-70b-versatile"),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-3.5-flash"),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default("meta-llama/llama-3.3-70b-instruct:free"),
  OLLAMA_BASE_URL: z.string().optional(),
  OLLAMA_MODEL: z.string().default("qwen2.5:7b"),
  OLLAMA_VISION_MODEL: z.string().optional(),
  CUSTOM_LLM_BASE_URL: z.string().optional(),
  CUSTOM_LLM_API_KEY: z.string().optional(),
  CUSTOM_LLM_MODEL: z.string().optional(),
  CUSTOM_LLM_VISION_MODEL: z.string().optional(),
  GRIEVANCE_OFFICER_NAME: z.string().default("Grievance Officer"),
  GRIEVANCE_OFFICER_EMAIL: z.string().default("grievance@example.in"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export const isProduction = () => process.env.NODE_ENV === "production";

/** Only for tests: forget parsed env so changes to process.env take effect. */
export function resetEnvCache() {
  cached = null;
}
