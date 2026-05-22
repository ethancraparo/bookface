-- Initial schema — all IF NOT EXISTS so it's safe to run against an existing DB
-- (Railway was previously using prisma db push with no migration history)

CREATE TABLE IF NOT EXISTS "User" (
  "id"            TEXT NOT NULL,
  "email"         TEXT NOT NULL,
  "emailVerified" TIMESTAMP(3),
  "handle"        TEXT,
  "githubUrl"     TEXT,
  "twitterUrl"    TEXT,
  "contactEmail"  TEXT,
  "tags"          TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "password"      TEXT,
  "strikes"       INTEGER NOT NULL DEFAULT 0,
  "isBanned"      BOOLEAN NOT NULL DEFAULT false,
  "bannedUntil"   TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key"  ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "User_handle_key" ON "User"("handle");

CREATE TABLE IF NOT EXISTS "Account" (
  "id"                TEXT NOT NULL,
  "userId"            TEXT NOT NULL,
  "type"              TEXT NOT NULL,
  "provider"          TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token"     TEXT,
  "access_token"      TEXT,
  "expires_at"        INTEGER,
  "token_type"        TEXT,
  "scope"             TEXT,
  "id_token"          TEXT,
  "session_state"     TEXT,
  CONSTRAINT "Account_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

CREATE TABLE IF NOT EXISTS "Session" (
  "id"           TEXT NOT NULL,
  "sessionToken" TEXT NOT NULL,
  "userId"       TEXT NOT NULL,
  "expires"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "Session"("sessionToken");

CREATE TABLE IF NOT EXISTS "VerificationToken" (
  "identifier" TEXT NOT NULL,
  "token"      TEXT NOT NULL,
  "expires"    TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_token_key"             ON "VerificationToken"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key"  ON "VerificationToken"("identifier", "token");

CREATE TABLE IF NOT EXISTS "Report" (
  "id"         TEXT NOT NULL,
  "reporterId" TEXT NOT NULL,
  "reportedId" TEXT NOT NULL,
  "category"   TEXT NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Report_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Report_reportedId_fkey" FOREIGN KEY ("reportedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Block" (
  "id"        TEXT NOT NULL,
  "blockerId" TEXT NOT NULL,
  "blockedId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Block_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Block_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Block_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Block_blockerId_blockedId_key" ON "Block"("blockerId", "blockedId");
