export function inAudioRepairScope(item: { skill: string; status: string; metadata?: unknown }, includeQuarantined = false): boolean {
  if (item.skill !== 'LISTENING') return false;
  if (['ACTIVE', 'PRETEST'].includes(item.status)) return true;
  const metadata = item.metadata as { editorialQuarantine?: { reason?: string } } | null;
  return includeQuarantined && item.status === 'REVIEW'
    && metadata?.editorialQuarantine?.reason === 'LEGACY_DIALOGUE_REPAIR_QUOTA_BLOCKED';
}
