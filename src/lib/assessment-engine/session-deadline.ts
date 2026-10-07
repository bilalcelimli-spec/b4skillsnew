/** The same inclusive deadline applies to item delivery and answer acceptance. */
export function sessionDeadlineReached(startedAt:Date|string|null|undefined,maxDurationMs:number,now=Date.now()) {
  if(!startedAt||!Number.isFinite(maxDurationMs)||maxDurationMs<=0)return false;
  const start=new Date(startedAt).getTime();
  return Number.isFinite(start)&&now>=start+maxDurationMs;
}
