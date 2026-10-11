/** Explicit editorial revisions; substantive replacements stay outside delivery pending review. */
import { normalizeWritingAliases, writingWordRange } from './writing-content-audit.js';

export const BURNOUT_PROMPT = `Use the fictional research notes below to write an executive summary of 200–250 words for senior stakeholders. Do not invent additional findings or present these figures as real research.

Fictional research notes:
• Purpose: investigate reported burnout, working conditions and staff retention in twelve financial services firms over six months.
• Method: an anonymous survey of 1,240 employees, followed by interviews with 40 volunteers. These are self-reports, not clinical diagnoses; the sample may not represent the whole sector.
• Finding 1: 58% of survey respondents reported feeling exhausted by work at least three days a week.
• Finding 2: 71% reported that overtime was routinely expected. Interviewees described difficulty raising workload concerns with managers.
• Finding 3: 36% said they were considering leaving within a year because of workload. The survey cannot establish cause and effect.
• Proposed actions: review staffing and overtime, train managers to discuss workload safely, and monitor wellbeing and retention quarterly.

Include the purpose and scope, three findings supported by the supplied figures, the main recommendations, a limitation, and a concluding statement on urgency.`;

export const BURNOUT_SAMPLE = `This fictional six-month study explored reported burnout, working conditions and retention in twelve financial services firms. An anonymous survey of 1,240 employees was supplemented by interviews with 40 volunteers. Its purpose was to identify concerns that senior stakeholders could address through changes to working practices.

Three findings require attention. First, 58% of survey respondents reported feeling exhausted by work at least three days each week. This suggests that frequent exhaustion was common within the participating group, although the responses do not amount to clinical diagnoses. Second, 71% said that overtime was routinely expected. Interview participants also described difficulties discussing workload concerns with managers. Third, 36% were considering leaving within a year because of workload, indicating a potential retention problem.

We recommend that participating firms review staffing levels and expectations about overtime, provide managers with training in safe and constructive workload discussions, and monitor employee wellbeing and retention every quarter. These measures would allow leaders to assess whether practical changes are associated with improvements over time.

The findings should be interpreted cautiously: self-reported experiences from these firms may not represent the wider sector, and the survey cannot establish causal relationships. Nevertheless, the scale of reported exhaustion and intentions to leave warrants prompt action, followed by regular evaluation.`;

export const SOCIAL_CAPITAL_SAMPLE = `Social capital describes networks and reciprocal relationships that support collective action. Putnam distinguishes bonding ties within similar groups from bridging ties between different groups. Critics argue that this approach can explain disadvantage through weak community connections while overlooking structural inequality, discrimination and unequal access to resources. Bourdieu instead places social capital within a theory of social reproduction: access to useful networks varies by class and can preserve existing inequalities. The passage therefore contrasts an emphasis on community cohesion with an account of how networks contribute to the persistence of social divisions.`;

export function reviewedWritingRevision(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const c = value as Record<string, any>, prompt = String(c.prompt ?? ''), range = writingWordRange(c);
  let next: Record<string, any>, reason: string, substantive = false;
  if (prompt.startsWith('Continue this story in 110–150 words:') && range.min === 110 && range.max === 160) {
    next = { ...c, wordRange: { ...c.wordRange, min: 110, max: 150 } };
    reason = 'ALIGN_STORY_EDITOR_WITH_AUTHORED_INSTRUCTIONS';
  } else if (prompt.startsWith('Summarise the following passage in 150–180 words,') && range.min === 160 && range.max === 220) {
    next = { ...c, prompt: prompt.replace('150–180 words', '90–120 words'),
      wordRange: { ...c.wordRange, min: 90, max: 120 }, sampleAnswer: SOCIAL_CAPITAL_SAMPLE };
    reason = 'MAKE_SUMMARY_SHORTER_THAN_SOURCE'; substantive = true;
  } else if (prompt.startsWith('You have conducted a six-month research project on employee burnout') && range.min === 200 && range.max === 270) {
    next = { ...c, prompt: BURNOUT_PROMPT, wordRange: { ...c.wordRange, min: 200, max: 250 }, sampleAnswer: BURNOUT_SAMPLE };
    reason = 'SUPPLY_EXPLICIT_FICTIONAL_RESEARCH_NOTES'; substantive = true;
  } else return null;
  next = normalizeWritingAliases(next) ?? next;
  return { next, reason, substantive };
}
