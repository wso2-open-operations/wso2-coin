-- Copyright (c) 2025 WSO2 LLC. (https://www.wso2.com).
--
-- WSO2 LLC. licenses this file to you under the Apache License,
-- Version 2.0 (the "License"); you may not use this file except
-- in compliance with the License.
-- You may obtain a copy of the License at
--
-- http://www.apache.org/licenses/LICENSE-2.0
--
-- Unless required by applicable law or agreed to in writing,
-- software distributed under the License is distributed on an
-- "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
-- KIND, either express or implied.  See the License for the
-- specific language governing permissions and limitations
-- under the License.

-- Add status column with default value ACTIVE
ALTER TABLE `conference_qr`
ADD COLUMN `status` enum('ACTIVE', 'DELETED') NOT NULL DEFAULT 'ACTIVE'
AFTER `created_on`;

ALTER TABLE `conference_qr`
ADD KEY `idx_status` (`status`);

-- Add deleted_by column to track who deleted the QR code
ALTER TABLE `conference_qr`
ADD COLUMN `deleted_by` varchar(100) DEFAULT NULL
AFTER `status`;

-- Drop old stored procedure
DROP PROCEDURE IF EXISTS `delete_qr_code_with_audit`;

-- Create trigger to audit QR code deletion
DELIMITER $$

CREATE TRIGGER `conference_qr_before_update`
BEFORE UPDATE ON `conference_qr`
FOR EACH ROW
BEGIN
  IF OLD.`status` = 'ACTIVE' AND NEW.`status` = 'DELETED' THEN
    INSERT INTO `conference_qr_audit` (
      `qr_id`,
      `info`,
      `description`,
      `action_by`,
      `action_type`
    ) VALUES (
      OLD.`qr_id`,
      OLD.`info`,
      OLD.`description`,
      NEW.`deleted_by`,
      'DELETE'
    );
  END IF;
END$$

DELIMITER ;
