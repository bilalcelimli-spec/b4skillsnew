import {readFileSync,writeFileSync} from 'node:fs';
import {compareScoringModels} from '../../src/lib/scoring/model-comparison.js';
const [baseline,candidate,output]=process.argv.slice(2).filter(argument=>argument!=='--check');
if(!baseline||!candidate||!output){console.error('Usage: node --import tsx scripts/evaluation/compare-scoring-models.ts baseline.json candidate.json output.json');process.exitCode=1;}
else try{
 const report=compareScoringModels(JSON.parse(readFileSync(baseline,'utf8')),JSON.parse(readFileSync(candidate,'utf8')));
 writeFileSync(output,JSON.stringify(report,null,2),{flag:'wx',mode:0o600});
 console.log(JSON.stringify({status:report.status,paired:report.paired.n,findings:report.findings.length,releaseApproved:false}));
 if(process.argv.includes('--check')&&report.status!=='within_provisional_limits')process.exitCode=2;
}catch{console.error('Model comparison failed: invalid or mismatched evidence, or unavailable output path. No database/provider calls were made.');process.exitCode=1;}
