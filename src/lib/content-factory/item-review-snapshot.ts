import { createHash } from 'node:crypto';
const contextFields = ['construct','subskill','descriptorRef','evidenceStatement','ageSuitability','culturalLoad','englishVariant','register','genre','topic','provenance','securityClass'] as const;
export type ReviewSnapshot = {type:string;skill:string;cefrLevel:string;content:unknown} & Partial<Record<typeof contextFields[number],string|null>> & {tags?:string[]};
/** Stable object key order; array order (including answer alternatives) is significant. */
function canonical(value: any): string {
  if (Array.isArray(value)) return '['+value.map(v=>canonical(v ?? null)).join(',')+']';
  if (value && typeof value==='object') return '{'+Object.keys(value).filter(k=>value[k]!==undefined).sort()
    .map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
  return JSON.stringify(value ?? null);
}
export function itemReviewHash(item: ReviewSnapshot): string {
  const snapshot:Record<string,unknown>={schema:'b4skills-item-review-v1',tags:item.tags??[],type:item.type,skill:item.skill,cefrLevel:item.cefrLevel,content:item.content};
  for(const field of contextFields)snapshot[field]=item[field] ?? null;
  return createHash('sha256').update(canonical(snapshot)).digest('hex');
}
