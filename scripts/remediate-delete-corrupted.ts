/**
 * Remediation Script: Delete Corrupted Items
 *
 * Deletes 13 items with zero options, serialization errors, or missing prompts.
 * These items cannot be salvaged and must be removed.
 *
 * Usage:
 *   DRY_RUN=1 npx tsx scripts/remediate-delete-corrupted.ts  # Preview
 *   npx tsx scripts/remediate-delete-corrupted.ts             # Apply
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const isDryRun = process.env.DRY_RUN === "1";

async function main() {
  console.log(`🗑️  Deleting corrupted items...\n`);
  if (isDryRun) {
    console.log("   (DRY RUN MODE - no changes will be made)\n");
  }

  // Items to delete: 9 zero-options + 3 serialization-error + 1 missing-prompt
  const itemsToDelete = [
    // Zero-options items (READING)
    "cmovo3i130027nunkjzyqongl",
    "cmovo3i3w0029nunky6wet76x",
    "cmovo3i2i0028nunkruy31wv2",
    "cmovo3hvt0025nunk30j0fd76",
    "cmovo3hzo0026nunkwlttmng0",
    "cmovo3i59002anunktckoj3cp",
    // Zero-options items (GRAMMAR)
    "cmp4ilst9001uo7aprz5zhnib",
    "cmp4izkjw002bo7ap4ux44dcf",
    "cmp4hurh0000xo7apxfffebmm",
    // Serialization-error items (GRAMMAR)
    "cmp4hf8af000fo7apet7r3iae",
    "cmp4ieikq001lo7apur52tkdd",
    "cmp4j5mru002io7ap7ywbkk7o",
    // Missing-prompt item (GRAMMAR)
    "cmp4h48kc0000o7apfpa37y5o",
  ];

  console.log(`Found ${itemsToDelete.length} corrupted items to delete.\n`);

  if (isDryRun) {
    for (const id of itemsToDelete) {
      console.log(`  - ${id}`);
    }
    console.log(
      `\n✓ DRY RUN: Would delete ${itemsToDelete.length} items. Run without DRY_RUN=1 to apply.\n`
    );
    return;
  }

  console.log(`⚠️  Deleting ${itemsToDelete.length} corrupted items...\n`);

  let deleted = 0;
  for (const id of itemsToDelete) {
    try {
      await prisma.item.delete({ where: { id } });
      deleted++;
      console.log(`  ✓ Deleted [${id}]`);
    } catch (error) {
      console.error(`  ✗ Failed [${id}]:`, error);
    }
  }

  console.log(`\n✨ Deleted ${deleted}/${itemsToDelete.length} items successfully!\n`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
