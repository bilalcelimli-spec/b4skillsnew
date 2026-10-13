import { PRODUCT_LINE_PROFILES, resolveProfileName } from './profiles';
import { OZGUN_PRODUCT, OZGUN_TITLE } from '../fixed-forms/ozgun-kids';

export const ASSESSMENT_OPTIONS = [
  ...Object.values(PRODUCT_LINE_PROFILES).map(profile => ({value: profile.name as string, label: profile.displayName ?? profile.name})),
  {value: OZGUN_PRODUCT, label: OZGUN_TITLE},
];
export function resolveAssessmentProduct(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (value.trim() === OZGUN_PRODUCT) return OZGUN_PRODUCT;
  return resolveProfileName(value);
}
