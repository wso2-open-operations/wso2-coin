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

import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { RootState } from "../store";
import { AuthState, AuthData } from "../../utils/types";
import { State } from "@/types/types";
import { enqueueSnackbarMessage } from "@slices/commonSlice/common";
import { UserState } from "@slices/userSlice/user";
import { SnackMessage, PRIVILEGES } from "@config/constant";

export enum Role {
  O2_BAR_ADMIN = "O2_BAR_ADMIN",
  SESSION_ADMIN = "SESSION_ADMIN",
  EMPLOYEE = "EMPLOYEE",
}

const initialState: AuthState = {
  isAuthenticated: false,
  status: State.idle,
  mode: "active",
  statusMessage: null,
  userInfo: null,
  decodedIdToken: null,
  roles: [],
};

export const loadPrivileges = createAsyncThunk(
  "auth/loadPrivileges",
  (_, { getState, dispatch, rejectWithValue }) => {
    const { userInfo, state, errorMessage } = (
      getState() as { user: UserState }
    ).user;

    if (state === State.failed) {
      dispatch(
        enqueueSnackbarMessage({
          message: SnackMessage.error.fetchPrivileges,
          type: "error",
        })
      );
      return rejectWithValue(errorMessage);
    }
    const userPrivileges = userInfo?.privileges || [];
    const roles: Role[] = [];

    if (userPrivileges.includes(PRIVILEGES.O2_BAR_ADMIN)) {
      roles.push(Role.O2_BAR_ADMIN);
    }
    if (userPrivileges.includes(PRIVILEGES.SESSION_ADMIN)) {
      roles.push(Role.SESSION_ADMIN);
    }
    if (userPrivileges.includes(PRIVILEGES.EMPLOYEE)) {
      roles.push(Role.EMPLOYEE);
    }

    if (roles.length === 0) {
      dispatch(
        enqueueSnackbarMessage({
          message: SnackMessage.error.insufficientPrivileges,
          type: "error",
        })
      );
      return rejectWithValue("No roles found");
    }
    return { roles };
  }
);

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUserAuthData: (state, action: PayloadAction<AuthData>) => {
      state.userInfo = action.payload.userInfo;
      state.decodedIdToken = action.payload.decodedIdToken;
      state.status = State.success;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadPrivileges.pending, (state) => {
        state.status = State.loading;
      })
      .addCase(loadPrivileges.fulfilled, (state, action) => {
        state.status = State.success;
        state.roles = action.payload.roles;
      })
      .addCase(loadPrivileges.rejected, (state, action) => {
        state.status = State.failed;
        state.statusMessage = action.payload as string;
      });
  },
});
export const { setUserAuthData } = authSlice.actions;
export const selectUserInfo = (state: RootState) => state.auth.userInfo;
export const selectRoles = (state: RootState) => state.auth.roles;
export default authSlice.reducer;
