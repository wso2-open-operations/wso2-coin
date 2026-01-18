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
import { PayloadAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

import { State } from "@/types/types";
import { ConferenceQrCode, ConferenceQrCodesResponse, CreateQrCodePayload } from "@/types/types";
import { AppConfig } from "@config/config";
import { SnackMessage } from "@config/constant";
import { enqueueSnackbarMessage } from "@slices/commonSlice/common";
import { APIService } from "@utils/apiService";

interface QrState {
  state: State;
  stateMessage: string | null;
  errorMessage: string | null;
  qrCodes: ConferenceQrCode[];
  totalCount: number;
  limit: number;
  offset: number;
}

const initialState: QrState = {
  state: State.idle,
  stateMessage: null,
  errorMessage: null,
  qrCodes: [],
  totalCount: 0,
  limit: 10,
  offset: 0,
};

export const fetchQrCodes = createAsyncThunk(
  "qr/fetchQrCodes",
  async (params: { limit?: number; offset?: number }, { dispatch, rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.limit) queryParams.append("limit", params.limit.toString());
      if (params.offset) queryParams.append("offset", params.offset.toString());

      const url = `${AppConfig.serviceUrls.qrCodes}?${queryParams.toString()}`;
      const response = await APIService.getInstance().get<ConferenceQrCodesResponse>(url);
      return response.data;
    } catch (error) {
      if (axios.isCancel(error)) {
        return rejectWithValue("Request Cancelled");
      }

      if (axios.isAxiosError(error)) {
        dispatch(
          enqueueSnackbarMessage({
            message: SnackMessage.error.fetchQrCodes,
            type: "error",
          }),
        );
        return rejectWithValue(error.response?.data?.message || "Failed to fetch QR codes");
      }
      return rejectWithValue("An unexpected error occurred");
    }
  },
);

export const createQrCode = createAsyncThunk(
  "qr/createQrCode",
  async (payload: CreateQrCodePayload, { dispatch, rejectWithValue }) => {
    try {
      const response = await APIService.getInstance().post<{ qrId: string }>(
        AppConfig.serviceUrls.qrCodes,
        payload,
      );
      dispatch(
        enqueueSnackbarMessage({
          message: SnackMessage.success.qrCodeCreated,
          type: "success",
        }),
      );
      return response.data;
    } catch (error) {
      if (axios.isCancel(error)) {
        return rejectWithValue("Request Cancelled");
      }

      if (axios.isAxiosError(error)) {
        const errorMessage =
          error.response?.status === 400
            ? SnackMessage.error.duplicateQrCode
            : SnackMessage.error.createQrCode;
        dispatch(
          enqueueSnackbarMessage({
            message: errorMessage,
            type: "error",
          }),
        );
        return rejectWithValue(error.response?.data?.message || "Failed to create QR code");
      }
      return rejectWithValue("An unexpected error occurred");
    }
  },
);

export const deleteQrCode = createAsyncThunk(
  "qr/deleteQrCode",
  async (qrId: string, { dispatch, rejectWithValue }) => {
    try {
      await APIService.getInstance().delete(`${AppConfig.serviceUrls.qrCodes}/${qrId}`);
      dispatch(
        enqueueSnackbarMessage({
          message: SnackMessage.success.qrCodeDeleted,
          type: "success",
        }),
      );
      return qrId;
    } catch (error) {
      if (axios.isCancel(error)) {
        return rejectWithValue("Request Cancelled");
      }

      if (axios.isAxiosError(error)) {
        dispatch(
          enqueueSnackbarMessage({
            message: SnackMessage.error.deleteQrCode,
            type: "error",
          }),
        );
        return rejectWithValue(error.response?.data?.message || "Failed to delete QR code");
      }
      return rejectWithValue("An unexpected error occurred");
    }
  },
);

export const qrSlice = createSlice({
  name: "qr",
  initialState,
  reducers: {
    setLimit: (state, action: PayloadAction<number>) => {
      state.limit = action.payload;
    },
    setOffset: (state, action: PayloadAction<number>) => {
      state.offset = action.payload;
    },
    clearQrCodes: (state) => {
      state.qrCodes = [];
      state.totalCount = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchQrCodes.pending, (state) => {
        state.state = State.loading;
        state.stateMessage = "Fetching QR codes...";
      })
      .addCase(fetchQrCodes.fulfilled, (state, action) => {
        state.state = State.success;
        state.qrCodes = action.payload.qrs;
        state.totalCount = action.payload.totalCount;
        state.stateMessage = null;
      })
      .addCase(fetchQrCodes.rejected, (state, action) => {
        state.state = State.failed;
        state.errorMessage = action.payload as string;
      })
      .addCase(createQrCode.pending, (state) => {
        state.state = State.loading;
        state.stateMessage = "Creating QR code...";
      })
      .addCase(createQrCode.fulfilled, (state) => {
        state.state = State.success;
        state.stateMessage = null;
      })
      .addCase(createQrCode.rejected, (state, action) => {
        state.state = State.failed;
        state.errorMessage = action.payload as string;
      })
      .addCase(deleteQrCode.fulfilled, (state, action) => {
        state.qrCodes = state.qrCodes.filter((qr) => qr.qrId !== action.payload);
        state.totalCount -= 1;
      });
  },
});

export const { setLimit, setOffset, clearQrCodes } = qrSlice.actions;
export default qrSlice.reducer;
