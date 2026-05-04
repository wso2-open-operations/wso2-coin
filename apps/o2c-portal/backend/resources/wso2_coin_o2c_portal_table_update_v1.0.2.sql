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

-- Add coins column to conference_qr table
ALTER TABLE `conference_qr`
ADD COLUMN `coins` decimal(10,2) NOT NULL
AFTER `description`;

-- Create table for conference event type table
CREATE TABLE IF NOT EXISTS `conference_event_type` (
  `type` varchar(100) NOT NULL,
  `category` enum('SESSION', 'O2BAR', 'GENERAL') NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `default_coins` decimal(10,2) NOT NULL,
  PRIMARY KEY (`type`),
  KEY `idx_category` (`category`),
  CONSTRAINT `chk_session_type_match` CHECK (`category` != 'SESSION' OR `type` = 'SESSION'),
  CONSTRAINT `chk_o2bar_type_match` CHECK (`category` != 'O2BAR' OR `type` = 'O2BAR')
);

-- Insert system event types
INSERT INTO `conference_event_type` (`type`, `category`, `description`, `default_coins`) VALUES
('SESSION', 'SESSION', 'Session QR code', 10.00),
('O2BAR', 'O2BAR', 'O2 Bar QR code', 5.00);
