/**
 * LinguAdapt Stimulus Bank
 *
 * Stimulus texts (reading passages, listening scripts) are the most expensive
 * content to produce. This module provides:
 *
 *  — Centralised stimulus creation and storage (DB-backed via Prisma)
 *  — CEFR certification of stimuli (readability gate before approval)
 *  — Stimulus reuse across multiple items (Cambridge/IELTS practice)
 *  — Exposure tracking to prevent over-use in CAT contexts
 *  — Genre + skill tagging for targeted retrieval
 *
 * Design principle:
 *  One stimulus can anchor up to STIMULUS_MAX_ITEMS items before it is
 *  retired from new-item generation (preventing corpus exhaustion).
 *
 * Stimulus lifecycle:
 *  DRAFT → CERTIFIED (readability passes gate) → ACTIVE → RETIRED
 */

import { analyseText, type LinguisticQualityReport } from "./readability-engine.js";
import type { CefrLevel } from "../cefr/cefr-framework.js";
import type { TextGenre } from "./language-skill-framework.js";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const STIMULUS_MAX_ITEMS = 6;        // Max items sharing one stimulus
const STIMULUS_MAX_EXPOSURES = 3;    // Max candidate encounters per stimulus (CAT)

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type StimulusType = "READING" | "LISTENING_SCRIPT" | "CONVERSATION" | "IMAGE_DESC" | "DATA_TABLE" | "DIAGRAM";
export type StimulusStatus = "DRAFT" | "CERTIFIED" | "ACTIVE" | "RETIRED";

export interface Stimulus {
  id: string;
  type: StimulusType;
  cefrLevel: CefrLevel;
  genre: TextGenre;
  title: string;
  text: string;
  wordCount: number;
  status: StimulusStatus;
  readabilityScore: number;
  readabilityReport?: LinguisticQualityReport;
  linkedItemIds: string[];        // Items that use this stimulus
  exposureCount: number;          // Times shown to candidates
  createdAt: Date;
  certifiedAt?: Date;
  source?: string;                // Attribution if text is adapted from a source
  tags: string[];
}

export interface StimulusSearchParams {
  cefrLevel?: CefrLevel;
  genre?: TextGenre;
  type?: StimulusType;
  minWordCount?: number;
  maxWordCount?: number;
  maxLinkedItems?: number;       // Find stimuli below usage limit
  maxExposures?: number;
  status?: StimulusStatus[];
  tags?: string[];
}

export interface StimulusCertificationResult {
  stimulusId: string;
  passed: boolean;
  readabilityScore: number;
  issues: Array<{ severity: string; message: string }>;
  certifiedLevel: CefrLevel | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// IN-MEMORY STIMULUS STORE
// (In production this is replaced by a Prisma-backed adapter)
// ─────────────────────────────────────────────────────────────────────────────

class InMemoryStimulusStore {
  private store = new Map<string, Stimulus>();
  private counter = 0;

  generateId(): string {
    return `stim_${++this.counter}_${Date.now()}`;
  }

  save(stimulus: Stimulus): Stimulus {
    this.store.set(stimulus.id, { ...stimulus });
    return this.store.get(stimulus.id)!;
  }

  findById(id: string): Stimulus | null {
    return this.store.get(id) ?? null;
  }

  search(params: StimulusSearchParams): Stimulus[] {
    const results: Stimulus[] = [];
    for (const s of this.store.values()) {
      if (params.cefrLevel && s.cefrLevel !== params.cefrLevel) continue;
      if (params.genre && s.genre !== params.genre) continue;
      if (params.type && s.type !== params.type) continue;
      if (params.minWordCount !== undefined && s.wordCount < params.minWordCount) continue;
      if (params.maxWordCount !== undefined && s.wordCount > params.maxWordCount) continue;
      if (params.maxLinkedItems !== undefined && s.linkedItemIds.length >= params.maxLinkedItems) continue;
      if (params.maxExposures !== undefined && s.exposureCount >= params.maxExposures) continue;
      if (params.status && !params.status.includes(s.status)) continue;
      if (params.tags && params.tags.length > 0) {
        const hasTag = params.tags.some(t => s.tags.includes(t));
        if (!hasTag) continue;
      }
      results.push({ ...s });
    }
    return results;
  }

  update(id: string, patch: Partial<Stimulus>): Stimulus | null {
    const existing = this.store.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch };
    this.store.set(id, updated);
    return updated;
  }

  count(): number {
    return this.store.size;
  }

  all(): Stimulus[] {
    return Array.from(this.store.values());
  }
}

const store = new InMemoryStimulusStore();

// ─────────────────────────────────────────────────────────────────────────────
// STIMULUS BANK CLASS
// ─────────────────────────────────────────────────────────────────────────────

export class StimulusBank {
  // ── Create & Certify ────────────────────────────────────────────────────────

