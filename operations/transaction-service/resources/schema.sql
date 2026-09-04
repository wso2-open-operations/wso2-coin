-- Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
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

-- Transaction service schema. Run against the wallet database.
--
-- This service owns only the client_master_wallet table below. The
-- user_wallet and transaction tables are provided by the wallet backend /
-- migration; this service reads and writes them but they are defined
-- elsewhere.

CREATE TABLE IF NOT EXISTS client_master_wallet (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY        COMMENT 'Auto-increment row ID',
    client_id      VARCHAR(255) NOT NULL                    COMMENT 'OAuth consumer key / client ID (JWT sub) of the calling client',
    wallet_address VARCHAR(255) NOT NULL                    COMMENT 'The client''s master (sender) wallet; must exist in user_wallet',
    use_case       VARCHAR(255) NULL                        COMMENT 'What the client uses this wallet for',
    client_name    VARCHAR(255) NULL                        COMMENT 'Human-readable client name',
    is_active      BOOLEAN NOT NULL DEFAULT TRUE            COMMENT 'Whether this client is active',
    created_on     TIMESTAMP DEFAULT CURRENT_TIMESTAMP      COMMENT 'Row creation timestamp',
    updated_on     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
    UNIQUE KEY uq_client_id (client_id),
    UNIQUE KEY uq_wallet_address (wallet_address),
    CONSTRAINT fk_cmw_wallet FOREIGN KEY (wallet_address) REFERENCES user_wallet (wallet_address)
);
