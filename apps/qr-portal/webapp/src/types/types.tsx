// Copyright (c) 2025 WSO2 LLC. (https://www.wso2.com).
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

export enum State {
  failed = "failed",
  success = "success",
  loading = "loading",
  idle = "idle",
}

export enum QrCodeEventType {
  SESSION = "SESSION",
  O2BAR = "O2BAR",
}

export interface QrCodeInfoSession {
  eventType: "SESSION";
  sessionId: string;
}

export interface QrCodeInfoO2Bar {
  eventType: "O2BAR";
  email: string;
}

export type QrCodeInfo = QrCodeInfoSession | QrCodeInfoO2Bar;

export interface ConferenceQrCode {
  qrId: string;
  info: QrCodeInfo;
  description?: string;
  createdBy: string;
  createdOn: string;
}

export interface CreateQrCodePayload {
  info: QrCodeInfo;
  description?: string;
}

export interface ConferenceQrCodesResponse {
  totalCount: number;
  qrs: ConferenceQrCode[];
}

export interface Session {
  id: string;
  name: string;
  presenter: string;
}

export interface UserInfo {
  email: string;
  privileges: number[];
}

