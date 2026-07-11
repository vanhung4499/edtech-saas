import { Inject, Injectable } from "@nestjs/common";
import { withTenant, type Db, type TenantTx } from "../../database";
import { TenantContext } from "../tenant/tenant-context";
import { DB } from "./db.provider";

@Injectable()
export class Database {
  constructor(@Inject(DB) private readonly db: Db) {}

  run<T>(fn: (tx: TenantTx) => Promise<T>): Promise<T> {
    return withTenant(this.db, TenantContext.tenantId(), fn);
  }
}