  /**
   * Add a new stimulus to the bank and run readability certification.
   */
  createStimulus(params: {
    type: StimulusType;
    cefrLevel: CefrLevel;
    genre: TextGenre;
    title: string;
    text: string;
    source?: string;
    tags?: string[];
  }): Stimulus {
    const words = params.text.match(/\b\w+\b/g) ?? [];
    const stimulus: Stimulus = {
      id: store.generateId(),
      type: params.type,
      cefrLevel: params.cefrLevel,
      genre: params.genre,
      title: params.title,
      text: params.text,
      wordCount: words.length,
      status: "DRAFT",
      readabilityScore: 0,
      linkedItemIds: [],
      exposureCount: 0,
      createdAt: new Date(),
      source: params.source,
      tags: params.tags ?? [],
    };
    return store.save(stimulus);
  }

  /**
   * Run the readability certification pass against the target CEFR level.
   * On pass → status becomes CERTIFIED; on fail → stays DRAFT.
   */
  certifyStimulus(id: string): StimulusCertificationResult {
    const s = store.findById(id);
    if (!s) throw new Error(`Stimulus ${id} not found`);

    const report = analyseText(s.text, s.cefrLevel);
    const passed = report.passesQualityGate;

    store.update(id, {
      readabilityScore: report.qualityScore,
      readabilityReport: report,
      status: passed ? "CERTIFIED" : "DRAFT",
      certifiedAt: passed ? new Date() : undefined,
    });

    return {
      stimulusId: id,
      passed,
      readabilityScore: report.qualityScore,
      issues: report.issues,
      certifiedLevel: passed ? report.readability.predictedCefrLevel : null,
    };
  }

  /**
   * Promote a CERTIFIED stimulus to ACTIVE (ready for item linking).
   */
  activateStimulus(id: string): Stimulus {
    const s = store.findById(id);
    if (!s) throw new Error(`Stimulus ${id} not found`);
    if (s.status !== "CERTIFIED") throw new Error(`Stimulus ${id} is not certified (status: ${s.status})`);
    return store.update(id, { status: "ACTIVE" })!;
  }

  // ── Link Items to Stimuli ───────────────────────────────────────────────────

  /**
   * Register that an item uses this stimulus.
   * Automatically retires the stimulus when it reaches STIMULUS_MAX_ITEMS.
   */
  linkItemToStimulus(stimulusId: string, itemId: string): void {
    const s = store.findById(stimulusId);
    if (!s) throw new Error(`Stimulus ${stimulusId} not found`);
    if (s.linkedItemIds.includes(itemId)) return;

    const updated = [...s.linkedItemIds, itemId];
    const newStatus: StimulusStatus = updated.length >= STIMULUS_MAX_ITEMS ? "RETIRED" : s.status;
    store.update(stimulusId, { linkedItemIds: updated, status: newStatus });
  }

  /**
   * Record a candidate encounter with this stimulus.
   */
  recordExposure(stimulusId: string): void {
    const s = store.findById(stimulusId);
    if (!s) return;
    const newExposures = s.exposureCount + 1;
    const newStatus: StimulusStatus = newExposures >= STIMULUS_MAX_EXPOSURES ? "RETIRED" : s.status;
    store.update(stimulusId, { exposureCount: newExposures, status: newStatus });
  }

  // ── Retrieval ───────────────────────────────────────────────────────────────

  /**
   * Find stimuli suitable for reuse with a new item of the given spec.
   * Returns stimuli ordered by least used (fewest linkedItemIds).
   */
  findReusableStimuli(params: {
    cefrLevel: CefrLevel;
    genre?: TextGenre;
    type?: StimulusType;
    minWordCount?: number;
    maxWordCount?: number;
  }): Stimulus[] {
    return store
      .search({
        cefrLevel: params.cefrLevel,
        genre: params.genre,
        type: params.type,
        minWordCount: params.minWordCount,
        maxWordCount: params.maxWordCount,
        status: ["ACTIVE", "CERTIFIED"],
        maxLinkedItems: STIMULUS_MAX_ITEMS,
        maxExposures: STIMULUS_MAX_EXPOSURES,
      })
      .sort((a, b) => a.linkedItemIds.length - b.linkedItemIds.length);
  }

  getById(id: string): Stimulus | null {
    return store.findById(id);
  }

  getAll(): Stimulus[] {
    return store.all();
  }

  getStimulusStats(): {
    total: number;
    byStatus: Record<StimulusStatus, number>;
    byCefrLevel: Record<string, number>;
  } {
    const all = store.all();
    const byStatus: Record<StimulusStatus, number> = { DRAFT: 0, CERTIFIED: 0, ACTIVE: 0, RETIRED: 0 };
    const byCefrLevel: Record<string, number> = {};

    for (const s of all) {
      byStatus[s.status]++;
      byCefrLevel[s.cefrLevel] = (byCefrLevel[s.cefrLevel] ?? 0) + 1;
    }

    return { total: all.length, byStatus, byCefrLevel };
  }
}

export const stimulusBank = new StimulusBank();
