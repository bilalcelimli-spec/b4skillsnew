import { getProfile } from './profiles';
import { OZGUN_PRODUCT, OZGUN_SECTIONS, OZGUN_TITLE } from '../fixed-forms/ozgun-kids';
import { RESUME_WINDOW_MS } from '../assessment-engine/session-pause';

/** Candidate-facing facts derived from the same profiles as server delivery. */
export function assessmentPresentation(productLine?: string) {
  const fixed = productLine === OZGUN_PRODUCT;
  const profile = getProfile(productLine);
  const skills = (fixed ? OZGUN_SECTIONS.map(section => section.skill) : profile.sectionOrder)
    .map(skill => skill.charAt(0) + skill.slice(1).toLowerCase());
  const duration = fixed ? OZGUN_SECTIONS.reduce((sum, section) => sum + section.minutes, 0).toString()
    : `${profile.estimatedDurationMin[0]}–${profile.estimatedDurationMin[1]}`;
  return { fixed, title: fixed ? OZGUN_TITLE : profile.displayName ?? profile.name,
    duration, skills, resumeHours: RESUME_WINDOW_MS / 3600000 };
}
