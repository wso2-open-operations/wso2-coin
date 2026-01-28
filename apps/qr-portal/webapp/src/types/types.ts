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
import type { BasicUserInfo, DecodedIDTokenPayload } from "@asgardeo/auth-spa";
import type { NonIndexRouteObject } from "react-router-dom";

export type NavState = {
  hovered: number | null;
  active: number | null;
  expanded: number | null;
};

export enum State {
  failed = "failed",
  success = "success",
  loading = "loading",
  idle = "idle",
}

export enum Role {
  ADMIN = "ADMIN",
  O2BAR_ADMIN = "O2BAR_ADMIN",
  GENERAL_ADMIN = "GENERAL_ADMIN",
  SESSION_ADMIN = "SESSION_ADMIN",
}

export enum UpdateAction {
  Favorite = "favourite",
  Unfavourite = "unfavourite",
}

// Auth-related types
export interface ExtendedDecodedIDTokenPayload extends DecodedIDTokenPayload {
  groups?: string[];
}

export interface AuthState {
  status: State;
  mode: "active" | "maintenance";
  statusMessage: string | null;
  userInfo: BasicUserInfo | null;
  decodedIdToken: ExtendedDecodedIDTokenPayload | null;
  roles: Role[];
}

export interface AuthData {
  userInfo: BasicUserInfo;
  decodedIdToken: ExtendedDecodedIDTokenPayload;
}

export interface Employee {
  employeeId: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  employeeThumbnail?: string | null;
  jobRole: string;
}

// Employee information for listing.
export interface EmployeeListItem {
  firstName: string;
  lastName: string;
  workEmail: string;
}

export interface UserInfoInterface extends Employee {
  privileges: number[];
}

export interface UserState {
  state: State;
  stateMessage: string | null;
  errorMessage: string | null;
  userInfo: UserInfoInterface | null;
}

export enum ConfirmationType {
  update = "update",
  send = "send",
  upload = "upload",
  accept = "accept",
}

export interface RouteDetail {
  path: string;
  allowRoles: string[];
  icon: React.ReactElement<any, string | React.JSXElementConstructor<any>> | undefined;
  text: string;
  children?: RouteObjectWithRole[];
  bottomNav?: boolean;
  element?: React.ReactNode;
}

export interface RouteObjectWithRole extends NonIndexRouteObject {
  allowRoles: string[];
  icon: React.ReactElement<any, string | React.JSXElementConstructor<any>> | undefined;
  text: string;
  children?: RouteObjectWithRole[];
  bottomNav?: boolean;
  element?: React.ReactNode;
}

export enum QrCodeEventType {
  SESSION = "SESSION",
  O2BAR = "O2BAR",
  GENERAL = "GENERAL",
}

export interface QrCodeInfoSession {
  eventType: "SESSION";
  sessionId: string;
}

export interface QrCodeInfoO2Bar {
  eventType: "O2BAR";
  email: string;
}

export interface QrCodeInfoGeneral {
  eventType: "GENERAL";
  eventTypeName: string;
}

export type QrCodeInfo = QrCodeInfoSession | QrCodeInfoO2Bar | QrCodeInfoGeneral;

export interface ConferenceQrCode {
  qrId: string;
  info: QrCodeInfo;
  description?: string;
  coins: number;
  createdBy: string;
  createdOn: string;
}

export interface ConferenceEventType {
  eventTypeName: string;
  category: "SESSION" | "O2BAR" | "GENERAL";
  description?: string;
  defaultCoins: number;
}

export interface CreateQrCodePayload {
  info: QrCodeInfo;
  description?: string;
  coins: number;
}

export interface ConferenceQrCodesResponse {
  totalCount: number;
  qrs: ConferenceQrCode[];
}

export interface Session {
  id: string;
  name: string;
  presenters: string[];
}

export interface UserInfo {
  email: string;
  privileges: number[];
}
