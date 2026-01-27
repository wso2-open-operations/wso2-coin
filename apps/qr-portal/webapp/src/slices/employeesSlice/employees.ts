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
import { EmployeeListItem } from "@/types/types";
import { AppConfig } from "@config/config";
import { SnackMessage } from "@config/constant";
import { enqueueSnackbarMessage } from "@slices/commonSlice/common";
import { APIService } from "@utils/apiService";

interface EmployeesState {
  state: State;
  stateMessage: string | null;
  errorMessage: string | null;
  employees: EmployeeListItem[];
}

const initialState: EmployeesState = {
  state: State.idle,
  stateMessage: null,
  errorMessage: null,
  employees: [],
};

export const fetchEmployees = createAsyncThunk(
  "employees/fetchEmployees",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      APIService.getCancelToken().cancel();
      const newCancelTokenSource = APIService.updateCancelToken();

      const response = await APIService.getInstance().get<EmployeeListItem[]>(
        AppConfig.serviceUrls.employees,
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
            message: SnackMessage.error.fetchEmployees,
            type: "error",
          }),
        );
        return rejectWithValue(error.response?.data?.message || "Failed to fetch employees");
      }
      return rejectWithValue("An unexpected error occurred");
    }
  },
);

export const employeesSlice = createSlice({
  name: "employees",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployees.pending, (state) => {
        state.state = State.loading;
        state.stateMessage = "Fetching employees...";
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.state = State.success;
        state.employees = action.payload;
        state.stateMessage = null;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.state = State.failed;
        state.errorMessage = action.payload as string;
      });
  },
});

export default employeesSlice.reducer;
