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
import { BasicUserInfo, DecodedIDTokenPayload } from "@asgardeo/auth-spa";

import { Role } from "@slices/authSlice/auth";

export type stateType = "failed" | "success" | "loading" | "idle";

export interface AuthState {
  status: State;
  mode: "active" | "maintenance";
  statusMessage: string | null;
  isAuthenticated: boolean;
  userInfo: BasicUserInfo | null;
  decodedIdToken: DecodedIDTokenPayload | null;
  roles: Role[];
}

export interface AuthData {
  userInfo: BasicUserInfo;
  decodedIdToken: DecodedIDTokenPayload;
}

export interface Header {
  title: string;
  size: number;
  align: "left" | "right" | "center";
}

export enum ThemeMode {
  Light = "light",
  Dark = "dark",
}

export interface PreLoaderProps {
  message?: string;
  hideLogo?: boolean;
  isLoading?: boolean;
}

export interface ErrorHandlerProps {
  message: string | null;
}

export enum State {
  failed = "failed",
  success = "success",
  loading = "loading",
  idle = "idle",
}

export enum ConfirmationType {
  update = "update",
  send = "send",
  upload = "upload",
  accept = "accept",
  delete = "delete",
}
