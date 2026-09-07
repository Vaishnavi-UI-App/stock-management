-- CreateTable
CREATE TABLE `Organization` (
    `id` VARCHAR(191) NOT NULL,
    `orgName` VARCHAR(191) NOT NULL,
    `orgCode` VARCHAR(191) NULL,
    `businessType` VARCHAR(191) NULL,
    `industry` VARCHAR(191) NULL,
    `logoUrl` TEXT NULL,
    `gstNo` VARCHAR(191) NULL,
    `panNo` VARCHAR(191) NULL,
    `tanNo` VARCHAR(191) NULL,
    `cinNo` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `altPhone` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `registeredAddress` TEXT NULL,
    `factoryAddress` TEXT NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `stateCode` VARCHAR(191) NULL,
    `pincode` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL DEFAULT 'India',
    `invoicePrefix` VARCHAR(191) NULL DEFAULT 'INV',
    `currency` VARCHAR(191) NULL DEFAULT 'INR',
    `bankName` VARCHAR(191) NULL,
    `bankAccountNo` VARCHAR(191) NULL,
    `bankAccountHolder` VARCHAR(191) NULL,
    `ifscCode` VARCHAR(191) NULL,
    `bankBranch` VARCHAR(191) NULL,
    `upiId` VARCHAR(191) NULL,
    `workingDays` VARCHAR(191) NULL,
    `workingHours` VARCHAR(191) NULL,
    `timezone` VARCHAR(191) NULL DEFAULT 'Asia/Kolkata',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `status` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Organization_orgCode_key`(`orgCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrganizationDocument` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `documentName` VARCHAR(191) NOT NULL,
    `documentType` VARCHAR(191) NULL,
    `fileData` LONGTEXT NOT NULL,
    `fileName` VARCHAR(191) NULL,
    `fileType` VARCHAR(191) NULL,
    `uploadedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('stock_manager', 'account_manager', 'branch_manager', 'salesman') NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `resetToken` VARCHAR(191) NULL,
    `resetTokenExpiry` DATETIME(3) NULL,
    `mustChangePassword` BOOLEAN NOT NULL DEFAULT false,
    `branchId` VARCHAR(191) NULL,
    `profilePhoto` TEXT NULL,
    `employeeCode` VARCHAR(191) NULL,
    `aadharCard` VARCHAR(191) NULL,
    `aadharCardDoc` TEXT NULL,
    `panCard` VARCHAR(191) NULL,
    `panCardDoc` TEXT NULL,
    `bloodGroup` VARCHAR(191) NULL,
    `emergencyContact` VARCHAR(191) NULL,
    `monthlySalary` DOUBLE NULL,
    `bankName` VARCHAR(191) NULL,
    `bankAccountNo` VARCHAR(191) NULL,
    `bankAccountHolder` VARCHAR(191) NULL,
    `bankIfscCode` VARCHAR(191) NULL,
    `bankBranchName` VARCHAR(191) NULL,
    `bankPassbookDoc` TEXT NULL,
    `dateOfJoining` DATETIME(3) NULL,
    `pfNo` VARCHAR(191) NULL,
    `esicNo` VARCHAR(191) NULL,
    `uanNo` VARCHAR(191) NULL,
    `licenseNo` VARCHAR(191) NULL,
    `medicalInsurance` VARCHAR(191) NULL,
    `designation` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `basicSalary` DOUBLE NULL,
    `houseRentAllowance` DOUBLE NULL,
    `conveyanceAllowance` DOUBLE NULL,
    `medicalAllowance` DOUBLE NULL,
    `uniformAllowance` DOUBLE NULL,
    `educationAllowance` DOUBLE NULL,
    `ltaAllowance` DOUBLE NULL,
    `specialAllowance` DOUBLE NULL,
    `pfDeduction` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_resetToken_key`(`resetToken`),
    UNIQUE INDEX `User_employeeCode_key`(`employeeCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Branch` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `managerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Branch_managerId_key`(`managerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `price` DOUBLE NOT NULL,
    `mrp` DOUBLE NULL,
    `unit` VARCHAR(191) NOT NULL,
    `caseQty` INTEGER NOT NULL,
    `gstRate` DOUBLE NOT NULL,
    `description` VARCHAR(191) NULL,
    `expDate` DATETIME(3) NULL,
    `reorderPoint` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyStock` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `lastUpdated` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CompanyStock_productId_key`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BranchStock` (
    `id` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `lastUpdated` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `BranchStock_branchId_productId_key`(`branchId`, `productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesmanStock` (
    `id` VARCHAR(191) NOT NULL,
    `salesmanId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `takenDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SalesmanStock_salesmanId_productId_key`(`salesmanId`, `productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockTransfer` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `fromBranchId` VARCHAR(191) NULL,
    `toBranchId` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL,
    `transferredBy` VARCHAR(191) NOT NULL,
    `transferDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('pending', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `gstin` VARCHAR(191) NULL,
    `pan` VARCHAR(191) NULL,
    `currentBalance` DOUBLE NOT NULL DEFAULT 0,
    `totalPurchases` DOUBLE NOT NULL DEFAULT 0,
    `totalPaid` DOUBLE NOT NULL DEFAULT 0,
    `creditLimit` DOUBLE NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Customer_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `saleId` VARCHAR(191) NULL,
    `amount` DOUBLE NOT NULL,
    `paymentMethod` ENUM('cash', 'card', 'upi', 'credit') NOT NULL,
    `referenceNo` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `receivedBy` VARCHAR(191) NOT NULL,
    `paymentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `saleId` VARCHAR(191) NULL,
    `paymentId` VARCHAR(191) NULL,
    `type` ENUM('sale', 'payment', 'advance', 'refund', 'adjustment') NOT NULL,
    `amount` DOUBLE NOT NULL,
    `balanceAfter` DOUBLE NOT NULL,
    `description` VARCHAR(191) NULL,
    `transactionDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CustomerTransaction_paymentId_key`(`paymentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Sale` (
    `id` VARCHAR(191) NOT NULL,
    `billNumber` VARCHAR(191) NOT NULL,
    `salesmanId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `customerPhone` VARCHAR(191) NULL,
    `customerEmail` VARCHAR(191) NULL,
    `customerAddress` VARCHAR(191) NULL,
    `customerGSTIN` VARCHAR(191) NULL,
    `customerPAN` VARCHAR(191) NULL,
    `totalAmount` DOUBLE NOT NULL,
    `discount` DOUBLE NOT NULL DEFAULT 0,
    `finalAmount` DOUBLE NOT NULL,
    `amountPaid` DOUBLE NOT NULL DEFAULT 0,
    `balanceDue` DOUBLE NOT NULL DEFAULT 0,
    `paymentStatus` ENUM('paid', 'partial', 'unpaid') NOT NULL DEFAULT 'unpaid',
    `cgstRate` DOUBLE NOT NULL DEFAULT 2.5,
    `sgstRate` DOUBLE NOT NULL DEFAULT 2.5,
    `paymentMethod` ENUM('cash', 'card', 'upi', 'credit') NOT NULL,
    `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `rejectionReason` VARCHAR(191) NULL,
    `deliveryNote` VARCHAR(191) NULL,
    `modeOfPayment` VARCHAR(191) NULL,
    `referenceNo` VARCHAR(191) NULL,
    `otherReferences` VARCHAR(191) NULL,
    `buyersOrderNo` VARCHAR(191) NULL,
    `buyersOrderDate` VARCHAR(191) NULL,
    `dispatchDocNo` VARCHAR(191) NULL,
    `deliveryNoteDate` VARCHAR(191) NULL,
    `dispatchedThrough` VARCHAR(191) NULL,
    `destination` VARCHAR(191) NULL,
    `poNumber` VARCHAR(191) NULL,
    `vehicleNo` VARCHAR(191) NULL,
    `billLocation` TEXT NULL,
    `saleDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dueDate` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,
    `deletedBy` VARCHAR(191) NULL,
    `deleteReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Sale_billNumber_key`(`billNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SaleItem` (
    `id` VARCHAR(191) NOT NULL,
    `saleId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `productName` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `price` DOUBLE NOT NULL,
    `total` DOUBLE NOT NULL,
    `hsnCode` VARCHAR(191) NULL,
    `batchNo` VARCHAR(191) NULL,
    `expDate` VARCHAR(191) NULL,
    `mfgDate` VARCHAR(191) NULL,
    `unit` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Order` (
    `id` VARCHAR(191) NOT NULL,
    `orderNumber` VARCHAR(191) NOT NULL,
    `salesmanId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `customerPhone` VARCHAR(191) NULL,
    `customerEmail` VARCHAR(191) NULL,
    `customerAddress` TEXT NULL,
    `customerGSTIN` VARCHAR(191) NULL,
    `customerPAN` VARCHAR(191) NULL,
    `totalAmount` DOUBLE NOT NULL,
    `discount` DOUBLE NOT NULL DEFAULT 0,
    `finalAmount` DOUBLE NOT NULL,
    `amountPaid` DOUBLE NOT NULL DEFAULT 0,
    `balanceDue` DOUBLE NOT NULL DEFAULT 0,
    `paymentStatus` ENUM('paid', 'partial', 'unpaid') NOT NULL DEFAULT 'unpaid',
    `cgstRate` DOUBLE NOT NULL DEFAULT 2.5,
    `sgstRate` DOUBLE NOT NULL DEFAULT 2.5,
    `paymentMethod` ENUM('cash', 'card', 'upi', 'credit') NOT NULL,
    `orderStatus` ENUM('pending', 'approved', 'rejected', 'converted') NOT NULL DEFAULT 'pending',
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `rejectionReason` VARCHAR(191) NULL,
    `convertedSaleId` VARCHAR(191) NULL,
    `deliveryNote` VARCHAR(191) NULL,
    `modeOfPayment` VARCHAR(191) NULL,
    `referenceNo` VARCHAR(191) NULL,
    `otherReferences` VARCHAR(191) NULL,
    `buyersOrderNo` VARCHAR(191) NULL,
    `buyersOrderDate` VARCHAR(191) NULL,
    `dispatchDocNo` VARCHAR(191) NULL,
    `deliveryNoteDate` VARCHAR(191) NULL,
    `dispatchedThrough` VARCHAR(191) NULL,
    `destination` VARCHAR(191) NULL,
    `poNumber` VARCHAR(191) NULL,
    `vehicleNo` VARCHAR(191) NULL,
    `orderLocation` TEXT NULL,
    `orderDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Order_orderNumber_key`(`orderNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `productName` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `price` DOUBLE NOT NULL,
    `total` DOUBLE NOT NULL,
    `hsnCode` VARCHAR(191) NULL,
    `batchNo` VARCHAR(191) NULL,
    `expDate` VARCHAR(191) NULL,
    `mfgDate` VARCHAR(191) NULL,
    `unit` VARCHAR(191) NULL,
    `availability` ENUM('available', 'not_available') NOT NULL DEFAULT 'available',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Expenditure` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `description` TEXT NOT NULL,
    `amount` DOUBLE NOT NULL,
    `evidenceFile` TEXT NULL,
    `evidenceType` VARCHAR(191) NULL,
    `evidenceName` VARCHAR(191) NULL,
    `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `rejectionReason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Attendance` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `checkInTime` DATETIME(3) NULL,
    `checkOutTime` DATETIME(3) NULL,
    `checkInIp` VARCHAR(191) NULL,
    `checkOutIp` VARCHAR(191) NULL,
    `checkInDevice` VARCHAR(191) NULL,
    `checkOutDevice` VARCHAR(191) NULL,
    `checkInLocation` VARCHAR(191) NULL,
    `checkOutLocation` VARCHAR(191) NULL,
    `checkInPhoto` LONGTEXT NULL,
    `checkOutPhoto` LONGTEXT NULL,
    `totalHours` DOUBLE NULL,
    `status` ENUM('present', 'absent', 'half_day', 'late', 'on_leave') NOT NULL DEFAULT 'present',
    `approvalStatus` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `lateReason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Attendance_userId_date_key`(`userId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesReturn` (
    `id` VARCHAR(191) NOT NULL,
    `returnNumber` VARCHAR(191) NOT NULL,
    `saleId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NULL,
    `reason` TEXT NOT NULL,
    `totalAmount` DOUBLE NOT NULL,
    `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `returnDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SalesReturn_returnNumber_key`(`returnNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesReturnItem` (
    `id` VARCHAR(191) NOT NULL,
    `salesReturnId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `productName` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `price` DOUBLE NOT NULL,
    `total` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductBatch` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `batchNo` VARCHAR(191) NOT NULL,
    `mfgDate` DATETIME(3) NULL,
    `expDate` DATETIME(3) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `branchId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ProductBatch_productId_batchNo_key`(`productId`, `batchNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Supplier` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `contactPerson` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `gstin` VARCHAR(191) NULL,
    `pan` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `bankName` VARCHAR(191) NULL,
    `bankAccountNo` VARCHAR(191) NULL,
    `bankIfsc` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Purchase` (
    `id` VARCHAR(191) NOT NULL,
    `purchaseNumber` VARCHAR(191) NOT NULL,
    `supplierId` VARCHAR(191) NOT NULL,
    `totalAmount` DOUBLE NOT NULL,
    `discount` DOUBLE NOT NULL DEFAULT 0,
    `finalAmount` DOUBLE NOT NULL,
    `cgstRate` DOUBLE NOT NULL DEFAULT 2.5,
    `sgstRate` DOUBLE NOT NULL DEFAULT 2.5,
    `paymentStatus` ENUM('paid', 'partial', 'unpaid') NOT NULL DEFAULT 'unpaid',
    `amountPaid` DOUBLE NOT NULL DEFAULT 0,
    `balanceDue` DOUBLE NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `purchaseDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Purchase_purchaseNumber_key`(`purchaseNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurchaseItem` (
    `id` VARCHAR(191) NOT NULL,
    `purchaseId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `productName` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `price` DOUBLE NOT NULL,
    `total` DOUBLE NOT NULL,
    `batchNo` VARCHAR(191) NULL,
    `expDate` VARCHAR(191) NULL,
    `mfgDate` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeaveRequest` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `leaveType` ENUM('casual', 'sick', 'earned', 'unpaid', 'maternity', 'paternity') NOT NULL,
    `startDate` DATE NOT NULL,
    `endDate` DATE NOT NULL,
    `totalDays` DOUBLE NOT NULL,
    `reason` TEXT NOT NULL,
    `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `rejectionReason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DamageRecord` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL,
    `reason` TEXT NOT NULL,
    `reportedBy` VARCHAR(191) NOT NULL,
    `damageDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `entity` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NULL,
    `oldValues` TEXT NULL,
    `newValues` TEXT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesmanLocation` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `latitude` DOUBLE NOT NULL,
    `longitude` DOUBLE NOT NULL,
    `accuracy` DOUBLE NULL,
    `speed` DOUBLE NULL,
    `heading` DOUBLE NULL,
    `altitude` DOUBLE NULL,
    `batteryLevel` DOUBLE NULL,
    `address` TEXT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SalesmanLocation_userId_timestamp_idx`(`userId`, `timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerVisit` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NULL,
    `customerName` VARCHAR(191) NULL,
    `checkInTime` DATETIME(3) NOT NULL,
    `checkInLat` DOUBLE NOT NULL,
    `checkInLng` DOUBLE NOT NULL,
    `checkInAddress` TEXT NULL,
    `checkInPhoto` LONGTEXT NULL,
    `checkOutTime` DATETIME(3) NULL,
    `checkOutLat` DOUBLE NULL,
    `checkOutLng` DOUBLE NULL,
    `checkOutAddress` TEXT NULL,
    `durationMinutes` INTEGER NULL,
    `distanceFromCustomer` DOUBLE NULL,
    `visitPurpose` VARCHAR(191) NULL,
    `outcome` ENUM('order_placed', 'payment_collected', 'follow_up_needed', 'not_interested', 'shop_closed', 'customer_not_available', 'other') NULL,
    `notes` TEXT NULL,
    `orderId` VARCHAR(191) NULL,
    `saleId` VARCHAR(191) NULL,
    `amountCollected` DOUBLE NULL,
    `visitDate` DATE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CustomerVisit_userId_visitDate_idx`(`userId`, `visitDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DailyRouteSummary` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `startTime` DATETIME(3) NULL,
    `endTime` DATETIME(3) NULL,
    `totalDistanceKm` DOUBLE NOT NULL DEFAULT 0,
    `totalCustomersPlanned` INTEGER NOT NULL DEFAULT 0,
    `totalCustomersVisited` INTEGER NOT NULL DEFAULT 0,
    `totalOrdersTaken` INTEGER NOT NULL DEFAULT 0,
    `totalAmountCollected` DOUBLE NOT NULL DEFAULT 0,
    `productiveHours` DOUBLE NOT NULL DEFAULT 0,
    `idleTimeMinutes` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DailyRouteSummary_userId_date_key`(`userId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerLocation` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `latitude` DOUBLE NOT NULL,
    `longitude` DOUBLE NOT NULL,
    `address` TEXT NULL,
    `geofenceRadius` DOUBLE NOT NULL DEFAULT 100,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CustomerLocation_customerId_key`(`customerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DealerApplication` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `firmName` VARCHAR(191) NOT NULL,
    `fullAddress` TEXT NULL,
    `firmType` VARCHAR(191) NULL,
    `mobile` VARCHAR(191) NULL,
    `telephone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `partner1Name` VARCHAR(191) NULL,
    `partner1Address` TEXT NULL,
    `partner2Name` VARCHAR(191) NULL,
    `partner2Address` TEXT NULL,
    `partner3Name` VARCHAR(191) NULL,
    `partner3Address` TEXT NULL,
    `residenceAddress` TEXT NULL,
    `pan` VARCHAR(191) NULL,
    `gst` VARCHAR(191) NULL,
    `license` VARCHAR(191) NULL,
    `udyam` VARCHAR(191) NULL,
    `validity` VARCHAR(191) NULL,
    `businessNature` VARCHAR(191) NULL,
    `turnoverWholesaler` VARCHAR(191) NULL,
    `turnoverRetailer` VARCHAR(191) NULL,
    `establishmentDate` VARCHAR(191) NULL,
    `bankName` VARCHAR(191) NULL,
    `accountNo` VARCHAR(191) NULL,
    `branch` VARCHAR(191) NULL,
    `ifsc` VARCHAR(191) NULL,
    `company1Name` VARCHAR(191) NULL,
    `company1Product` VARCHAR(191) NULL,
    `company1Turnover` VARCHAR(191) NULL,
    `company2Name` VARCHAR(191) NULL,
    `company2Product` VARCHAR(191) NULL,
    `company2Turnover` VARCHAR(191) NULL,
    `company3Name` VARCHAR(191) NULL,
    `company3Product` VARCHAR(191) NULL,
    `company3Turnover` VARCHAR(191) NULL,
    `chequeNo1` VARCHAR(191) NULL,
    `chequeNo2` VARCHAR(191) NULL,
    `chequeNo3` VARCHAR(191) NULL,
    `bankNameSecurity` VARCHAR(191) NULL,
    `securityAmount` VARCHAR(191) NULL,
    `rtgsDetails` VARCHAR(191) NULL,
    `dealerPlace` VARCHAR(191) NULL,
    `dealerDate` VARCHAR(191) NULL,
    `remark` TEXT NULL,
    `photo` LONGTEXT NULL,
    `stamp` LONGTEXT NULL,
    `cheque` LONGTEXT NULL,
    `signature` LONGTEXT NULL,
    `tsoSignature` LONGTEXT NULL,
    `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `rejectionReason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockUpdateRequest` (
    `id` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `requestType` ENUM('update_quantity', 'add_product') NOT NULL DEFAULT 'update_quantity',
    `currentQuantity` INTEGER NULL,
    `requestedQuantity` INTEGER NOT NULL,
    `reason` TEXT NULL,
    `requestedBy` VARCHAR(191) NOT NULL,
    `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `rejectionReason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `entityType` VARCHAR(191) NULL,
    `entityId` VARCHAR(191) NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `createdBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Conversation` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('direct', 'group', 'broadcast') NOT NULL,
    `name` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `lastMessageAt` DATETIME(3) NULL,

    INDEX `Conversation_type_idx`(`type`),
    INDEX `Conversation_lastMessageAt_idx`(`lastMessageAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ConversationParticipant` (
    `id` VARCHAR(191) NOT NULL,
    `conversationId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastReadAt` DATETIME(3) NULL,

    INDEX `ConversationParticipant_userId_idx`(`userId`),
    UNIQUE INDEX `ConversationParticipant_conversationId_userId_key`(`conversationId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChatMessage` (
    `id` VARCHAR(191) NOT NULL,
    `conversationId` VARCHAR(191) NOT NULL,
    `senderId` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ChatMessage_conversationId_createdAt_idx`(`conversationId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `OrganizationDocument` ADD CONSTRAINT `OrganizationDocument_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Branch` ADD CONSTRAINT `Branch_managerId_fkey` FOREIGN KEY (`managerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyStock` ADD CONSTRAINT `CompanyStock_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BranchStock` ADD CONSTRAINT `BranchStock_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BranchStock` ADD CONSTRAINT `BranchStock_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesmanStock` ADD CONSTRAINT `SalesmanStock_salesmanId_fkey` FOREIGN KEY (`salesmanId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesmanStock` ADD CONSTRAINT `SalesmanStock_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesmanStock` ADD CONSTRAINT `SalesmanStock_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockTransfer` ADD CONSTRAINT `StockTransfer_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockTransfer` ADD CONSTRAINT `StockTransfer_fromBranchId_fkey` FOREIGN KEY (`fromBranchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockTransfer` ADD CONSTRAINT `StockTransfer_transferredBy_fkey` FOREIGN KEY (`transferredBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerTransaction` ADD CONSTRAINT `CustomerTransaction_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerTransaction` ADD CONSTRAINT `CustomerTransaction_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerTransaction` ADD CONSTRAINT `CustomerTransaction_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_salesmanId_fkey` FOREIGN KEY (`salesmanId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SaleItem` ADD CONSTRAINT `SaleItem_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SaleItem` ADD CONSTRAINT `SaleItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_salesmanId_fkey` FOREIGN KEY (`salesmanId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Expenditure` ADD CONSTRAINT `Expenditure_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesReturn` ADD CONSTRAINT `SalesReturn_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesReturn` ADD CONSTRAINT `SalesReturn_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesReturnItem` ADD CONSTRAINT `SalesReturnItem_salesReturnId_fkey` FOREIGN KEY (`salesReturnId`) REFERENCES `SalesReturn`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesReturnItem` ADD CONSTRAINT `SalesReturnItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductBatch` ADD CONSTRAINT `ProductBatch_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductBatch` ADD CONSTRAINT `ProductBatch_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Purchase` ADD CONSTRAINT `Purchase_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseItem` ADD CONSTRAINT `PurchaseItem_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `Purchase`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseItem` ADD CONSTRAINT `PurchaseItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeaveRequest` ADD CONSTRAINT `LeaveRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DamageRecord` ADD CONSTRAINT `DamageRecord_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DamageRecord` ADD CONSTRAINT `DamageRecord_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DamageRecord` ADD CONSTRAINT `DamageRecord_reportedBy_fkey` FOREIGN KEY (`reportedBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesmanLocation` ADD CONSTRAINT `SalesmanLocation_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerVisit` ADD CONSTRAINT `CustomerVisit_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerVisit` ADD CONSTRAINT `CustomerVisit_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyRouteSummary` ADD CONSTRAINT `DailyRouteSummary_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerLocation` ADD CONSTRAINT `CustomerLocation_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DealerApplication` ADD CONSTRAINT `DealerApplication_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockUpdateRequest` ADD CONSTRAINT `StockUpdateRequest_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockUpdateRequest` ADD CONSTRAINT `StockUpdateRequest_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockUpdateRequest` ADD CONSTRAINT `StockUpdateRequest_requestedBy_fkey` FOREIGN KEY (`requestedBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Conversation` ADD CONSTRAINT `Conversation_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConversationParticipant` ADD CONSTRAINT `ConversationParticipant_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `Conversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConversationParticipant` ADD CONSTRAINT `ConversationParticipant_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatMessage` ADD CONSTRAINT `ChatMessage_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `Conversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatMessage` ADD CONSTRAINT `ChatMessage_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

