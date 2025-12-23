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
CREATE TABLE `conference_event_type` (
  `category` enum('SESSION', 'O2BAR', 'GENERAL') NOT NULL,
  `type` varchar(100) UNIQUE NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `default_coins` decimal(10,2) NOT NULL,
  PRIMARY KEY (`category`),
  UNIQUE KEY `unique_type` (`type`)
);
