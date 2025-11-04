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
CREATE SCHEMA `qr_portal`;

USE `qr_portal`;

DROP TABLE IF EXISTS `conference_qr`;

CREATE TABLE `conference_qr` (
  `qr_id` char(36) NOT NULL DEFAULT (uuid()),
  `info` json NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `created_by` varchar(60) NOT NULL,
  `created_on` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`qr_id`)
);
