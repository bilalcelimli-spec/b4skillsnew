/**
 * Exposure Store Bootstrap
 *
 * Loads cumulative item exposure counts from the database into the in-memory
 * ExposureStore on server startup. This ensures Davey-Parshall α-weights and
 * Sympson-Hetter conditional rates survive server restarts so the CAT item
 * selector does not revert to selecting the same highest-information items
 * every time the process is restarted.
 *
 * Background: the ExposureStore controls which items are selected by computing
 * exposure rates r(item) = exposureCount / totalSessions. On a cold start these
 * are all 0, so the D-P α-gate is open for every item and the selector always
 * picks the item with the maximum Fisher information — producing identical exams.
 * After bootstrapping, items that have been over-used have their rates restored
 * and the D-P gate applies appropriate penalties.
 */

import { prisma } from "../prisma.js";
import { bootstrapExposureFromSnapshot } from "./exposure-store.js";

/**
 * Bootstrap the in-memory ExposureStore from the database's item.exposureCount
 * column. Fire-and-forget on startup (errors are non-fatal).
 */
export async function bootstrapExposureFromDb(): Promise<void> {
  try {
    const items = await prisma.item.findMany({
      where: { exposureCount: { gt: 0 } },
      select: { id: true, exposureCount: true },
    });
    if (items.length === 0) return;

    const exposureMap = new Map(items.map((i) => [i.id, i.exposureCount]));

    // Use the maximum single-item exposure as a conservative lower-bound
    // denominator for total sessions. The real session count is likely higher,
    // but this ensures no item gets a rate > 1.0.
    const totalSessions = Math.max(...items.map((i) => i.exposureCount));

    await bootstrapExposureFromSnapshot(exposureMap, totalSessions);

    console.info(
      `[ExposureStore] bootstrapped ${items.length} items from DB ` +
        `(max exposures: ${totalSessions})`,
    );
  } catch (err) {
    console.warn(
      "[ExposureStore] DB bootstrap failed (non-fatal):",
      err instanceof Error ? err.message : String(err),
    );
  }
}
