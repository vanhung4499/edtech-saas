import { z } from "zod";

export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  AUTH_SECRET: z.string().min(16),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
