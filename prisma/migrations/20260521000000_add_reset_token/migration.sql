-- Add password reset token fields to User (idempotent)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetToken"       TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetTokenExpiry" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "User_resetToken_key" ON "User"("resetToken");
