/**
 * Update seed scripts with validation pattern
 * Uses string replacement instead of regex to avoid injection errors
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TIER1_FILES = [
  // GRAMMAR
  'seed-grammar-phase2.ts', 'seed-grammar-phase3.ts', 'seed-grammar-phase4.ts',
  'seed-grammar-phase5.ts', 'seed-grammar-phase6.ts', 'seed-grammar-phase7.ts',
  'seed-grammar-phase8.ts', 'seed-grammar-phase9.ts', 'seed-grammar-phase10.ts',
  'seed-grammar-phase11.ts', 'seed-grammar-phase12.ts', 'seed-grammar-early-levels.ts',
  // LISTENING
  'seed-listening-phase2.ts', 'seed-listening-phase3.ts', 'seed-listening-phase4.ts',
  'seed-listening-phase5.ts', 'seed-listening-phase6.ts', 'seed-listening-phase7.ts',
  'seed-listening-phase8.ts', 'seed-listening-phase9.ts', 'seed-listening-phase10.ts',
  // READING
  'seed-reading-phase1.ts', 'seed-reading-phase2.ts', 'seed-reading-phase3.ts',
  'seed-reading-phase4.ts', 'seed-reading-phase5.ts', 'seed-reading-phase6.ts',
  'seed-reading-phase7.ts', 'seed-reading-phase8.ts',
  // SPEAKING, WRITING, VOCAB (first phases)
  'seed-speaking-phase1.ts', 'seed-writing-phase1.ts',
];

function hasValidation(content) {
  return content.includes('validateItemBatch') || content.includes('_validation-helper');
}

function updateSeedFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // Skip if already has validation
  if (hasValidation(content)) {
    return { skipped: true };
  }

  // Step 1: Add import after PrismaClient import
  if (!content.includes(`import { validateItemBatch, reportValidationResults }`)) {
    const prismaImportMatch = content.match(/import { PrismaClient } from ['"]@prisma\/client['"];/);
    if (prismaImportMatch) {
      const insertAfter = prismaImportMatch[0];
      const newImport = `import { validateItemBatch, reportValidationResults } from './_validation-helper.js';`;
      content = content.replace(insertAfter, insertAfter + '\n' + newImport);
    }
  }

  // Step 2: Find console.log in main() and add validation after it
  // Pattern: find "async function main()" followed by console.log, then insert validation before the first loop/operation

  // Try different patterns for the loop/operation start
  const patterns = [
    // Pattern 1: for (const item of items)
    {
      search: /for \(const item of items\)/,
      replacement: `const { valid, invalid } = validateItemBatch(items);\n  reportValidationResults(valid.length, invalid.length, invalid);\n  if (invalid.length > 0) {\n    console.error(\`Cannot proceed: \${invalid.length} items failed validation\`);\n    process.exit(1);\n  }\n  for (const item of valid)`
    },
    // Pattern 2: for (const item of reading/writing/speaking/etc items)
    {
      search: /for \(const .+ of \w+Items\)/,
      replacement: (match) => {
        const varName = match.match(/of (\w+Items)/)[1];
        return `const { valid, invalid } = validateItemBatch(${varName});\n  reportValidationResults(valid.length, invalid.length, invalid);\n  if (invalid.length > 0) {\n    console.error(\`Cannot proceed: \${invalid.length} items failed validation\`);\n    process.exit(1);\n  }\n  ${match.replace(/of \w+Items/, `of valid`)}`
      }
    },
  ];

  let updated = false;
  for (const pattern of patterns) {
    if (pattern.search.test(content)) {
      if (typeof pattern.replacement === 'function') {
        content = content.replace(pattern.search, pattern.replacement);
      } else {
        content = content.replace(pattern.search, pattern.replacement);
      }
      updated = true;
      break;
    }
  }

  if (updated) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { updated: true };
  }

  return { error: true };
}

async function main() {
  console.log(`Updating Tier 1 seed files with validation...\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of TIER1_FILES) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      console.log(`⏭️  ${file} (not found)`);
      continue;
    }

    try {
      const result = updateSeedFile(filePath);
      if (result.updated) {
        console.log(`✅ ${file}`);
        updated++;
      } else if (result.skipped) {
        console.log(`⏭️  ${file} (already has validation)`);
        skipped++;
      } else {
        console.log(`⚠️  ${file} (pattern not matched)`);
        errors++;
      }
    } catch (e) {
      console.log(`❌ ${file} (${e.message})`);
      errors++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors:  ${errors}`);
}

main().catch(console.error);
