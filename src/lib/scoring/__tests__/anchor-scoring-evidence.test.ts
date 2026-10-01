import {beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({config:vi.fn(),upsert:vi.fn(),grade:vi.fn()}));
vi.mock('../../prisma',()=>({prisma:{systemConfig:{findUnique:mocks.config,upsert:mocks.upsert}}}));
vi.mock('../scoring-orchestrator',()=>({ScoringOrchestrator:{scoreWriting:mocks.grade}}));
vi.mock('../../observability/index',()=>({logger:{info:vi.fn(),error:vi.fn()}}));
import {AnchorCalibrationService} from '../anchor-calibration-service';
const anchors=[{id:'a',skill:'WRITING',content:'Essay one',prompt:'Task',expertScore:.5},{id:'b',skill:'WRITING',content:'Essay two',prompt:'Task',expertScore:.5}];
beforeEach(()=>{vi.clearAllMocks();mocks.upsert.mockResolvedValue({});});
describe('anchor validation evidence',()=>{
 it('does not report that calibration passed without an anchor corpus',async()=>{
  mocks.config.mockResolvedValue({config:{anchorSet:[]}});
  expect((await AnchorCalibrationService.runCalibration()).meetsThreshold).toBe(false);
 });
 it('excludes outage placeholders and refuses a partial validation pass',async()=>{
  mocks.config.mockResolvedValue({config:{anchorSet:anchors}});
  mocks.grade.mockResolvedValueOnce({score:.5,scoreSource:'ai_auto'}).mockResolvedValueOnce({score:.5,scoreSource:'ai_unavailable'});
  const result=await AnchorCalibrationService.runCalibration();
  expect(result.scoredItems).toBe(1);expect(result.mae).toBe(0);expect(result.meetsThreshold).toBe(false);
 });
});
