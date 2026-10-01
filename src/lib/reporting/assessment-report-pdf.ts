import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import fs from 'node:fs';
import path from 'node:path';
import { CEFR_META } from '../cefr/cefr-framework.js';
import { PRACTICE, practicePriorities, type AssessmentReport } from './assessment-report-model.js';
import { CEFR_GUIDE_SOURCE, skillLevelGuide } from './skill-level-guide.js';

// Existing App.tsx wordmark / favicon: magenta with a yellow accent.
const C = { navy: '#9B276C', blue: '#9B276C', yellow: '#FDE047', ink: '#30202C', muted: '#675763', line: '#E9DCE4', light: '#FBF5F9', white: '#FFFFFF' };
const W = 595.28, H = 841.89, M = 42, WIDTH = W - 2 * M;
const label = (skill: string) => skill[0] + skill.slice(1).toLowerCase();
const band = (cefr: string | null) => cefr === 'PRE_A1' ? 'Pre-A1' : cefr ?? 'Not available';
const dateLabel = (value: Date | null) => value ? value.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : 'Not available';

/** Three-page candidate report with a vector brand mark and level-specific guidance. */
export async function generateAssessmentReportPdf(report: AssessmentReport, options: { preview?: 'source' | 'sample' } = {}): Promise<Buffer> {
  const fonts = ['dist/fonts', 'public/fonts'].map(dir => path.resolve(process.cwd(), dir));
  const fontDir = fonts.find(dir => fs.existsSync(path.join(dir, 'NotoSans-Regular.ttf')) && fs.existsSync(path.join(dir, 'NotoSans-Bold.ttf')));
  if (!fontDir) throw new Error('Report Unicode fonts are missing');
  const qr = report.verificationUrl ? await QRCode.toBuffer(report.verificationUrl, { width: 240, margin: 1, errorCorrectionLevel: 'M' }) : null;
  const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true, info: {
    Title: `B4Skills assessment report - ${report.candidateName}`,
    Author: 'B4Skills', Subject: 'English assessment results and learning guide',
  } });
  doc.registerFont('Regular', path.join(fontDir, 'NotoSans-Regular.ttf'));
  doc.registerFont('Bold', path.join(fontDir, 'NotoSans-Bold.ttf'));
  const chunks: Buffer[] = [];
  const result = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  const text = (value: string, x: number, y: number, width: number, size = 10, bold = false, color = C.ink, extra: PDFKit.Mixins.TextOptions = {}) => {
    doc.font(bold ? 'Bold' : 'Regular').fontSize(size).fillColor(color).text(value, x, y, { width, lineGap: 2, ...extra });
  };
  const box = (x: number, y: number, width: number, height: number, color = C.light) => doc.roundedRect(x, y, width, height, 8).fill(color);
  const section = (number: string, title: string, y: number) => {
    text(number, M, y, 25, 10, true, C.blue);
    text(title, M + 29, y - 2, WIDTH - 29, 13, true);
  };
  const header = (subtitle: string) => {
    // Reproduce the site's existing skewed b4skills wordmark as sharp PDF vectors.
    doc.save().transform(1, 0, -0.105, 1, M + 4, 23);
    doc.roundedRect(0, 0, 153, 39, 3).fill(C.navy);
    text('b4skills', 9, 1, 140, 25, true, C.white);
    doc.restore();
    text(subtitle, M, 72, WIDTH, 10, false, C.muted);
    text('ENGLISH ASSESSMENT', W - M - 170, 34, 170, 9, true, C.navy, { align: 'right' });
    doc.rect(M, 97, WIDTH, 2).fill(C.navy);
    doc.rect(M, 97, 74, 3).fill(C.yellow);
  };
  const footer = (page: number) => {
    doc.moveTo(M, 788).lineTo(W - M, 788).lineWidth(0.6).strokeColor(C.line).stroke();
    text('B4Skills | Confidential candidate report', M, 799, WIDTH - 75, 8, false, C.muted);
    text(`${page} / 3`, W - M - 55, 799, 55, 8, true, C.muted, { align: 'right' });
  };

  header('Assessment results | Overview');
  text(report.candidateName, M, 116, WIDTH, 20, true, C.ink, { height: 57, ellipsis: true });
  text(report.productLine, M, 179, 325, 10, false, C.muted, { height: 16, ellipsis: true });
  text(`Completed: ${dateLabel(report.completedAt)} (UTC)`, M, 198, 310, 9, false, C.muted);
  text(`Status: ${report.status}`, W - M - 160, 198, 160, 9, true, C.blue, { align: 'right' });
  // Email is intentionally omitted: the report already identifies the candidate.
  box(M, 228, WIDTH, 111, C.navy);
  text('OVERALL CEFR LEVEL', M + 20, 243, 200, 9, true, C.yellow);
  text(band(report.cefr), M + 20, 260, 190, 36, true, C.white);
  text(report.cefr ? CEFR_META[report.cefr].group + ' user' : 'Result not available', M + 20, 312, 220, 9, false, '#F4DCEB');
  text('B4SKILLS SCORE', M + 276, 243, 195, 9, true, C.yellow);
  text(report.beps === null ? '--' : `${report.beps}`, M + 276, 264, 120, 30, true, C.white);
  text('/ 1000', M + 386, 280, 100, 12, false, '#F4DCEB');
  text('BEPS - platform scale, not percent correct', M + 276, 313, 215, 8, false, '#F4DCEB');
  text(options.preview === 'source' ? 'DESIGN PREVIEW: transcribed from the supplied PDF; not a reissued or revalidated result.' : options.preview === 'sample' ? 'DESIGN PREVIEW: fictional sample data; not a valid assessment result.' : report.provisional ? 'PROVISIONAL: scoring or completion is pending. Do not use this as a final result.' : `Overall estimate: ${band(report.cefr)}. Skill results can differ from the overall level.`, M, 351, WIDTH, 9, !!options.preview || report.provisional, options.preview || report.provisional ? C.blue : C.muted);

  section('01', 'Skill profile', 390);
  box(M, 418, WIDTH, 29);
  text('Skill / construct', M + 12, 425, 270, 9, true, C.muted);
  text('CEFR / status', M + 293, 425, 110, 9, true, C.muted);
  text('Tasks', W - M - 97, 425, 85, 9, true, C.muted, { align: 'right' });
  report.skills.forEach((s, index) => {
    const y = 454 + index * 35;
    text(label(s.skill), M + 12, y, 115, 10, true);
    text(PRACTICE[s.skill].meaning, M + 124, y + 2, 158, 8, false, C.muted);
    text(s.cefr ? band(s.cefr) : s.state, M + 293, y, 112, s.cefr ? 10 : 8, !!s.cefr, s.cefr ? C.blue : C.muted);
    text(s.count === null ? '--' : String(s.count), W - M - 70, y, 58, 10, false, C.ink, { align: 'right' });
    doc.moveTo(M, y + 28).lineTo(W - M, y + 28).strokeColor(C.line).lineWidth(0.5).stroke();
  });
  text('Grammar and vocabulary are supporting constructs, not additional communication skills. Missing results are not assigned the overall level. Task counts exclude pretest items.', M + 12, 671, WIDTH - 24, 8, false, C.muted);

  box(M, 711, WIDTH, 64);
  if (qr && report.verificationUrl) {
    doc.image(qr, W - M - 58, 717, { width: 52, height: 52 });
    text(options.preview === 'source' ? 'Source verification link (not checked)' : options.preview ? 'Example verification link' : 'Verify this report', M + 12, 719, 320, 10, true);
    text(`Report ID: ${report.reportId}`, M + 12, 736, WIDTH - 90, 8, false, C.muted);
    text('Open secure verification or scan the QR code', M + 12, 754, WIDTH - 90, 8, false, C.blue, { link: report.verificationUrl, underline: true });
  } else {
    text('No verification link issued with this report', M + 12, 722, WIDTH - 24, 10, true);
    text('Check the assessment status with your provider. This PDF does not certify identity or proctoring compliance.', M + 12, 744, WIDTH - 24, 8, false, C.muted);
  }
  footer(1);

  doc.addPage();
  header('CEFR skill levels | Detailed interpretation');
  section('02', 'Your skill levels explained', 119);
  text('Typical level expectations, not a claim that every ability below was observed in this test. Grammar and vocabulary are supporting linguistic constructs.', M, 148, WIDTH, 9, false, C.muted);
  const cardWidth = (WIDTH - 14) / 2;
  const measure = (value: string, size: number) => doc.font('Regular').fontSize(size).heightOfString(value, { width: cardWidth - 26, lineGap: 2 });
  const guides = report.skills.map(s => skillLevelGuide(s.skill, s.cefr));
  const cardHeights = guides.map(g => Math.max(128, 39 + g.capabilities.reduce((sum, c) => sum + measure(`- ${c}`, 8.5) + 7, 0) + 18 + measure(g.nextFocus, 8) + 13));
  const rowHeights = [0, 1, 2].map(row => Math.max(cardHeights[row * 2], cardHeights[row * 2 + 1]));
  report.skills.forEach((s, i) => {
    const row = Math.floor(i / 2);
    const x = M + (i % 2) * (cardWidth + 14), y = 188 + rowHeights.slice(0, row).reduce((sum, height) => sum + height + 10, 0);
    const guide = guides[i];
    box(x, y, cardWidth, rowHeights[row]);
    doc.rect(x + 13, y + 15, 3, 17).fill(C.yellow);
    text(`${label(s.skill)} | ${s.cefr ? band(s.cefr) : s.state}`, x + 24, y + 12, cardWidth - 37, 11, true, C.navy);
    let lineY = y + 39;
    for (const capability of guide.capabilities) {
      const message = `- ${capability}`;
      text(message, x + 13, lineY, cardWidth - 26, 8.5);
      lineY += measure(message, 8.5) + 7;
    }
    text(guide.nextLevel ? `Development target: ${band(guide.nextLevel)}` : s.cefr ? 'Maintain and extend' : 'No level-specific interpretation', x + 13, lineY, cardWidth - 26, 8, true, C.navy);
    text(guide.nextFocus, x + 13, lineY + 18, cardWidth - 26, 8, false, C.muted);
  });
  text('Source: Council of Europe, CEFR Companion Volume (2020). Communication descriptors use the platform\'s CEFR guide; grammar/vocabulary summaries are platform paraphrases. Development targets are learning goals, not predicted results.', M, 740, WIDTH, 8, false, C.muted);
  text('Read the CEFR reference', M, 774, WIDTH, 8, false, C.navy, { link: CEFR_GUIDE_SOURCE, underline: true });
  footer(2);

  doc.addPage();
  header('Understanding your results | Learning guide');
  section('03', 'What the result means', 119);
  text(report.cefr ? CEFR_META[report.cefr].summary : 'A final overall result is not available for this assessment.', M, 147, WIDTH, 11);
  text('This is an overall estimate, not evidence that every skill is at the same level. Use the individual skill profile when planning learning or making placement decisions.', M, 195, WIDTH, 9, false, C.muted);

  section('04', 'Suggested practice priorities', 243);
  text('General study guidance based on the lowest reported skill bands. These suggestions are not an item-level error diagnosis or a prediction of score improvement.', M, 269, WIDTH, 9, false, C.muted);
  const priorities = practicePriorities(report);
  priorities.forEach((s, i) => {
    const y = 315 + i * 77;
    box(M, y, WIDTH, 68);
    text(`${i + 1}. ${label(s.skill)} | ${band(s.cefr)}`, M + 13, y + 9, WIDTH - 26, 10, true, C.blue);
    text(PRACTICE[s.skill].action, M + 13, y + 29, WIDTH - 26, 9);
  });
  if (!priorities.length) text('Skill-level results are not available. Request the completed report before choosing assessment-based practice priorities.', M, 319, WIDTH, 10);

  section('05', 'Measurement and responsible use', 560);
  const uncertainty = report.interval
    ? `Model-based 95% interval: BEPS ${report.interval.lower}-${report.interval.upper} (CEFR ${band(report.interval.cefrLower)}-${band(report.interval.cefrUpper)}). It reflects estimated measurement uncertainty, not a guarantee of proficiency.`
    : 'A measurement interval is not available; uncertainty must not be assumed to be zero.';
  text(uncertainty, M, 588, WIDTH, 9);
  text(`Technical detail: ability estimate (theta) ${report.theta === null ? 'not available' : report.theta.toFixed(2)}; standard error (SEM) ${report.sem === null ? 'not available' : report.sem.toFixed(2)}. BEPS is the platform\'s 0-1000 transformation of theta.`, M, 637, WIDTH, 9, false, C.muted);
  text('CEFR labels use the platform\'s configured thresholds. This document does not establish external validation, accreditation, or equivalence to IELTS, TOEFL or another examination. For high-stakes decisions, use additional evidence and the relevant organisation\'s acceptance policy.', M, 681, WIDTH, 8, false, C.muted);
  text(`Assessment ID: ${report.sessionId}\nValid until: ${dateLabel(report.validUntil)} | Generated: ${dateLabel(report.generatedAt)} (UTC)`, M, 741, WIDTH, 8, false, C.muted, { height: 39, ellipsis: true });
  footer(3);
  doc.end();
  return result;
}
