-- CreateTable
CREATE TABLE "ContactUsMessages" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "message" TEXT,

    CONSTRAINT "ContactUsMessages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContactUsMessages_email_key" ON "ContactUsMessages"("email");
