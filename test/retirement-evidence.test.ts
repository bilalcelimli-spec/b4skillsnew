import { expect, it, vi } from 'vitest';
vi.mock('../src/lib/prisma.js',()=>({prisma:{item:{findUnique:vi.fn()},response:{findMany:vi.fn()}}}));
vi.mock('../src/lib/observability/logger.js',()=>({logger:{info:vi.fn()}}));
import { ItemRetirementService } from '../src/lib/assessment-engine/item-retirement-service.js';
import { prisma } from '../src/lib/prisma.js';
it('analyzes prefetched evidence without one database query per item',async()=>{
  const result=await ItemRetirementService.computeRetirementScore('item',{item:{discrimination:1,difficulty:0,guessing:0.25},
    responses:Array.from({length:50},(_,i)=>({score:i%2,isCorrect:i%2===1,session:{theta:0}}))});
  expect(result.recommendation).toBe('KEEP');
  expect(prisma.item.findUnique).not.toHaveBeenCalled();expect(prisma.response.findMany).not.toHaveBeenCalled();
});
it('does not retire an item from pending or failed placeholder scores',async()=>{
  const result=await ItemRetirementService.computeRetirementScore('item',{item:{discrimination:0.05,difficulty:4,guessing:0.25},
    responses:Array.from({length:100},()=>({score:0.5,isCorrect:true,metadata:{scoreSource:'ai_unavailable'},session:{theta:0}}))});
  expect(result.recommendation).toBe('KEEP');expect(result.reasoning).toContain('Insufficient');
});
