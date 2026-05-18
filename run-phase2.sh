#!/bin/bash

# Phase 2: Content Quality Generation
# Generates rationales for ~750 items + retries failed audio
# Estimated total time: 45 minutes (with Gemini API rate limiting)

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "╔════════════════════════════════════════════════════════╗"
echo "║  PHASE 2: CONTENT QUALITY GENERATION                   ║"
echo "║  Estimated time: 45 minutes                            ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Phase 2A: Rationale generation for 4 skills
echo "=== Phase 2A: Rationale Generation ==="
echo ""

echo "[1/4] GRAMMAR skill (estimated 8-10 min)..."
SKILL=GRAMMAR npx tsx scripts/generate-rationales.ts
echo ""

echo "[2/4] VOCABULARY skill (estimated 2-3 min)..."
SKILL=VOCABULARY npx tsx scripts/generate-rationales.ts
echo ""

echo "[3/4] READING skill (estimated 2-3 min)..."
SKILL=READING npx tsx scripts/generate-rationales.ts
echo ""

echo "[4/4] LISTENING skill (estimated 1 min)..."
SKILL=LISTENING npx tsx scripts/generate-rationales.ts
echo ""

# Phase 2B: Retry failed audio
echo "=== Phase 2B: Retry Failed Audio Generation ==="
echo "Retrying 13 items that timed out previously..."
echo ""

FORCE=1 npx tsx scripts/generate-draft-listening-audio.ts
echo ""

# Phase 2C: Verify results
echo "=== Phase 2C: Verify Improvements ==="
echo ""
npx tsx audit-comprehensive.ts

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║  PHASE 2 COMPLETE                                      ║"
echo "╚════════════════════════════════════════════════════════╝"
