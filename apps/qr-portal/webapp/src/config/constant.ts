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

export const SnackMessage = {
  success: {
    qrCodeCreated: "QR code created successfully!",
    qrCodeDeleted: "QR code deleted successfully!",
    eventTypeCreated: "Event type created successfully!",
    eventTypeUpdated: "Event type updated successfully!",
    eventTypeDeleted: "Event type deleted successfully!",
  },
  error: {
    fetchPrivileges: "Error while fetching user privileges",
    insufficientPrivileges: "You don't have sufficient privileges to access this resource",
    fetchAppConfigMessage: "Error while fetching app config",
    fetchQrCodes: "Failed to fetch QR codes",
    createQrCode: "Failed to create QR code",
    deleteQrCode: "Failed to delete QR code",
    fetchSessions: "Failed to fetch sessions",
    fetchEmployees: "Failed to fetch employees",
    duplicateQrCode: "QR code already exists",
    fetchEventTypes: "Failed to fetch event types",
    createEventType: "Failed to create event type",
    updateEventType: "Failed to update event type",
    deleteEventType: "Failed to delete event type",
    duplicateEventType: "Event type already exists",
  },
  warning: {},
};

export const PRIVILEGES = {
  GENERAL_ADMIN: 191,
  SESSION_ADMIN: 181,
  EMPLOYEE: 171,
};

export const APP_DESC = "QR Portal";

export const redirectUrl = "qr-portal-redirect-url";

export const localStorageTheme = "qr-portal-theme";
