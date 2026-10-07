import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseDocument } from 'yaml';
import { describe, expect, it } from 'vitest';

const directory = resolve('.github/workflows');
describe('GitHub workflow validity', () => {
  for (const filename of readdirSync(directory).filter(name => /\.ya?ml$/.test(name))) {
    it(`${filename} has valid YAML without duplicate mapping keys`, () => {
      const document = parseDocument(readFileSync(resolve(directory, filename), 'utf8'), { uniqueKeys: true });
      expect(document.errors.map(error => error.message)).toEqual([]);
      const workflow = document.toJS();
      expect(workflow.on).toBeDefined();
      expect(Object.keys(workflow.jobs).length).toBeGreaterThan(0);
    });
  }
});
