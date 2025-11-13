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

-- Create table to store conference QR codes
CREATE TABLE `conference_qr` (
  `qr_id` char(36) NOT NULL,
  `info` json NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `created_by` varchar(100) NOT NULL,
  `created_on` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`qr_id`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_created_on` (`created_on`),
  CONSTRAINT `chk_info_is_object` CHECK (JSON_TYPE(`info`) = 'OBJECT'),
  CONSTRAINT `chk_info_has_eventType` CHECK (JSON_EXTRACT(`info`, '$.eventType') IS NOT NULL)
);

-- Audit table for tracking QR code creations and deletions
CREATE TABLE `conference_qr_audit` (
  `qr_id` char(36) NOT NULL,
  `info` json DEFAULT NULL,
  `description` varchar(500) DEFAULT NULL,
  `created_by` varchar(100) DEFAULT NULL,
  `created_on` timestamp(6) DEFAULT NULL,
  `action_on` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `action_by` varchar(100) DEFAULT NULL,
  `action_type` enum('INSERT', 'DELETE') NOT NULL,
  PRIMARY KEY (`qr_id`, `action_on`),
  KEY `idx_qr_id` (`qr_id`),
  KEY `idx_action_type` (`action_type`),
  KEY `idx_action_on` (`action_on`),
  KEY `idx_action_by` (`action_by`)
);

-- Trigger to audit QR code creation
DELIMITER $$

CREATE TRIGGER `conference_qr_after_insert`
AFTER INSERT ON `conference_qr`
FOR EACH ROW
BEGIN
  INSERT INTO `conference_qr_audit` (
    `qr_id`,
    `info`,
    `description`,
    `created_by`,
    `created_on`,
    `action_by`,
    `action_type`
  ) VALUES (
    NEW.`qr_id`,
    NEW.`info`,
    NEW.`description`,
    NEW.`created_by`,
    NEW.`created_on`,
    NEW.`created_by`,
    'INSERT'
  );
END$$

-- Trigger to audit QR code deletion
CREATE TRIGGER `conference_qr_before_delete`
BEFORE DELETE ON `conference_qr`
FOR EACH ROW
BEGIN
  INSERT INTO `conference_qr_audit` (
    `qr_id`,
    `info`,
    `description`,
    `created_by`,
    `created_on`,
    `action_by`,
    `action_type`
  ) VALUES (
    OLD.`qr_id`,
    OLD.`info`,
    OLD.`description`,
    OLD.`created_by`,
    OLD.`created_on`,
    @deleted_by,
    'DELETE'
  );
END$$

DELIMITER ;
