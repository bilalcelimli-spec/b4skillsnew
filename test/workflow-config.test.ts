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

describe('assessment release safety', () => {
  const ci = parseDocument(readFileSync(resolve(directory, 'ci.yml'), 'utf8')).toJS();
  it('requires real-server and browser assessment checks in the deployment-triggering CI', () => {
    const deploy = parseDocument(readFileSync(resolve(directory, 'deploy.yml'), 'utf8')).toJS();
    expect(deploy.on.workflow_run.workflows).toContain(ci.name);
    for (const [jobId, command] of [
      ['assessment-flows', 'npm run audit:assessment-flows'],
      ['assessment-browser', 'npm run test:item-renderer'],
    ]) {
      const job = ci.jobs[jobId];
      expect(job).toBeDefined();
      expect(job['continue-on-error']).not.toBe(true);
      expect(job.if).toBeUndefined();
      const step = job.steps.find((step: {run?: string}) => step.run === command);
      expect(step).toBeDefined();
      expect(step['continue-on-error']).not.toBe(true);
      expect(step.if).toBeUndefined();
      expect(ci.jobs.docker.needs).toContain(jobId);
    }
  });
  it('pins both runtime and migration targets to the disposable localhost database', () => {
    const env = ci.jobs['assessment-flows'].env;
    const target = new URL(env.B4SKILLS_FLOW_AUDIT_DATABASE_URL);
    expect(['localhost', '127.0.0.1']).toContain(target.hostname);
    expect(target.pathname).toMatch(/^\/all_exams_/);
    expect(env.DATABASE_URL).toBe(target.href);
    expect(env.MIGRATION_DATABASE_URL).toBe(target.href);
    expect(ci.jobs['assessment-flows'].services.postgres.env.POSTGRES_DB).toBe(target.pathname.slice(1));
  });
});
