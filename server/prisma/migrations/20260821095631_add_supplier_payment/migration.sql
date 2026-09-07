-- CreateTable
CREATE TABLE `SupplierPayment` (
    `id` VARCHAR(191) NOT NULL,
    `supplierId` VARCHAR(191) NOT NULL,
    `purchaseId` VARCHAR(191) NULL,
    `amount` DOUBLE NOT NULL,
    `paymentMethod` ENUM('cash', 'card', 'upi', 'credit') NOT NULL DEFAULT 'cash',
    `referenceNo` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `paidBy` VARCHAR(191) NULL,
    `paymentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SupplierPayment` ADD CONSTRAINT `SupplierPayment_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupplierPayment` ADD CONSTRAINT `SupplierPayment_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `Purchase`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
