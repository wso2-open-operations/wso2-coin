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
import axios from "axios";

import { State } from "@/types/types";
import { AppConfig } from "@config/config";
import { SnackMessage } from "@config/constant";
import { enqueueSnackbarMessage } from "@slices/commonSlice/common";
import { APIService } from "@utils/apiService";

interface PartnerDomainState {
  state: State;
  stateMessage: string | null;
  errorMessage: string | null;
  domains: string[];
}

const initialState: PartnerDomainState = {
  state: State.idle,
  stateMessage: null,
  errorMessage: null,
  domains: [],
};

export const fetchPartnerDomains = createAsyncThunk(
  "partnerDomain/fetchPartnerDomains",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      APIService.getCancelToken().cancel();
      const newCancelTokenSource = APIService.updateCancelToken();

      const response = await APIService.getInstance().get<string[]>(
        AppConfig.serviceUrls.partnerDomains,
        {
          cancelToken: newCancelTokenSource.token,
        },
      );
      return response.data;
    } catch (error) {
      if (axios.isCancel(error)) {
        return rejectWithValue("Request Cancelled");
      }

      if (axios.isAxiosError(error)) {
        dispatch(
          enqueueSnackbarMessage({
            message: SnackMessage.error.fetchPartnerDomains,
            type: "error",
          }),
        );
        return rejectWithValue(error.response?.data?.message || "Failed to fetch partner domains");
      }
      return rejectWithValue("An unexpected error occurred");
    }
  },
);

export const partnerDomainSlice = createSlice({
  name: "partnerDomain",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPartnerDomains.pending, (state) => {
        state.state = State.loading;
        state.stateMessage = "Fetching partner domains...";
      })
      .addCase(fetchPartnerDomains.fulfilled, (state, action) => {
        state.state = State.success;
        state.domains = action.payload;
        state.stateMessage = null;
      })
      .addCase(fetchPartnerDomains.rejected, (state, action) => {
        state.state = State.failed;
        state.errorMessage = action.payload as string;
      });
  },
});

export default partnerDomainSlice.reducer;
