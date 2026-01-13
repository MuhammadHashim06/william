-- DropIndex
DROP INDEX `EmailMessage_internetMessageId_idx` ON `emailmessage`;

-- AlterTable
ALTER TABLE `emailmessage` MODIFY `internetMessageId` LONGTEXT NULL;
