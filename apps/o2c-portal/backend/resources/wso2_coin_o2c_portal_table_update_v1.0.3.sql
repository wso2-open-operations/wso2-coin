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

-- Modify conference_event_type category enum to include PARTNER
ALTER TABLE `conference_event_type` MODIFY `category` enum('SESSION','O2BAR','GENERAL','PARTNER') NOT NULL;

-- Add constraint to check partner type match
ALTER TABLE `conference_event_type` ADD CONSTRAINT `chk_partner_type_match` CHECK (`category` != 'PARTNER' OR `type` = 'PARTNER');

-- Insert partner event type
INSERT INTO `conference_event_type` (`type`, `category`, `description`, `default_coins`) VALUES
('PARTNER', 'PARTNER', 'Partner QR code', 5.00)
ON DUPLICATE KEY UPDATE 
    `category` = VALUES(`category`),
    `description` = VALUES(`description`), 
    `default_coins` = VALUES(`default_coins`);
