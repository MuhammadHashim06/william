-- DropIndex
DROP INDEX `EmailMessage_internetMessageId_idx` ON `EmailMessage`;

-- AlterTable
ALTER TABLE `EmailMessage` MODIFY `internetMessageId` LONGTEXT NULL;
