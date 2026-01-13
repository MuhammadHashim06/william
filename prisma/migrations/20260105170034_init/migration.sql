-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NULL,
    `initials` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_initials_key`(`initials`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Inbox` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `emailAddress` VARCHAR(191) NOT NULL,
    `isEscalation` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Inbox_key_key`(`key`),
    UNIQUE INDEX `Inbox_emailAddress_isEscalation_key`(`emailAddress`, `isEscalation`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InboxCursor` (
    `id` VARCHAR(191) NOT NULL,
    `inboxId` VARCHAR(191) NOT NULL,
    `deltaLink` LONGTEXT NULL,
    `lastSyncAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `InboxCursor_inboxId_key`(`inboxId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Thread` (
    `id` VARCHAR(191) NOT NULL,
    `inboxId` VARCHAR(191) NOT NULL,
    `graphConversationId` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NULL,
    `lastMessageAt` DATETIME(3) NULL,
    `department` VARCHAR(191) NOT NULL,
    `stage` VARCHAR(191) NOT NULL,
    `needsReview` BOOLEAN NOT NULL DEFAULT false,
    `responseRequired` BOOLEAN NOT NULL DEFAULT true,
    `draftTypeSuggested` VARCHAR(191) NULL,
    `ownerUserId` VARCHAR(191) NULL,
    `processingStatus` ENUM('NEW', 'CLASSIFIED', 'DRAFTED', 'DONE', 'FAILED') NOT NULL DEFAULT 'NEW',
    `slaDueAt` DATETIME(3) NULL,
    `slaBreachedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Thread_department_idx`(`department`),
    INDEX `Thread_stage_idx`(`stage`),
    INDEX `Thread_ownerUserId_idx`(`ownerUserId`),
    INDEX `Thread_slaDueAt_idx`(`slaDueAt`),
    INDEX `Thread_processingStatus_idx`(`processingStatus`),
    UNIQUE INDEX `Thread_inboxId_graphConversationId_key`(`inboxId`, `graphConversationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailMessage` (
    `id` VARCHAR(191) NOT NULL,
    `threadId` VARCHAR(191) NOT NULL,
    `graphMessageId` VARCHAR(191) NOT NULL,
    `internetMessageId` VARCHAR(191) NULL,
    `fromJson` JSON NOT NULL,
    `toJson` JSON NOT NULL,
    `ccJson` JSON NULL,
    `sentAt` DATETIME(3) NULL,
    `receivedAt` DATETIME(3) NULL,
    `subject` VARCHAR(191) NULL,
    `bodyPreview` LONGTEXT NULL,
    `bodyHtml` LONGTEXT NULL,
    `bodyText` LONGTEXT NULL,
    `hasAttachments` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EmailMessage_graphMessageId_key`(`graphMessageId`),
    INDEX `EmailMessage_threadId_idx`(`threadId`),
    INDEX `EmailMessage_receivedAt_idx`(`receivedAt`),
    INDEX `EmailMessage_internetMessageId_idx`(`internetMessageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Attachment` (
    `id` VARCHAR(191) NOT NULL,
    `messageId` VARCHAR(191) NOT NULL,
    `graphAttachmentId` VARCHAR(191) NOT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NULL,
    `sizeBytes` INTEGER NULL,
    `contentHash` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'EXTRACTED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `extractedJson` JSON NULL,
    `lastError` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Attachment_status_idx`(`status`),
    UNIQUE INDEX `Attachment_messageId_graphAttachmentId_key`(`messageId`, `graphAttachmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Draft` (
    `id` VARCHAR(191) NOT NULL,
    `threadId` VARCHAR(191) NOT NULL,
    `draftType` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `graphDraftMessageId` VARCHAR(191) NULL,
    `subject` VARCHAR(191) NULL,
    `toJson` JSON NOT NULL,
    `ccJson` JSON NULL,
    `bodyHtml` LONGTEXT NULL,
    `bodyText` LONGTEXT NULL,
    `createdByUserId` VARCHAR(191) NULL,
    `lastEditedByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `uq_draft_graph_message_id`(`graphDraftMessageId`),
    INDEX `Draft_threadId_idx`(`threadId`),
    INDEX `Draft_status_idx`(`status`),
    INDEX `Draft_draftType_idx`(`draftType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Escalation` (
    `id` VARCHAR(191) NOT NULL,
    `threadId` VARCHAR(191) NOT NULL,
    `department` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `triggeredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `draftId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Escalation_threadId_idx`(`threadId`),
    INDEX `Escalation_department_idx`(`department`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `threadId` VARCHAR(191) NULL,
    `messageId` VARCHAR(191) NULL,
    `draftId` VARCHAR(191) NULL,
    `actorUserId` VARCHAR(191) NULL,
    `action` ENUM('AI_CLASSIFIED', 'AI_DRAFTED', 'AI_EXTRACTED', 'STAGE_CHANGED', 'OWNER_CHANGED', 'DRAFT_CREATED', 'DRAFT_EDITED', 'DRAFT_APPROVED', 'DRAFT_SENT', 'DRAFT_DISCARDED', 'ESCALATION_TRIGGERED', 'GRAPH_INGESTED_MESSAGE', 'GRAPH_CREATED_DRAFT', 'GRAPH_SENT_DRAFT', 'GRAPH_ERROR', 'OPENAI_ERROR') NOT NULL,
    `payload` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_threadId_idx`(`threadId`),
    INDEX `AuditLog_messageId_idx`(`messageId`),
    INDEX `AuditLog_draftId_idx`(`draftId`),
    INDEX `AuditLog_actorUserId_idx`(`actorUserId`),
    INDEX `AuditLog_action_idx`(`action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `InboxCursor` ADD CONSTRAINT `InboxCursor_inboxId_fkey` FOREIGN KEY (`inboxId`) REFERENCES `Inbox`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Thread` ADD CONSTRAINT `Thread_inboxId_fkey` FOREIGN KEY (`inboxId`) REFERENCES `Inbox`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Thread` ADD CONSTRAINT `Thread_ownerUserId_fkey` FOREIGN KEY (`ownerUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailMessage` ADD CONSTRAINT `EmailMessage_threadId_fkey` FOREIGN KEY (`threadId`) REFERENCES `Thread`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attachment` ADD CONSTRAINT `Attachment_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `EmailMessage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Draft` ADD CONSTRAINT `fk_draft_thread` FOREIGN KEY (`threadId`) REFERENCES `Thread`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Draft` ADD CONSTRAINT `fk_draft_created_by` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Draft` ADD CONSTRAINT `fk_draft_last_edited_by` FOREIGN KEY (`lastEditedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Escalation` ADD CONSTRAINT `Escalation_threadId_fkey` FOREIGN KEY (`threadId`) REFERENCES `Thread`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Escalation` ADD CONSTRAINT `Escalation_draftId_fkey` FOREIGN KEY (`draftId`) REFERENCES `Draft`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_threadId_fkey` FOREIGN KEY (`threadId`) REFERENCES `Thread`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `EmailMessage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_draftId_fkey` FOREIGN KEY (`draftId`) REFERENCES `Draft`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
