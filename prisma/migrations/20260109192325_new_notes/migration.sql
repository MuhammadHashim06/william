-- DropForeignKey
ALTER TABLE `Draft` DROP FOREIGN KEY `fk_draft_created_by`;

-- DropForeignKey
ALTER TABLE `Draft` DROP FOREIGN KEY `fk_draft_last_edited_by`;

-- DropForeignKey
ALTER TABLE `Draft` DROP FOREIGN KEY `fk_draft_thread`;

-- AlterTable
ALTER TABLE `Attachment` ADD COLUMN `extractionText` LONGTEXT NULL,
    ADD COLUMN `imagePaths` JSON NULL,
    ADD COLUMN `isInline` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `localPath` LONGTEXT NULL;

-- AlterTable
ALTER TABLE `Thread` ADD COLUMN `metadata` JSON NULL;

-- CreateTable
CREATE TABLE `Note` (
    `id` VARCHAR(191) NOT NULL,
    `threadId` VARCHAR(191) NOT NULL,
    `createdByUserId` VARCHAR(191) NULL,
    `description` LONGTEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Note_threadId_idx`(`threadId`),
    INDEX `Note_createdByUserId_idx`(`createdByUserId`),
    INDEX `Note_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Attachment_messageId_idx` ON `Attachment`(`messageId`);

-- AddForeignKey
ALTER TABLE `Draft` ADD CONSTRAINT `Draft_threadId_fkey` FOREIGN KEY (`threadId`) REFERENCES `Thread`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Draft` ADD CONSTRAINT `Draft_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Draft` ADD CONSTRAINT `Draft_lastEditedByUserId_fkey` FOREIGN KEY (`lastEditedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Note` ADD CONSTRAINT `Note_threadId_fkey` FOREIGN KEY (`threadId`) REFERENCES `Thread`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Note` ADD CONSTRAINT `Note_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `Draft` RENAME INDEX `uq_draft_graph_message_id` TO `Draft_graphDraftMessageId_key`;
