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
// software distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

import { State } from "@/types/types";
import { ConferenceEventType } from "@/types/types";
import { AppConfig } from "@config/config";
import { SnackMessage } from "@config/constant";
import { enqueueSnackbarMessage } from "@slices/commonSlice/common";
import { APIService } from "@utils/apiService";

interface EventTypesState {
  state: State;
  stateMessage: string | null;
  errorMessage: string | null;
  eventTypes: ConferenceEventType[];
}

const initialState: EventTypesState = {
  state: State.idle,
  stateMessage: null,
  errorMessage: null,
  eventTypes: [],
};

export const fetchEventTypes = createAsyncThunk(
  "eventTypes/fetchEventTypes",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      APIService.getCancelToken().cancel();
      const newCancelTokenSource = APIService.updateCancelToken();

      const response = await APIService.getInstance().get<ConferenceEventType[]>(
        AppConfig.serviceUrls.eventTypes,
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
            message: SnackMessage.error.fetchEventTypes,
            type: "error",
          }),
        );

        return rejectWithValue(error.response?.data?.message || "An error occurred");
      }
      return rejectWithValue("An unexpected error occurred");
    }
  },
);

export const createEventType = createAsyncThunk(
  "eventTypes/createEventType",
  async (eventType: Omit<ConferenceEventType, "eventTypeName"> & { eventTypeName: string }, { dispatch, rejectWithValue }) => {
    try {
      const response = await APIService.getInstance().post<ConferenceEventType>(
        AppConfig.serviceUrls.eventTypes,
        eventType,
      );
      dispatch(
        enqueueSnackbarMessage({
          message: SnackMessage.success.eventTypeCreated,
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
            ? SnackMessage.error.duplicateEventType
            : SnackMessage.error.createEventType;
        dispatch(
          enqueueSnackbarMessage({
            message: errorMessage,
            type: "error",
          }),
        );
        return rejectWithValue(error.response?.data?.message || "Failed to create event type");
      }
      return rejectWithValue("An unexpected error occurred");
    }
  },
);

export const updateEventType = createAsyncThunk(
  "eventTypes/updateEventType",
  async (
    payload: { eventTypeName: string; description?: string; defaultCoins?: number },
    { dispatch, rejectWithValue, getState },
  ) => {
    try {
      // Get the current event type to preserve category
      const state = getState() as { eventTypes: EventTypesState };
      const currentEventType = state.eventTypes.eventTypes.find(
        (et) => et.eventTypeName === payload.eventTypeName,
      );

      if (!currentEventType) {
        return rejectWithValue("Event type not found");
      }

      // Build the update payload with all required fields
      const updatePayload: ConferenceEventType = {
        eventTypeName: payload.eventTypeName,
        category: currentEventType.category,
        description: payload.description !== undefined ? payload.description : currentEventType.description,
        defaultCoins: payload.defaultCoins !== undefined ? payload.defaultCoins : currentEventType.defaultCoins,
      };

      const response = await APIService.getInstance().put<ConferenceEventType>(
        `${AppConfig.serviceUrls.eventTypes}/${encodeURIComponent(payload.eventTypeName)}`,
        updatePayload,
      );
      dispatch(
        enqueueSnackbarMessage({
          message: SnackMessage.success.eventTypeUpdated,
          type: "success",
        }),
      );
      return response.data;
    } catch (error) {
      if (axios.isCancel(error)) {
        return rejectWithValue("Request Cancelled");
      }

      if (axios.isAxiosError(error)) {
        dispatch(
          enqueueSnackbarMessage({
            message: SnackMessage.error.updateEventType,
            type: "error",
          }),
        );
        return rejectWithValue(error.response?.data?.message || "Failed to update event type");
      }
      return rejectWithValue("An unexpected error occurred");
    }
  },
);

export const deleteEventType = createAsyncThunk(
  "eventTypes/deleteEventType",
  async (eventTypeName: string, { dispatch, rejectWithValue }) => {
    try {
      await APIService.getInstance().delete(
        `${AppConfig.serviceUrls.eventTypes}/${encodeURIComponent(eventTypeName)}`,
      );
      dispatch(
        enqueueSnackbarMessage({
          message: SnackMessage.success.eventTypeDeleted,
          type: "success",
        }),
      );
      return eventTypeName;
    } catch (error) {
      if (axios.isCancel(error)) {
        return rejectWithValue("Request Cancelled");
      }

      if (axios.isAxiosError(error)) {
        dispatch(
          enqueueSnackbarMessage({
            message: SnackMessage.error.deleteEventType,
            type: "error",
          }),
        );
        return rejectWithValue(error.response?.data?.message || "Failed to delete event type");
      }
      return rejectWithValue("An unexpected error occurred");
    }
  },
);

export const eventTypesSlice = createSlice({
  name: "eventTypes",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEventTypes.pending, (state) => {
        state.state = State.loading;
        state.stateMessage = "Fetching event types...";
      })
      .addCase(fetchEventTypes.fulfilled, (state, action) => {
        state.state = State.success;
        state.eventTypes = action.payload;
        state.stateMessage = null;
      })
      .addCase(fetchEventTypes.rejected, (state, action) => {
        state.state = State.failed;
        state.errorMessage = action.payload as string;
      })
      .addCase(createEventType.pending, (state) => {
        state.state = State.loading;
        state.stateMessage = "Creating event type...";
      })
      .addCase(createEventType.fulfilled, (state, action) => {
        state.state = State.success;
        state.eventTypes.push(action.payload);
        state.stateMessage = null;
      })
      .addCase(createEventType.rejected, (state, action) => {
        state.state = State.failed;
        state.errorMessage = action.payload as string;
      })
      .addCase(updateEventType.pending, (state) => {
        state.state = State.loading;
        state.stateMessage = "Updating event type...";
      })
      .addCase(updateEventType.fulfilled, (state, action) => {
        state.state = State.success;
        const index = state.eventTypes.findIndex(
          (et) => et.eventTypeName === action.payload.eventTypeName,
        );
        if (index !== -1) {
          state.eventTypes[index] = action.payload;
        }
        state.stateMessage = null;
      })
      .addCase(updateEventType.rejected, (state, action) => {
        state.state = State.failed;
        state.errorMessage = action.payload as string;
      })
      .addCase(deleteEventType.pending, (state) => {
        state.state = State.loading;
        state.stateMessage = "Deleting event type...";
      })
      .addCase(deleteEventType.fulfilled, (state, action) => {
        state.state = State.success;
        state.eventTypes = state.eventTypes.filter(
          (et) => et.eventTypeName !== action.payload,
        );
        state.stateMessage = null;
      })
      .addCase(deleteEventType.rejected, (state, action) => {
        state.state = State.failed;
        state.errorMessage = action.payload as string;
      });
  },
});

export default eventTypesSlice.reducer;

