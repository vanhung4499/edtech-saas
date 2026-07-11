// Mirrors main.ts's ConfigModule envFilePath resolution, so integration
// specs that read process.env directly (tenant-isolation.spec.ts) work the
// same way `pnpm dev` does once `.env` exists — no separate manual export
// step. Missing files are fine: CI sets env vars directly, no .env needed.
for (const file of ["../../.env.local", "../../.env", ".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // file doesn't exist — try the next candidate
  }
}
