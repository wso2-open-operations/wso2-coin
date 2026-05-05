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
import { PayloadAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios, { CancelTokenSource } from "axios";

import { State, Transaction, TransactionSearchResponse, TransactionSearchRequest } from "@/types/types";
import { AppConfig } from "@config/config";
import { SnackMessage } from "@config/constant";
import { enqueueSnackbarMessage } from "@slices/commonSlice/common";
import { APIService } from "@utils/apiService";

let searchCancelSource: CancelTokenSource | null = null;
let emailsCancelSource: CancelTokenSource | null = null;

interface TransactionState {
  state: State;
  stateMessage: string | null;
  errorMessage: string | null;
  transactions: Transaction[];
  hasMore: boolean;
  limit: number;
  offset: number;
  emails: string[];
}

const initialState: TransactionState = {
  state: State.idle,
  stateMessage: null,
  errorMessage: null,
  transactions: [],
  hasMore: false,
  limit: 5,
  offset: 0,
  emails: [],
};

export const fetchWalletEmails = createAsyncThunk(
  "transaction/fetchWalletEmails",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      if (emailsCancelSource) {
        emailsCancelSource.cancel();
      }
      emailsCancelSource = axios.CancelToken.source();

      const response = await APIService.getInstance().get<string[]>(
        AppConfig.serviceUrls.walletEmails,
        { cancelToken: emailsCancelSource.token },
      );
      return response.data;
    } catch (error) {
      if (axios.isCancel(error)) {
        return rejectWithValue("Request Cancelled");
      }
      if (axios.isAxiosError(error)) {
        dispatch(
          enqueueSnackbarMessage({
            message: SnackMessage.error.fetchWalletEmails,
            type: "error",
          }),
        );
        return rejectWithValue(error.response?.data?.message || "Failed to fetch wallet emails");
      }
      return rejectWithValue("An unexpected error occurred");
    }
  },
);

export const searchTransactions = createAsyncThunk(
  "transaction/searchTransactions",
  async (params: TransactionSearchRequest, { dispatch, rejectWithValue }) => {
    try {
      if (searchCancelSource) {
        searchCancelSource.cancel();
      }
      searchCancelSource = axios.CancelToken.source();

      const response = await APIService.getInstance().post<TransactionSearchResponse>(
        AppConfig.serviceUrls.transactionSearch,
        params,
        {
          cancelToken: searchCancelSource.token,
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
            message: SnackMessage.error.searchTransactions,
            type: "error",
          }),
        );
        return rejectWithValue(error.response?.data?.message || "Failed to search transactions");
      }
      return rejectWithValue("An unexpected error occurred");
    }
  },
);

export const transactionSlice = createSlice({
  name: "transaction",
  initialState,
  reducers: {
    setLimit: (state, action: PayloadAction<number>) => {
      state.limit = action.payload;
      state.offset = 0;
    },
    setOffset: (state, action: PayloadAction<number>) => {
      state.offset = action.payload;
    },
    clearTransactions: (state) => {
      state.transactions = [];
      state.hasMore = false;
      state.offset = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchTransactions.pending, (state) => {
        state.state = State.loading;
        state.stateMessage = "Searching transactions...";
      })
      .addCase(searchTransactions.fulfilled, (state, action) => {
        state.state = State.success;
        state.transactions = action.payload.transactions;
        state.hasMore = action.payload.hasMore;
        state.stateMessage = null;
      })
      .addCase(searchTransactions.rejected, (state, action) => {
        if (action.payload === "Request Cancelled") return;
        state.state = State.failed;
        state.errorMessage = action.payload as string;
      })
      .addCase(fetchWalletEmails.fulfilled, (state, action) => {
        state.emails = action.payload;
      });
  },
});

export const { setLimit, setOffset, clearTransactions } = transactionSlice.actions;
export default transactionSlice.reducer;
