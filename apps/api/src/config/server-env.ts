import { z } from "zod";

export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  APP_URL: z.string().url().default("http://localhost:3000"),
  API_URL: z.string().url().default("http://localhost:3001"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  AUTH_SECRET: z.string().min(16),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(env: Record<string, unknown>): ServerEnv {
  const result = serverEnvSchema.safeParse(env);

  if (result.success) {
    return result.data;
  }

  const message = result.error.issues
    .map((issue) => {
      const field = issue.path.join(".") || "env";
      return `${field}: ${issue.message}`;
    })
    .join("; ");

  throw new Error(`Invalid server environment: ${message}`);
}
