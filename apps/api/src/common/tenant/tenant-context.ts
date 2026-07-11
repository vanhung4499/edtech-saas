import { AsyncLocalStorage } from "node:async_hooks";

export type TenantScope = {
  tenantId: string;
  userId: string | null;
  branchIds: string[] | "ALL";
  roles: string[];
};

const storage = new AsyncLocalStorage<TenantScope>();

// AsyncLocalStorage over request-scoped providers: costs nothing per request
// and works identically in the worker, which has no HTTP request to scope to
// (04-tenancy-and-data-scope.md §5).
export const TenantContext = {
  run<T>(scope: TenantScope, fn: () => T): T {
    return storage.run(scope, fn);
  },
  current(): TenantScope | undefined {
    return storage.getStore();
  },
  require(): TenantScope {
    const scope = storage.getStore();

    if (!scope) {
      throw new Error("TenantContext is not set — call TenantContext.run() first");
    }

    return scope;
  },
  tenantId(): string {
    return TenantContext.require().tenantId;
  },
};
