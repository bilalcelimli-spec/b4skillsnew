/** Fictional layout sample only. No live database access or candidate data. */
import { mkdir, writeFile } from 'node:fs/promises';
import { buildAssessmentReport } from '../src/lib/reporting/assessment-report-model.js';
import { generateAssessmentReportPdf } from '../src/lib/reporting/assessment-report-pdf.js';

const report = buildAssessmentReport({
  id: 'sample-assessment-id', status: 'COMPLETED',
  candidate: { name: 'Sample Candidate' },
  completedAt: '2026-09-30T00:00:00Z',
  theta: -0.05, sem: 0.35,
  scoreReport: {
    id: 'sample-report-id', overallCefr: 'B1', isVerified: false,
    diagnosticReport: {
      productLine: 'General English', overallTheta: -0.05, overallSem: 0.35,
      skillProfiles: {
        READING: { cefrLevel: 'B1' }, LISTENING: { cefrLevel: 'A2' },
        WRITING: { cefrLevel: 'B1' }, SPEAKING: { cefrLevel: 'B1' },
        GRAMMAR: { cefrLevel: 'B2' }, VOCABULARY: { cefrLevel: 'B2' },
      },
    },
  },
}, 'https://b4skills.com');
report.verificationUrl = 'https://b4skills.com/verify/sample-report-id';

await mkdir('output/pdf', { recursive: true });
await writeFile('output/pdf/b4skills-result-report-sample.pdf', await generateAssessmentReportPdf(report, { preview: 'sample' }));
console.log('Created fictional design preview; not a valid assessment result.');
