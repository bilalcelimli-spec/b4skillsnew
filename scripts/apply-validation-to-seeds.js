/**
 * Apply validation pattern to all seed scripts
 * This script adds the validateItemBatch pattern to all seed-*.ts files
 * that don't already have it.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptsDir = __dirname;

function hasValidationPattern(content) {
  return content.includes('validateItemBatch') && content.includes('_validation-helper');
}

function applyValidationPattern(content) {
  // Skip if already has validation
  if (hasValidationPattern(content)) {
    return { modified: false, content };
  }

  // Add import for validation helper
  const importMatch = content.match(/^import .* from ['"]@prisma\/client['"];/m);
  if (!importMatch) {
    return { modified: false, content, error: 'Could not find Prisma import' };
  }

  const insertPoint = importMatch[0].length;
  const importStatement = `import { validateItemBatch, reportValidationResults } from './_validation-helper.js';`;
  const newContent =
    content.substring(0, insertPoint) +
    '\n' +
    importStatement +
    '\n' +
    content.substring(insertPoint);

  // Find the items array and main function
  const mainFunctionMatch = newContent.match(/async function main\(\) \{/);
  if (!mainFunctionMatch) {
    return { modified: false, content: newContent, error: 'Could not find main function' };
  }

  // Find where the database operations begin (usually first prisma.item operation)
  const dbOperationMatch = newContent.match(
    /async function main\(\) \{[\s\S]*?(const inserted|let inserted|for \(const item of items\))/
  );

  if (!dbOperationMatch) {
    return { modified: false, content: newContent, error: 'Could not find database operations' };
  }

  // Insert validation right before the database loop
  const validationCode = `
  const { valid, invalid } = validateItemBatch(items);
  reportValidationResults(valid.length, invalid.length, invalid);
  if (invalid.length > 0) {
    console.error(\`Cannot proceed: \${invalid.length} items failed validation\`);
    process.exit(1);
  }

`;

  // Find the position to insert validation (after "console.log" and before the loop)
  const consoleLogMatch = newContent.match(
    /async function main\(\) \{([\s\S]*?)(for \(const item of items\)|const inserted|let inserted)/
  );

  if (consoleLogMatch) {
    const insertPos = consoleLogMatch[0].lastIndexOf(consoleLogMatch[2]);
    const finalContent =
      newContent.substring(0, insertPos) +
      validationCode +
      newContent.substring(insertPos);

    return { modified: true, content: finalContent };
  }

  return { modified: false, content: newContent, error: 'Could not insert validation code' };
}

async function main() {
  const files = fs.readdirSync(scriptsDir)
    .filter(f => f.startsWith('seed-') && f.endsWith('.ts'))
    .filter(f => f !== 'seed-grammar-phase1.ts'); // Already has validation

  console.log(`Found ${files.length} seed files to update\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    const filePath = path.join(scriptsDir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      if (hasValidationPattern(content)) {
        console.log(`⏭️  ${file} (already has validation)`);
        skipped++;
        continue;
      }

      const result = applyValidationPattern(content);

      if (result.modified) {
        fs.writeFileSync(filePath, result.content, 'utf-8');
        console.log(`✅ ${file}`);
        updated++;
      } else {
        console.log(`⚠️  ${file} (${result.error})`);
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
  console.log(`   Total:   ${files.length}`);
}

main().catch(console.error);
