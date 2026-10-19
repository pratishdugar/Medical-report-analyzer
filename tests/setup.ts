// Test defaults; real values from the environment win.
process.env.DATABASE_URL ??= process.env.TEST_DATABASE_URL ?? "postgres://sehat:sehat@localhost:5432/sehat_test";
process.env.ENCRYPTION_KEY ??= "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY="; // test-only key
process.env.STORAGE_DIR ??= "./data/test-uploads";
process.env.APP_URL ??= "http://localhost:3000";
process.env.OCR_ENABLED ??= "true";
// Never call real LLM providers from tests.
for (const k of ["GROQ_API_KEY", "GEMINI_API_KEY", "OPENROUTER_API_KEY", "OLLAMA_BASE_URL", "CUSTOM_LLM_BASE_URL"]) delete process.env[k];
