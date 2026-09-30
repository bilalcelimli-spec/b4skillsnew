-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ASSESSMENT_DIRECTOR', 'CONTENT_ADMIN', 'INST_ADMIN', 'TEACHER', 'RATER', 'PROCTOR', 'CANDIDATE', 'ITEM_WRITER', 'LANGUAGE_REVIEWER', 'CEFR_REVIEWER', 'MODERATOR', 'PSYCHOMETRICIAN', 'SECURITY_ADMIN');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('MULTIPLE_CHOICE', 'FILL_IN_BLANKS', 'DRAG_DROP', 'SPEAKING_PROMPT', 'WRITING_PROMPT', 'INTEGRATED_TASK');

-- CreateEnum
CREATE TYPE "SkillType" AS ENUM ('READING', 'LISTENING', 'WRITING', 'SPEAKING', 'GRAMMAR', 'VOCABULARY');

-- CreateEnum
CREATE TYPE "CefrLevel" AS ENUM ('PRE_A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('DRAFT', 'REVIEW', 'ACTIVE', 'PRETEST', 'RETIRED');

-- CreateEnum
CREATE TYPE "ItemPipelineStage" AS ENUM ('AI_DRAFT', 'HUMAN_DRAFT', 'EDITING', 'LANGUAGE_REVIEW', 'CEFR_REVIEW', 'FAIRNESS_REVIEW', 'MODERATION', 'APPROVED_FOR_PILOT', 'PILOT', 'ANALYSIS', 'CALIBRATION', 'LIVE', 'FLAGGED', 'SUSPENDED', 'RETIRED', 'COMPROMISED');

-- CreateEnum
CREATE TYPE "SecurityClassification" AS ENUM ('PUBLIC_SAMPLE', 'PRACTICE', 'ASSESSMENT', 'HIGH_SECURITY');

-- CreateEnum
CREATE TYPE "ContentProvenance" AS ENUM ('ORIGINAL_HUMAN', 'ORIGINAL_AI_ASSISTED', 'LICENSED', 'PUBLIC_DOMAIN');

-- CreateEnum
CREATE TYPE "AgeSuitability" AS ENUM ('YOUNG_LEARNER', 'TEEN', 'ADULT', 'UNIVERSAL');

-- CreateEnum
CREATE TYPE "ReadingSubskill" AS ENUM ('GIST', 'MAIN_IDEA', 'OVERALL_PURPOSE', 'TEXT_FUNCTION', 'EXPLICIT_DETAIL', 'SPECIFIC_INFORMATION', 'REFERENCE_RESOLUTION', 'IMPLIED_MEANING', 'INFERENCE', 'UNSTATED_CONCLUSION', 'CAUSE_EFFECT_INFERENCE', 'MEANING_FROM_CONTEXT', 'PHRASE_INTERPRETATION', 'COHESION', 'PARAGRAPH_RELATIONSHIPS', 'DISCOURSE_MARKERS', 'SENTENCE_INSERTION', 'WRITER_ATTITUDE', 'TONE', 'STANCE', 'INTENTION', 'ARGUMENT_STRUCTURE', 'EVIDENCE_EVALUATION', 'COMPETING_VIEWPOINTS', 'SYNTHESIS');

-- CreateEnum
CREATE TYPE "ListeningSubskill" AS ENUM ('GIST', 'TOPIC', 'PURPOSE', 'FACTUAL_DETAIL', 'SPECIFIC_INFORMATION', 'SEQUENCE', 'IMPLICATION', 'INFERRED_INTENTION', 'SPEAKER_ATTITUDE', 'SPEAKER_RELATIONSHIP', 'ORGANISATION', 'ARGUMENT_DEVELOPMENT', 'TONE', 'AGREEMENT_DISAGREEMENT', 'IMPLIED_MEANING', 'SYNTHESISING_INFORMATION', 'DISTINGUISHING_VIEWPOINTS');

-- CreateEnum
CREATE TYPE "WritingSubskill" AS ENUM ('TASK_FULFILMENT', 'ORGANISATION', 'COHERENCE', 'COHESION', 'LEXICAL_RANGE', 'LEXICAL_ACCURACY', 'GRAMMATICAL_RANGE', 'GRAMMATICAL_ACCURACY', 'REGISTER', 'GENRE_CONVENTIONS');

-- CreateEnum
CREATE TYPE "SpeakingSubskill" AS ENUM ('TASK_FULFILMENT', 'FLUENCY', 'COHERENCE', 'DISCOURSE_MANAGEMENT', 'LEXICAL_RANGE', 'LEXICAL_ACCURACY', 'GRAMMATICAL_RANGE', 'GRAMMATICAL_ACCURACY', 'PRONUNCIATION', 'INTELLIGIBILITY', 'INTERACTION', 'TURN_MANAGEMENT', 'PRAGMATIC_APPROPRIACY');

-- CreateEnum
CREATE TYPE "GrammarSubskill" AS ENUM ('TENSE_ASPECT', 'MODALITY', 'CONDITIONALS', 'COMPARISON', 'DETERMINERS', 'QUANTIFICATION', 'AGREEMENT', 'COMPLEMENTATION', 'SUBORDINATION', 'RELATIVE_CLAUSES', 'PASSIVE', 'REPORTED_LANGUAGE', 'INVERSION', 'DISCOURSE_GRAMMAR');

-- CreateEnum
CREATE TYPE "VocabularySubskill" AS ENUM ('RECEPTIVE_VOCABULARY', 'PRODUCTIVE_VOCABULARY', 'LEXICAL_RANGE', 'LEXICAL_PRECISION', 'COLLOCATION', 'WORD_FORMATION', 'MULTI_WORD_EXPRESSIONS', 'PHRASAL_VERBS', 'REGISTER', 'CONTEXTUAL_MEANING');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'PAUSED', 'SCORING', 'COMPLETED', 'FLAGGED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RatingStatus" AS ENUM ('PENDING', 'CLAIMED', 'COMPLETED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "ClassStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "branding" JSONB,
    "settings" JSONB,
    "ssoConfig" JSONB,
    "apiKeyDigest" TEXT,
    "customDomain" TEXT,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "productLine" TEXT NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedByEmail" TEXT,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ExamCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "category" TEXT,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "previousData" JSONB,
    "newData" JSONB,
    "details" JSONB,
    "ipAddress" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Webhook" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "lastUsed" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL,
    "stripeSessionId" TEXT,
    "creditsAdded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CANDIDATE',
    "organizationId" TEXT,
    "password" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "refreshToken" TEXT,
    "resetPasswordToken" TEXT,
    "resetPasswordExpires" TIMESTAMP(3),
    "verifyEmailToken" TEXT,
    "oauthProvider" TEXT,
    "oauthProviderId" TEXT,
    "twoFactorSecret" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nativeLanguage" TEXT,
    "gender" TEXT,
    "ageGroup" TEXT,
    "educationLevel" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "CandidateProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "itemCode" TEXT,
    "organizationId" TEXT,
    "type" "ItemType" NOT NULL,
    "skill" "SkillType" NOT NULL,
    "cefrLevel" "CefrLevel" NOT NULL,
    "difficulty" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "discrimination" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "guessing" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "content" JSONB NOT NULL,
    "tags" TEXT[],
    "status" "ItemStatus" NOT NULL DEFAULT 'DRAFT',
    "isPretest" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "isAnchor" BOOLEAN NOT NULL DEFAULT false,
    "iqScore" DOUBLE PRECISION,
    "cefrLinguisticRange" "CefrLevel",
    "cefrLinguisticAccuracy" "CefrLevel",
    "cefrFunctionalAdequacy" "CefrLevel",
    "cefrSources" JSONB,
    "subskill" TEXT,
    "genre" TEXT,
    "topic" TEXT,
    "construct" TEXT,
    "evidenceStatement" TEXT,
    "descriptorRef" TEXT,
    "pipelineStage" "ItemPipelineStage" NOT NULL DEFAULT 'AI_DRAFT',
    "securityClass" "SecurityClassification" NOT NULL DEFAULT 'ASSESSMENT',
    "provenance" "ContentProvenance" NOT NULL DEFAULT 'ORIGINAL_AI_ASSISTED',
    "ageSuitability" "AgeSuitability" NOT NULL DEFAULT 'UNIVERSAL',
    "register" TEXT,
    "englishVariant" TEXT,
    "culturalLoad" TEXT,
    "estimatedResponseTimeSec" INTEGER,
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,
    "isCompromised" BOOLEAN NOT NULL DEFAULT false,
    "compromisedAt" TIMESTAMP(3),
    "compromisedNote" TEXT,
    "taskFamilyId" TEXT,
    "embeddingVec" JSONB,
    "exposureCount" INTEGER NOT NULL DEFAULT 0,
    "pVal" DOUBLE PRECISION,
    "difStatus" TEXT,
    "latestDifReviewAt" TIMESTAMP(3),
    "retirementReason" TEXT,
    "retiredAt" TIMESTAMP(3),
    "retiredBy" TEXT,
    "retirementScore" DOUBLE PRECISION,
    "retirementScoreHistory" JSONB,
    "canBeReactivated" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetirementAuditLog" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "reason" TEXT,
    "triggeredBy" TEXT,
    "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvalDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetirementAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DifReportArchive" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "runDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "groupVariable" TEXT NOT NULL,
    "referenceGroup" TEXT NOT NULL,
    "focalGroup" TEXT NOT NULL,
    "mhOddsRatio" DOUBLE PRECISION,
    "mhDelta" DOUBLE PRECISION NOT NULL,
    "chiSquared" DOUBLE PRECISION,
    "pValue" DOUBLE PRECISION,
    "classification" TEXT NOT NULL,
    "referenceN" INTEGER NOT NULL,
    "focalN" INTEGER NOT NULL,
    "logisticUniformDif" DOUBLE PRECISION,
    "logisticNonUniformDif" DOUBLE PRECISION,
    "isReviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,

    CONSTRAINT "DifReportArchive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DifFlaggedItem" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "flaggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "worstClassification" TEXT NOT NULL,
    "totalDifResults" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,

    CONSTRAINT "DifFlaggedItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemReview" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "reviewType" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "stageTarget" "ItemPipelineStage",
    "constructClarity" INTEGER,
    "cefrFit" INTEGER,
    "cefrFitLabel" TEXT,
    "languageNaturalness" INTEGER,
    "distractorQuality" INTEGER,
    "fairnessScore" INTEGER,
    "ambiguityRisk" INTEGER,
    "notes" TEXT,
    "revisionsReq" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskFamily" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "skill" "SkillType" NOT NULL,
    "cefrLevel" "CefrLevel" NOT NULL,
    "description" TEXT,
    "taskType" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskFamily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "theta" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "sem" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "currentTheta" DOUBLE PRECISION,
    "currentStage" INTEGER NOT NULL DEFAULT 1,
    "responsesCount" INTEGER NOT NULL DEFAULT 0,
    "cefrLevel" "CefrLevel",
    "metadata" JSONB,
    "assignmentId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Response" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "value" TEXT,
    "artifactUrl" TEXT,
    "isCorrect" BOOLEAN,
    "score" DOUBLE PRECISION,
    "isPretest" BOOLEAN NOT NULL DEFAULT false,
    "aiScore" DOUBLE PRECISION,
    "humanScore" DOUBLE PRECISION,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "rtZScore" DOUBLE PRECISION,
    "rtFlag" TEXT,
    "adjustedScore" DOUBLE PRECISION,
    "order" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Response_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RatingTask" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "status" "RatingStatus" NOT NULL DEFAULT 'PENDING',
    "raterId" TEXT,
    "score" DOUBLE PRECISION,
    "feedback" TEXT,
    "secondRaterId" TEXT,
    "secondRaterScore" DOUBLE PRECISION,
    "secondRaterFeedback" TEXT,
    "qwk" DOUBLE PRECISION,
    "requiresArbitration" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RatingTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreReport" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "overallCefr" "CefrLevel" NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "readingScore" INTEGER,
    "listeningScore" INTEGER,
    "writingScore" INTEGER,
    "speakingScore" INTEGER,
    "grammarScore" INTEGER,
    "vocabularyScore" INTEGER,
    "diagnosticReport" JSONB,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "certificateUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProctoringEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "ProctoringEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "config" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalibrationRun" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggerSource" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "nResponses" INTEGER NOT NULL,
    "nPretest" INTEGER NOT NULL,
    "prevA" DOUBLE PRECISION,
    "prevB" DOUBLE PRECISION,
    "prevC" DOUBLE PRECISION,
    "aEstimate" DOUBLE PRECISION NOT NULL,
    "bEstimate" DOUBLE PRECISION NOT NULL,
    "cEstimate" DOUBLE PRECISION NOT NULL,
    "aSE" DOUBLE PRECISION,
    "bSE" DOUBLE PRECISION,
    "cSE" DOUBLE PRECISION,
    "deltaB" DOUBLE PRECISION NOT NULL,
    "deltaA" DOUBLE PRECISION NOT NULL,
    "logLikelihood" DOUBLE PRECISION,
    "stable" BOOLEAN NOT NULL,
    "rejectionReason" TEXT,
    "promotedToActive" BOOLEAN NOT NULL DEFAULT false,
    "promotedAt" TIMESTAMP(3),

    CONSTRAINT "CalibrationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnchorRating" (
    "id" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "cefrLevel" TEXT NOT NULL,
    "responseText" TEXT,
    "artifactUrl" TEXT,
    "humanScore" DOUBLE PRECISION NOT NULL,
    "humanScoreDim1" DOUBLE PRECISION,
    "humanScoreDim2" DOUBLE PRECISION,
    "humanScoreDim3" DOUBLE PRECISION,
    "humanScoreDim4" DOUBLE PRECISION,
    "humanScoreDim5" DOUBLE PRECISION,
    "expertId" TEXT NOT NULL,
    "ratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aiScore" DOUBLE PRECISION,
    "aiScoreDim1" DOUBLE PRECISION,
    "aiScoreDim2" DOUBLE PRECISION,
    "aiScoreDim3" DOUBLE PRECISION,
    "aiScoreDim4" DOUBLE PRECISION,
    "aiScoreDim5" DOUBLE PRECISION,
    "aiEvaluatedAt" TIMESTAMP(3),
    "qwk" DOUBLE PRECISION,
    "absoluteDiff" DOUBLE PRECISION,
    "passesFloor" BOOLEAN,

    CONSTRAINT "AnchorRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConcurrentValidityRecord" (
    "id" TEXT NOT NULL,
    "studyName" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "b4sThetaOverall" DOUBLE PRECISION NOT NULL,
    "b4sCefrLevel" TEXT NOT NULL,
    "b4sScaledScore" INTEGER,
    "externalTestName" TEXT NOT NULL,
    "externalScore" DOUBLE PRECISION NOT NULL,
    "externalCefrLevel" TEXT,
    "cefrAgreement" BOOLEAN,
    "cefrWithinOneBand" BOOLEAN,
    "candidateId" TEXT,
    "demographicGroup" TEXT,

    CONSTRAINT "ConcurrentValidityRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cohort" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cohort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Class" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "teacherId" TEXT,
    "description" TEXT,
    "status" "ClassStatus" NOT NULL DEFAULT 'ACTIVE',
    "targetCefr" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassMember" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "organizationId" TEXT NOT NULL,
    "classId" TEXT,
    "assignedById" TEXT,
    "productLine" TEXT NOT NULL,
    "openAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "maxAttempts" INTEGER NOT NULL DEFAULT 1,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "License" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LtiRegistration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "platformIss" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "authEndpoint" TEXT NOT NULL,
    "tokenEndpoint" TEXT NOT NULL,
    "jwksUrl" TEXT NOT NULL,
    "deploymentIds" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LtiRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LtiSession" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "platformUserId" TEXT,
    "platformCourseId" TEXT,
    "platformCourseTitle" TEXT,
    "lineItemUrl" TEXT,
    "scoreMaximum" DOUBLE PRECISION,
    "targetLinkUri" TEXT,
    "assessmentSessionId" TEXT,
    "userId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "launchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LtiSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_customDomain_key" ON "Organization"("customDomain");

-- CreateIndex
CREATE UNIQUE INDEX "ExamCode_code_key" ON "ExamCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_sessionId_key" ON "Feedback"("sessionId");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_key_key" ON "ApiKey"("key");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_stripeSessionId_key" ON "PaymentTransaction"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateProfile_userId_key" ON "CandidateProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Item_itemCode_key" ON "Item"("itemCode");

-- CreateIndex
CREATE INDEX "Item_organizationId_idx" ON "Item"("organizationId");

-- CreateIndex
CREATE INDEX "Item_skill_cefrLevel_idx" ON "Item"("skill", "cefrLevel");

-- CreateIndex
CREATE INDEX "Item_skill_cefrLevel_status_idx" ON "Item"("skill", "cefrLevel", "status");

-- CreateIndex
CREATE INDEX "Item_status_skill_idx" ON "Item"("status", "skill");

-- CreateIndex
CREATE INDEX "Item_organizationId_status_idx" ON "Item"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Item_status_retirementScore_idx" ON "Item"("status", "retirementScore");

-- CreateIndex
CREATE INDEX "Item_difStatus_latestDifReviewAt_idx" ON "Item"("difStatus", "latestDifReviewAt");

-- CreateIndex
CREATE INDEX "Item_retirementScore_idx" ON "Item"("retirementScore");

-- CreateIndex
CREATE INDEX "Item_isAnchor_skill_cefrLevel_idx" ON "Item"("isAnchor", "skill", "cefrLevel");

-- CreateIndex
CREATE INDEX "Item_iqScore_idx" ON "Item"("iqScore");

-- CreateIndex
CREATE INDEX "Item_pipelineStage_idx" ON "Item"("pipelineStage");

-- CreateIndex
CREATE INDEX "Item_skill_cefrLevel_subskill_idx" ON "Item"("skill", "cefrLevel", "subskill");

-- CreateIndex
CREATE INDEX "Item_taskFamilyId_idx" ON "Item"("taskFamilyId");

-- CreateIndex
CREATE INDEX "RetirementAuditLog_itemId_idx" ON "RetirementAuditLog"("itemId");

-- CreateIndex
CREATE INDEX "RetirementAuditLog_action_idx" ON "RetirementAuditLog"("action");

-- CreateIndex
CREATE INDEX "RetirementAuditLog_approvalStatus_createdAt_idx" ON "RetirementAuditLog"("approvalStatus", "createdAt");

-- CreateIndex
CREATE INDEX "DifReportArchive_itemId_idx" ON "DifReportArchive"("itemId");

-- CreateIndex
CREATE INDEX "DifReportArchive_classification_runDate_idx" ON "DifReportArchive"("classification", "runDate");

-- CreateIndex
CREATE INDEX "DifReportArchive_isReviewed_idx" ON "DifReportArchive"("isReviewed");

-- CreateIndex
CREATE UNIQUE INDEX "DifFlaggedItem_itemId_key" ON "DifFlaggedItem"("itemId");

-- CreateIndex
CREATE INDEX "DifFlaggedItem_status_flaggedAt_idx" ON "DifFlaggedItem"("status", "flaggedAt");

-- CreateIndex
CREATE INDEX "ItemReview_itemId_idx" ON "ItemReview"("itemId");

-- CreateIndex
CREATE INDEX "ItemReview_reviewerId_idx" ON "ItemReview"("reviewerId");

-- CreateIndex
CREATE INDEX "ItemReview_reviewType_verdict_idx" ON "ItemReview"("reviewType", "verdict");

-- CreateIndex
CREATE INDEX "ItemReview_createdAt_idx" ON "ItemReview"("createdAt");

-- CreateIndex
CREATE INDEX "TaskFamily_skill_cefrLevel_idx" ON "TaskFamily"("skill", "cefrLevel");

-- CreateIndex
CREATE INDEX "Session_organizationId_candidateId_idx" ON "Session"("organizationId", "candidateId");

-- CreateIndex
CREATE INDEX "Session_validUntil_idx" ON "Session"("validUntil");

-- CreateIndex
CREATE INDEX "Session_organizationId_status_idx" ON "Session"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Session_candidateId_status_idx" ON "Session"("candidateId", "status");

-- CreateIndex
CREATE INDEX "Session_status_idx" ON "Session"("status");

-- CreateIndex
CREATE INDEX "Session_createdAt_idx" ON "Session"("createdAt");

-- CreateIndex
CREATE INDEX "Session_status_updatedAt_idx" ON "Session"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "Session_assignmentId_idx" ON "Session"("assignmentId");

-- CreateIndex
CREATE INDEX "Response_sessionId_idx" ON "Response"("sessionId");

-- CreateIndex
CREATE INDEX "Response_itemId_idx" ON "Response"("itemId");

-- CreateIndex
CREATE INDEX "Response_sessionId_order_idx" ON "Response"("sessionId", "order");

-- CreateIndex
CREATE INDEX "Response_sessionId_isPretest_idx" ON "Response"("sessionId", "isPretest");

-- CreateIndex
CREATE INDEX "Response_createdAt_idx" ON "Response"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RatingTask_responseId_key" ON "RatingTask"("responseId");

-- CreateIndex
CREATE INDEX "RatingTask_status_idx" ON "RatingTask"("status");

-- CreateIndex
CREATE INDEX "RatingTask_raterId_idx" ON "RatingTask"("raterId");

-- CreateIndex
CREATE INDEX "RatingTask_requiresArbitration_idx" ON "RatingTask"("requiresArbitration");

-- CreateIndex
CREATE UNIQUE INDEX "ScoreReport_sessionId_key" ON "ScoreReport"("sessionId");

-- CreateIndex
CREATE INDEX "ProctoringEvent_sessionId_idx" ON "ProctoringEvent"("sessionId");

-- CreateIndex
CREATE INDEX "ProctoringEvent_sessionId_severity_idx" ON "ProctoringEvent"("sessionId", "severity");

-- CreateIndex
CREATE INDEX "CalibrationRun_itemId_runAt_idx" ON "CalibrationRun"("itemId", "runAt");

-- CreateIndex
CREATE INDEX "CalibrationRun_stable_runAt_idx" ON "CalibrationRun"("stable", "runAt");

-- CreateIndex
CREATE INDEX "CalibrationRun_promotedToActive_idx" ON "CalibrationRun"("promotedToActive");

-- CreateIndex
CREATE INDEX "AnchorRating_skill_cefrLevel_idx" ON "AnchorRating"("skill", "cefrLevel");

-- CreateIndex
CREATE INDEX "AnchorRating_passesFloor_idx" ON "AnchorRating"("passesFloor");

-- CreateIndex
CREATE INDEX "ConcurrentValidityRecord_studyName_idx" ON "ConcurrentValidityRecord"("studyName");

-- CreateIndex
CREATE INDEX "ConcurrentValidityRecord_b4sCefrLevel_idx" ON "ConcurrentValidityRecord"("b4sCefrLevel");

-- CreateIndex
CREATE INDEX "Class_organizationId_idx" ON "Class"("organizationId");

-- CreateIndex
CREATE INDEX "Class_teacherId_idx" ON "Class"("teacherId");

-- CreateIndex
CREATE INDEX "ClassMember_userId_idx" ON "ClassMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassMember_classId_userId_key" ON "ClassMember"("classId", "userId");

-- CreateIndex
CREATE INDEX "Assignment_organizationId_idx" ON "Assignment"("organizationId");

-- CreateIndex
CREATE INDEX "Assignment_classId_idx" ON "Assignment"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "LtiRegistration_clientId_key" ON "LtiRegistration"("clientId");

-- CreateIndex
CREATE INDEX "LtiRegistration_organizationId_idx" ON "LtiRegistration"("organizationId");

-- CreateIndex
CREATE INDEX "LtiRegistration_platformIss_idx" ON "LtiRegistration"("platformIss");

-- CreateIndex
CREATE UNIQUE INDEX "LtiSession_nonce_key" ON "LtiSession"("nonce");

-- CreateIndex
CREATE UNIQUE INDEX "LtiSession_state_key" ON "LtiSession"("state");

-- CreateIndex
CREATE INDEX "LtiSession_state_idx" ON "LtiSession"("state");

-- CreateIndex
CREATE INDEX "LtiSession_assessmentSessionId_idx" ON "LtiSession"("assessmentSessionId");

-- AddForeignKey
ALTER TABLE "ExamCode" ADD CONSTRAINT "ExamCode_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_taskFamilyId_fkey" FOREIGN KEY ("taskFamilyId") REFERENCES "TaskFamily"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetirementAuditLog" ADD CONSTRAINT "RetirementAuditLog_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DifReportArchive" ADD CONSTRAINT "DifReportArchive_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DifFlaggedItem" ADD CONSTRAINT "DifFlaggedItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemReview" ADD CONSTRAINT "ItemReview_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatingTask" ADD CONSTRAINT "RatingTask_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "Response"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatingTask" ADD CONSTRAINT "RatingTask_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreReport" ADD CONSTRAINT "ScoreReport_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProctoringEvent" ADD CONSTRAINT "ProctoringEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalibrationRun" ADD CONSTRAINT "CalibrationRun_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cohort" ADD CONSTRAINT "Cohort_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassMember" ADD CONSTRAINT "ClassMember_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassMember" ADD CONSTRAINT "ClassMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "License" ADD CONSTRAINT "License_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LtiRegistration" ADD CONSTRAINT "LtiRegistration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LtiSession" ADD CONSTRAINT "LtiSession_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "LtiRegistration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
