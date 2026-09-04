-- FAZ 1b: Teacher / Institutional Workflow
-- Adds Class, ClassMember, Assignment tables and TEACHER enum value.

-- ── 1. New enum values ─────────────────────────────────────────────────────

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'TEACHER';

-- ── 2. New enums ──────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "ClassStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AssignmentStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 3. Class ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Class" (
  "id"             TEXT         NOT NULL,
  "name"           TEXT         NOT NULL,
  "organizationId" TEXT         NOT NULL,
  "teacherId"      TEXT,
  "description"    TEXT,
  "status"         "ClassStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Class_organizationId_idx" ON "Class"("organizationId");
CREATE INDEX IF NOT EXISTS "Class_teacherId_idx"      ON "Class"("teacherId");

ALTER TABLE "Class"
  ADD CONSTRAINT "Class_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Class"
  ADD CONSTRAINT "Class_teacherId_fkey"
    FOREIGN KEY ("teacherId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 4. ClassMember ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ClassMember" (
  "id"       TEXT         NOT NULL,
  "classId"  TEXT         NOT NULL,
  "userId"   TEXT         NOT NULL,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClassMember_pkey"          PRIMARY KEY ("id"),
  CONSTRAINT "ClassMember_classId_userId_key" UNIQUE ("classId", "userId")
);

CREATE INDEX IF NOT EXISTS "ClassMember_userId_idx" ON "ClassMember"("userId");

ALTER TABLE "ClassMember"
  ADD CONSTRAINT "ClassMember_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "Class"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClassMember"
  ADD CONSTRAINT "ClassMember_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 5. Assignment ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Assignment" (
  "id"             TEXT               NOT NULL,
  "title"          TEXT,
  "organizationId" TEXT               NOT NULL,
  "classId"        TEXT,
  "assignedById"   TEXT,
  "productLine"    TEXT               NOT NULL,
  "openAt"         TIMESTAMP(3),
  "dueAt"          TIMESTAMP(3),
  "maxAttempts"    INTEGER            NOT NULL DEFAULT 1,
  "status"         "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt"      TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Assignment_organizationId_idx" ON "Assignment"("organizationId");
CREATE INDEX IF NOT EXISTS "Assignment_classId_idx"        ON "Assignment"("classId");

ALTER TABLE "Assignment"
  ADD CONSTRAINT "Assignment_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Assignment"
  ADD CONSTRAINT "Assignment_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "Class"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Assignment"
  ADD CONSTRAINT "Assignment_assignedById_fkey"
    FOREIGN KEY ("assignedById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 6. Session → Assignment FK ────────────────────────────────────────────

ALTER TABLE "Session"
  ADD COLUMN IF NOT EXISTS "assignmentId" TEXT;

ALTER TABLE "Session"
  ADD CONSTRAINT "Session_assignmentId_fkey"
    FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Session_assignmentId_idx" ON "Session"("assignmentId");
