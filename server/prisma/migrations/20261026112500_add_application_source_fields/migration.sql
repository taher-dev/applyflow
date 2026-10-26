-- AlterTable
ALTER TABLE "applications" ADD COLUMN "source" TEXT,
ADD COLUMN "source_job_id" TEXT;

-- CreateIndex
CREATE INDEX "applications_user_id_source_job_id_idx" ON "applications"("user_id", "source_job_id");
