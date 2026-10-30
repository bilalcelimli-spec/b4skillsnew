/**
 * Persistence for Davey–Parshall α tables (alpha-table.ts): one SystemConfig
 * row (`dp-alpha-tables`) holding a table per profile, shared by every
 * instance. Loaded at startup (exposure-bootstrap.ts), refreshed every
 * ALPHA_TABLE_TTL_MS, written by scripts/jobs/exposure-alpha-table.ts.
 */

import type { PrismaClient } from "@prisma/client";
import { ALPHA_TABLE_CONFIG_ID, ALPHA_TABLE_TTL_MS, type AlphaTable, type AlphaTables } from "./alpha-table.js";
import { applyAlphaTables } from "./cat-selector.js";

type AlphaClient = Pick<PrismaClient, "systemConfig">;

function isAlphaTable(value: unknown): value is AlphaTable {
  const t = value as AlphaTable | null;
  return !!t && typeof t === "object" && typeof t.profile === "string" && typeof t.kMax === "number" &&
    Array.isArray(t.stratumSessions) && !!t.alphas && typeof t.alphas === "object";
}

export async function loadAlphaTables(db: AlphaClient): Promise<AlphaTables> {
  const row = await db.systemConfig.findUnique({ where: { id: ALPHA_TABLE_CONFIG_ID } });
  const config = (row?.config ?? null) as { tables?: Record<string, unknown> } | null;
  const tables: AlphaTables = {};
  for (const [profile, table] of Object.entries(config?.tables ?? {})) {
    if (isAlphaTable(table)) tables[profile] = table;
  }
  return tables;
}

export async function saveAlphaTables(db: AlphaClient, tables: AlphaTables, writtenBy: string): Promise<void> {
  const config = { tables, writtenBy, writtenAt: new Date().toISOString() };
  await db.systemConfig.upsert({
    where: { id: ALPHA_TABLE_CONFIG_ID },
    create: { id: ALPHA_TABLE_CONFIG_ID, config: config as object },
    update: { config: config as object },
  });
}

/** Load the tables and install them into the live selectors. Null when none are stored. */
export async function loadAndApplyAlphaTables(db: AlphaClient): Promise<{ profiles: number; cells: number } | null> {
  const tables = await loadAlphaTables(db);
  if (Object.keys(tables).length === 0) return null;
  return applyAlphaTables(tables);
}

let refreshTimer: NodeJS.Timeout | null = null;

/** Periodic refresh so a table written by the job reaches running instances without a restart. */
export function scheduleAlphaTableRefresh(db: AlphaClient, intervalMs = ALPHA_TABLE_TTL_MS): void {
  if (refreshTimer) return;
  refreshTimer = setInterval(() => {
    loadAndApplyAlphaTables(db).catch(() => { /* best effort; next tick retries */ });
  }, intervalMs);
  refreshTimer.unref?.();
}
