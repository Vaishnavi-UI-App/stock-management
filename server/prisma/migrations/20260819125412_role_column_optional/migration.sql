-- AlterTable
ALTER TABLE `User` MODIFY `role` ENUM('stock_manager', 'account_manager', 'branch_manager', 'salesman') NULL;
