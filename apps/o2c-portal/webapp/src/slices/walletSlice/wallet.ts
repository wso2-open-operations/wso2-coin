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
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios, { CancelTokenSource } from "axios";

import { State, UserWalletDetail, WalletBalance } from "@/types/types";
import { AppConfig } from "@config/config";
import { SnackMessage } from "@config/constant";
import { enqueueSnackbarMessage } from "@slices/commonSlice/common";
import { APIService } from "@utils/apiService";

let fetchCancelSource: CancelTokenSource | null = null;
let balanceCancelSource: CancelTokenSource | null = null;

interface WalletState {
  state: State;
  stateMessage: string | null;
  errorMessage: string | null;
  wallets: UserWalletDetail[];
  balances: Record<string, string>;
}

const initialState: WalletState = {
  state: State.idle,
  stateMessage: null,
  errorMessage: null,
  wallets: [],
  balances: {},
};

export const fetchWallets = createAsyncThunk(
  "wallet/fetchWallets",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      if (fetchCancelSource) {
        fetchCancelSource.cancel();
      }
      fetchCancelSource = axios.CancelToken.source();

      const response = await APIService.getInstance().get<UserWalletDetail[]>(
        AppConfig.serviceUrls.wallets,
        { cancelToken: fetchCancelSource.token },
      );
      return response.data;
    } catch (error) {
      if (axios.isCancel(error)) {
        return rejectWithValue("Request Cancelled");
      }
      if (axios.isAxiosError(error)) {
        dispatch(
          enqueueSnackbarMessage({
            message: SnackMessage.error.fetchWallets,
            type: "error",
          }),
        );
        return rejectWithValue(error.response?.data?.message || "Failed to fetch wallets");
      }
      return rejectWithValue("An unexpected error occurred");
    }
  },
);

export const fetchWalletBalances = createAsyncThunk(
  "wallet/fetchWalletBalances",
  async (addresses: string[], { dispatch, rejectWithValue }) => {
    try {
      if (balanceCancelSource) {
        balanceCancelSource.cancel();
      }
      balanceCancelSource = axios.CancelToken.source();

      const response = await APIService.getInstance().post<WalletBalance[]>(
        AppConfig.serviceUrls.walletBalances,
        addresses,
        { cancelToken: balanceCancelSource.token },
      );
      return response.data;
    } catch (error) {
      if (axios.isCancel(error)) {
        return rejectWithValue("Request Cancelled");
      }
      if (axios.isAxiosError(error)) {
        dispatch(
          enqueueSnackbarMessage({
            message: SnackMessage.error.fetchWalletBalances,
            type: "error",
          }),
        );
        return rejectWithValue(error.response?.data?.message || "Failed to fetch balances");
      }
      return rejectWithValue("Failed to fetch balances");
    }
  },
);

export const walletSlice = createSlice({
  name: "wallet",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchWallets.pending, (state) => {
        state.state = State.loading;
        state.stateMessage = "Fetching wallets...";
      })
      .addCase(fetchWallets.fulfilled, (state, action) => {
        state.state = State.success;
        state.wallets = action.payload;
        state.stateMessage = null;
      })
      .addCase(fetchWallets.rejected, (state, action) => {
        state.state = State.failed;
        state.errorMessage = action.payload as string;
      })
      .addCase(fetchWalletBalances.fulfilled, (state, action) => {
        for (const walletBalance of action.payload) {
          state.balances[walletBalance.walletAddress] = walletBalance.balance;
        }
      })
      .addCase(fetchWalletBalances.rejected, (state, action) => {
        if (action.payload === "Request Cancelled") return;
        state.errorMessage = action.payload as string;
      });
  },
});

export default walletSlice.reducer;
