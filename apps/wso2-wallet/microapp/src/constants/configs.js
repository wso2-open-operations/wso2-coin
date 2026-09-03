// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

export const BACKEND_BASE_URL = process.env.REACT_APP_WALLET_BACKEND_BASE_URL;

export const STORAGE_KEYS = {
  WALLET_ADDRESS: "wallet-address",
  API_KEY: "api-key",
  THEME_MODE: "theme-mode",
  SENDER_WALLET_ADDRESS: "sender-wallet-address",
  SENDING_AMOUNT: "sending_amount"
};

export const MESSAGE_TYPES = {
  ERROR: "error",
  SUCCESS: "success",
  INFO: "info",
  WARNING: "warning"
};

export const DEFAULT_WALLET_ADDRESS = "0x";
