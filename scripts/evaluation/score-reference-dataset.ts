/** Offline only: no database, model API or candidate response content is needed. */
import {readFileSync,writeFileSync} from 'node:fs';
import {evaluateReferenceDataset} from '../../src/lib/scoring/reference-evaluation.js';
const [input,output]=process.argv.slice(2);
if(!input||!output){console.error('Usage: node --import tsx scripts/evaluation/score-reference-dataset.ts input.json output.json');process.exitCode=1;}
else try{
 const report=evaluateReferenceDataset(JSON.parse(readFileSync(input,'utf8')));
 writeFileSync(output,JSON.stringify(report,null,2),{mode:0o600,flag:'wx'});
 console.log(JSON.stringify({holdout:report.holdout,autoScored:report.autoScored,review:report.review,unavailable:report.unavailable,releaseApproved:false}));
}catch{console.error('Reference evaluation failed: invalid dataset or unavailable output path. No database or provider calls were made.');process.exitCode=1;}
