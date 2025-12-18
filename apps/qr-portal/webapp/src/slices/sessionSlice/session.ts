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
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { State } from "@/types/types";
import { Session } from "@/types/types";
import { AppConfig } from "@config/config";
import { SnackMessage } from "@config/constant";
import { enqueueSnackbarMessage } from "@slices/commonSlice/common";
import { APIService } from "@utils/apiService";

interface SessionState {
  state: State;
  stateMessage: string | null;
  errorMessage: string | null;
  sessions: Session[];
}

const initialState: SessionState = {
  state: State.idle,
  stateMessage: null,
  errorMessage: null,
  sessions: [],
};

export const fetchSessions = createAsyncThunk(
  "session/fetchSessions",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const response = await APIService.getInstance().get<Session[]>(
        AppConfig.serviceUrls.sessions,
      );
      return response.data;
    } catch (error: any) {
      dispatch(
        enqueueSnackbarMessage({
          message: SnackMessage.error.fetchSessions,
          type: "error",
        }),
      );
      return rejectWithValue(error.message || "Failed to fetch sessions");
    }
  },
);

export const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSessions.pending, (state) => {
        state.state = State.loading;
        state.stateMessage = "Fetching sessions...";
      })
      .addCase(fetchSessions.fulfilled, (state, action) => {
        state.state = State.success;
        state.sessions = action.payload;
        state.stateMessage = null;
      })
      .addCase(fetchSessions.rejected, (state, action) => {
        state.state = State.failed;
        state.errorMessage = action.payload as string;
      });
  },
});

export default sessionSlice.reducer;
