-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SPECIALIST');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('READABLE', 'AUDIO', 'LINK', 'OTHER');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "FileKind" AS ENUM ('LIBRARY', 'AUDIO', 'COVER', 'GUIDE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SPECIALIST',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specialists" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'مختص التوجيه المهني',
    "bio" TEXT NOT NULL DEFAULT '',
    "photoUrl" TEXT,
    "notifyPhone" TEXT,
    "bookable" BOOLEAN NOT NULL DEFAULT true,
    "slotMinutes" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "specialists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_definitions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "introduction" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "groupCount" INTEGER NOT NULL DEFAULT 9,
    "questionsPerGroup" INTEGER NOT NULL DEFAULT 6,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_groups" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,

    CONSTRAINT "assessment_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_dimensions" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '#059669',
    "fields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "displayOrder" INTEGER NOT NULL,

    CONSTRAINT "assessment_dimensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_questions" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "dimensionId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "assessment_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_options" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,

    CONSTRAINT "assessment_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scoring_rule_sets" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'SUM_THEN_PERCENTILE',
    "notes" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scoring_rule_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scoring_rules" (
    "id" TEXT NOT NULL,
    "ruleSetId" TEXT NOT NULL,
    "dimensionId" TEXT NOT NULL,
    "gradeBand" TEXT NOT NULL,
    "rawScore" INTEGER NOT NULL,
    "percentile" INTEGER NOT NULL,

    CONSTRAINT "scoring_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_sessions" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "ruleSetId" TEXT,
    "studentName" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "tokenHash" TEXT NOT NULL,
    "tokenExpires" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_answers" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_results" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "ruleSetId" TEXT NOT NULL,
    "assessmentVersion" INTEGER NOT NULL,
    "topDimensions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recommendedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_result_sections" (
    "id" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "dimensionCode" TEXT NOT NULL,
    "dimensionLabel" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "rawScore" INTEGER NOT NULL,
    "percentile" INTEGER NOT NULL,
    "cells" JSONB NOT NULL,

    CONSTRAINT "assessment_result_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_analysis" (
    "id" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "rows" JSONB NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "assessment_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programs" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "institution" TEXT,
    "country" TEXT,
    "type" TEXT,
    "requirements" TEXT,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_resources" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "type" "ResourceType" NOT NULL DEFAULT 'READABLE',
    "author" TEXT NOT NULL DEFAULT '',
    "publisher" TEXT,
    "publishedYear" INTEGER,
    "language" TEXT NOT NULL DEFAULT 'ar',
    "coverUrl" TEXT,
    "fileId" TEXT,
    "audioFileId" TEXT,
    "externalUrl" TEXT,
    "downloadable" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stored_files" (
    "id" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "kind" "FileKind" NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stored_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_guide" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "fileId" TEXT,
    "externalUrl" TEXT,
    "downloadable" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_guide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultation_topics" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "requiresDetails" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultation_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specialist_availability" (
    "id" TEXT NOT NULL,
    "specialistId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "slotMinutes" INTEGER NOT NULL DEFAULT 30,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "specialist_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specialist_blocked_dates" (
    "id" TEXT NOT NULL,
    "specialistId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "fullDay" BOOLEAN NOT NULL DEFAULT true,
    "startTime" TEXT,
    "endTime" TEXT,
    "reason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "specialist_blocked_dates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "specialistId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "topicDetails" TEXT,
    "scheduledDate" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "specialistNotes" TEXT,
    "cancelReason" TEXT,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_status_history" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "fromStatus" "AppointmentStatus",
    "toStatus" "AppointmentStatus" NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "recipientMasked" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "providerMessageId" TEXT,
    "appointmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "in_app_notifications" (
    "id" TEXT NOT NULL,
    "specialistId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "in_app_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "meta" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_active_idx" ON "users"("role", "active");

-- CreateIndex
CREATE UNIQUE INDEX "specialists_userId_key" ON "specialists"("userId");

-- CreateIndex
CREATE INDEX "specialists_bookable_idx" ON "specialists"("bookable");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_definitions_code_key" ON "assessment_definitions"("code");

-- CreateIndex
CREATE INDEX "assessment_definitions_active_idx" ON "assessment_definitions"("active");

-- CreateIndex
CREATE INDEX "assessment_groups_assessmentId_displayOrder_idx" ON "assessment_groups"("assessmentId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_groups_assessmentId_number_key" ON "assessment_groups"("assessmentId", "number");

-- CreateIndex
CREATE INDEX "assessment_dimensions_assessmentId_displayOrder_idx" ON "assessment_dimensions"("assessmentId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_dimensions_assessmentId_code_key" ON "assessment_dimensions"("assessmentId", "code");

-- CreateIndex
CREATE INDEX "assessment_questions_assessmentId_active_idx" ON "assessment_questions"("assessmentId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_questions_assessmentId_number_key" ON "assessment_questions"("assessmentId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_questions_groupId_displayOrder_key" ON "assessment_questions"("groupId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_options_assessmentId_value_key" ON "assessment_options"("assessmentId", "value");

-- CreateIndex
CREATE INDEX "scoring_rule_sets_assessmentId_active_idx" ON "scoring_rule_sets"("assessmentId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "scoring_rule_sets_assessmentId_version_key" ON "scoring_rule_sets"("assessmentId", "version");

-- CreateIndex
CREATE INDEX "scoring_rules_ruleSetId_gradeBand_idx" ON "scoring_rules"("ruleSetId", "gradeBand");

-- CreateIndex
CREATE UNIQUE INDEX "scoring_rules_ruleSetId_dimensionId_gradeBand_rawScore_key" ON "scoring_rules"("ruleSetId", "dimensionId", "gradeBand", "rawScore");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_sessions_tokenHash_key" ON "assessment_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "assessment_sessions_status_submittedAt_idx" ON "assessment_sessions"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "assessment_sessions_grade_idx" ON "assessment_sessions"("grade");

-- CreateIndex
CREATE INDEX "assessment_sessions_studentName_idx" ON "assessment_sessions"("studentName");

-- CreateIndex
CREATE INDEX "assessment_answers_sessionId_idx" ON "assessment_answers"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_answers_sessionId_questionId_key" ON "assessment_answers"("sessionId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_results_sessionId_key" ON "assessment_results"("sessionId");

-- CreateIndex
CREATE INDEX "assessment_result_sections_resultId_displayOrder_idx" ON "assessment_result_sections"("resultId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_result_sections_resultId_dimensionCode_key" ON "assessment_result_sections"("resultId", "dimensionCode");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_analysis_resultId_key" ON "assessment_analysis"("resultId");

-- CreateIndex
CREATE UNIQUE INDEX "programs_code_key" ON "programs"("code");

-- CreateIndex
CREATE INDEX "programs_field_idx" ON "programs"("field");

-- CreateIndex
CREATE UNIQUE INDEX "library_categories_slug_key" ON "library_categories"("slug");

-- CreateIndex
CREATE INDEX "library_categories_active_displayOrder_idx" ON "library_categories"("active", "displayOrder");

-- CreateIndex
CREATE INDEX "library_resources_categoryId_published_archivedAt_idx" ON "library_resources"("categoryId", "published", "archivedAt");

-- CreateIndex
CREATE INDEX "library_resources_type_idx" ON "library_resources"("type");

-- CreateIndex
CREATE INDEX "library_resources_featured_idx" ON "library_resources"("featured");

-- CreateIndex
CREATE UNIQUE INDEX "stored_files_storageKey_key" ON "stored_files"("storageKey");

-- CreateIndex
CREATE INDEX "stored_files_kind_idx" ON "stored_files"("kind");

-- CreateIndex
CREATE INDEX "student_guide_published_version_idx" ON "student_guide"("published", "version");

-- CreateIndex
CREATE UNIQUE INDEX "consultation_topics_slug_key" ON "consultation_topics"("slug");

-- CreateIndex
CREATE INDEX "consultation_topics_active_displayOrder_idx" ON "consultation_topics"("active", "displayOrder");

-- CreateIndex
CREATE INDEX "specialist_availability_specialistId_active_idx" ON "specialist_availability"("specialistId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "specialist_availability_specialistId_weekday_startTime_key" ON "specialist_availability"("specialistId", "weekday", "startTime");

-- CreateIndex
CREATE INDEX "specialist_blocked_dates_specialistId_date_idx" ON "specialist_blocked_dates"("specialistId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_tokenHash_key" ON "appointments"("tokenHash");

-- CreateIndex
CREATE INDEX "appointments_specialistId_scheduledDate_idx" ON "appointments"("specialistId", "scheduledDate");

-- CreateIndex
CREATE INDEX "appointments_status_scheduledDate_idx" ON "appointments"("status", "scheduledDate");

-- CreateIndex
CREATE INDEX "appointments_phone_idx" ON "appointments"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_specialistId_scheduledDate_startTime_key" ON "appointments"("specialistId", "scheduledDate", "startTime");

-- CreateIndex
CREATE INDEX "appointment_status_history_appointmentId_createdAt_idx" ON "appointment_status_history"("appointmentId", "createdAt");

-- CreateIndex
CREATE INDEX "notification_deliveries_status_createdAt_idx" ON "notification_deliveries"("status", "createdAt");

-- CreateIndex
CREATE INDEX "notification_deliveries_appointmentId_idx" ON "notification_deliveries"("appointmentId");

-- CreateIndex
CREATE INDEX "in_app_notifications_specialistId_read_idx" ON "in_app_notifications"("specialistId", "read");

-- CreateIndex
CREATE INDEX "audit_logs_entity_createdAt_idx" ON "audit_logs"("entity", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "specialists" ADD CONSTRAINT "specialists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_groups" ADD CONSTRAINT "assessment_groups_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessment_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_dimensions" ADD CONSTRAINT "assessment_dimensions_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessment_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessment_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "assessment_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_dimensionId_fkey" FOREIGN KEY ("dimensionId") REFERENCES "assessment_dimensions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_options" ADD CONSTRAINT "assessment_options_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessment_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scoring_rule_sets" ADD CONSTRAINT "scoring_rule_sets_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessment_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scoring_rule_sets" ADD CONSTRAINT "scoring_rule_sets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scoring_rules" ADD CONSTRAINT "scoring_rules_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "scoring_rule_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scoring_rules" ADD CONSTRAINT "scoring_rules_dimensionId_fkey" FOREIGN KEY ("dimensionId") REFERENCES "assessment_dimensions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_sessions" ADD CONSTRAINT "assessment_sessions_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessment_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_sessions" ADD CONSTRAINT "assessment_sessions_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "scoring_rule_sets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "assessment_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "assessment_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "assessment_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "scoring_rule_sets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_result_sections" ADD CONSTRAINT "assessment_result_sections_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "assessment_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_analysis" ADD CONSTRAINT "assessment_analysis_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "assessment_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_resources" ADD CONSTRAINT "library_resources_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "library_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_resources" ADD CONSTRAINT "library_resources_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "stored_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_resources" ADD CONSTRAINT "library_resources_audioFileId_fkey" FOREIGN KEY ("audioFileId") REFERENCES "stored_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_resources" ADD CONSTRAINT "library_resources_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stored_files" ADD CONSTRAINT "stored_files_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_guide" ADD CONSTRAINT "student_guide_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "stored_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_guide" ADD CONSTRAINT "student_guide_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specialist_availability" ADD CONSTRAINT "specialist_availability_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "specialists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specialist_blocked_dates" ADD CONSTRAINT "specialist_blocked_dates_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "specialists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "specialists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "consultation_topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_status_history" ADD CONSTRAINT "appointment_status_history_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_status_history" ADD CONSTRAINT "appointment_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
