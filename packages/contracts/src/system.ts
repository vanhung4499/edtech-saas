import { z } from "zod";

export const tenantSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string(),
});

export type TenantSummary = z.infer<typeof tenantSummarySchema>;
