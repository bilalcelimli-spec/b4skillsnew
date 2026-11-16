// Used by the authenticated scheduled workflow. Reports contain counts, never response content.
const base = process.env.APP_URL, secret = process.env.INTERNAL_API_SECRET;
if (!base || !secret) throw Error('APP_URL and INTERNAL_API_SECRET required');
const dryRun = process.env.DRY_RUN !== 'false';
let cursors;
for (let page = 0; page < 100; page++) {
  const response = await fetch(`${base.replace(/\/$/, '')}/api/admin/data-retention/run`, {
    method:'POST', headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/json','User-Agent':'B4SkillsOps/1.0'},
    body:JSON.stringify({dryRun,cursors,policyVersion:'2026-11-04-retention-v1'}),signal:AbortSignal.timeout(120000),
  });
  if (!response.ok) throw Error(`Retention failed: HTTP ${response.status}; inspect the restricted run ledger`);
  const result = await response.json();
  if (result.dryRun !== dryRun || !result.next || !result.eligible) throw Error('Invalid retention response');
  console.log(JSON.stringify({page,dryRun,eligible:result.eligible,held:result.held,errors:result.errors,storage:result.storage}));
  if (result.errors || result.storage.failed) throw Error('Retention contains incomplete deletions');
  if (Object.values(result.next).every(v=>v==='__done__')) {
    if (!dryRun && result.storage.pending) throw Error('Storage deletion retries remain pending');
    process.exit(0);
  }
  cursors=result.next;
}
throw Error('Retention pagination limit reached; inspect the restricted run ledger');
