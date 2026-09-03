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

const TOPIC = {
  TOKEN: "token",
  QR_REQUEST: "qr_request",
  SAVE_LOCAL_DATA: "save_local_data",
  GET_LOCAL_DATA: "get_local_data",
  GET_LAUNCH_DATA: "get_launch_data",
  ALERT: "alert",
  CONFIRM_ALERT: "confirm_alert",
  TOTP: "totp",
  DEVICE_SAFE_AREA_INSETS: "device_safe_area_insets",
  NAVIGATE_TO_MY_APPS: "close_webview",
};

// Single-flight: `resolveToken` is one host-overwritten slot, so concurrent
// callers would clobber each other. Queue waiters, one native request per batch.
let tokenWaiters = [];
let tokenRequestInFlight = false;

export const getToken = (callback) => {
  if (!window.nativebridge) {
    console.error("Native bridge is not available");
    callback();
    return;
  }

  tokenWaiters.push(callback);

  window.nativebridge.resolveToken = (token) => {
    const waiters = tokenWaiters;
    tokenWaiters = [];
    tokenRequestInFlight = false;
    waiters.forEach((cb) => {
      try {
        cb(token);
      } catch (e) {
        console.error("Token waiter callback failed", e);
      }
    });
  };

  if (!tokenRequestInFlight) {
    tokenRequestInFlight = true;
    window.nativebridge.requestToken();
  }
};

// Show Alert
export const showAlert = (title, message, buttonText) => {
  if (window.nativebridge && window.ReactNativeWebView) {
    const alertData = JSON.stringify({
      topic: TOPIC.ALERT,
      data: { title, message, buttonText },
    });

    window.ReactNativeWebView.postMessage(alertData);
  } else {
    console.error("Native bridge is not available");
  }
};

// Confirm Alert
export const showConfirmAlert = (
  title,
  message,
  confirmButtonText,
  cancelButtonText,
  confirmCallback,
  cancelCallback
) => {
  if (window.nativebridge && window.ReactNativeWebView) {
    const confirmData = JSON.stringify({
      topic: TOPIC.CONFIRM_ALERT,
      data: { title, message, confirmButtonText, cancelButtonText },
    });

    window.ReactNativeWebView.postMessage(confirmData);

    window.nativebridge.resolveConfirmAlert = (action) => {
      if (action === "confirm") {
        confirmCallback();
      } else if (action === "cancel") {
        cancelCallback();
      }
    };
  } else {
    console.error("Native bridge is not available");
  }
};

// Scan QR Code
export const scanQrCode = (successCallback, failedToRespondCallback) => {
  if (window.nativebridge && window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({ topic: TOPIC.QR_REQUEST })
    );

    window.nativebridge.resolveQrCode = (qrData) => successCallback(qrData);
    window.nativebridge.rejectQrCode = (error) =>
      failedToRespondCallback(error);
  } else {
    console.error("Native bridge is not available");
  }
};

// Save Local Data
export const saveLocalData = (key, value, callback, failedToRespondCallback) => {
  key = key.toString().replace(" ", "-").toLowerCase();
  const encodedValue = btoa(JSON.stringify(value));

  if (window.nativebridge && window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        topic: TOPIC.SAVE_LOCAL_DATA,
        data: { key, value: encodedValue },
      })
    );

    window.nativebridge.resolveSaveLocalData = callback;
    window.nativebridge.rejectSaveLocalData = (error) =>
      failedToRespondCallback(error);
  } else {
    console.error("Native bridge is not available");
    failedToRespondCallback(new Error("Native bridge is not available"));
  }
};

// Get Local Data
export const getLocalData = (key, callback, failedToRespondCallback) => {
  key = key.toString().replace(" ", "-").toLowerCase();

  if (window.nativebridge && window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({ topic: TOPIC.GET_LOCAL_DATA, data: { key } })
    );

    window.nativebridge.resolveGetLocalData = ({ value }) => {
      if (!value) {
        callback(null);
      } else {
        callback(JSON.parse(atob(value)));
      }
    };

    window.nativebridge.rejectGetLocalData = (error) =>
      failedToRespondCallback(error);
  } else {
    console.error("Native bridge is not available");
    failedToRespondCallback(new Error("Native bridge is not available"));
  }
};

// TOTP QR Migration Data
export const totpQrMigrationData = (callback, failedToRespondCallback) => {
  if (window.nativebridge && window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({ topic: TOPIC.TOTP })
    );

    window.nativebridge.resolveTotpQrMigrationData = ({ data }) => {
      if (data) {
        callback(data.replace(" ", "").split(","));
      } else {
        callback([]);
      }
    };

    window.nativebridge.rejectTotpQrMigrationData = (error) =>
      failedToRespondCallback(error);
  } else {
    console.error("Native bridge is not available");
  }
};

/**
 * Retrieve launch data passed when this microapp was opened (OpenSuperApp).
 * Host keeps JSON in navigation state; WebView must request it — it is not on window by default.
 */
export const requestGetLaunchData = (callback, failedToRespondCallback) => {
  if (
    window.nativebridge &&
    typeof window.nativebridge.requestGetLaunchData === "function"
  ) {
    window.nativebridge.resolveGetLaunchData = (data) => {
      try {
        callback(data);
      } catch (e) {
        if (typeof failedToRespondCallback === "function") {
          failedToRespondCallback(String(e));
        }
      }
    };
    window.nativebridge.requestGetLaunchData();
    return;
  }

  if (window.ReactNativeWebView) {
    window.nativebridge = window.nativebridge || {};
    window.nativebridge.resolveGetLaunchData = (data) => {
      try {
        callback(data);
      } catch (e) {
        if (typeof failedToRespondCallback === "function") {
          failedToRespondCallback(String(e));
        }
      }
    };
    window.ReactNativeWebView.postMessage(
      JSON.stringify({ topic: TOPIC.GET_LAUNCH_DATA })
    );
    return;
  }

  if (typeof failedToRespondCallback === "function") {
    failedToRespondCallback("Native bridge is not available");
  } else {
    console.error("Native bridge is not available");
  }
};

/**
 * Ask the host SuperApp to close this microapp's WebView and return to its
 * My Apps screen.
 */
export const requestNavigateToMyApps = () => {
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({ topic: TOPIC.NAVIGATE_TO_MY_APPS })
    );
  } else {
    console.error("Native bridge is not available");
  }
};

/**
 * Request the device's safe-area insets from the host SuperApp.
 * Host invokes `resolveDeviceSafeAreaInsets` with `{ insets: { top, bottom, left, right } }`.
 */
export const requestDeviceSafeAreaInsets = (callback) => {
  if (!window.nativebridge || !window.ReactNativeWebView) {
    console.error("Native bridge is not available");
    if (typeof callback === "function") callback();
    return;
  }

  window.nativebridge.resolveDeviceSafeAreaInsets = (data) => {
    try {
      if (typeof callback === "function") callback(data);
    } catch (e) {
      console.error("Safe area insets callback failed", e);
    }
  };

  window.ReactNativeWebView.postMessage(
    JSON.stringify({ topic: TOPIC.DEVICE_SAFE_AREA_INSETS })
  );
};

// Open another microapp through SuperApp bridge
export const requestOpenMicroApp = (targetAppId, launchData = {}) => {
  if (window.nativebridge?.requestOpenMicroApp) {
    window.nativebridge.requestOpenMicroApp(targetAppId, launchData);
    return;
  }

  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        topic: "open_micro_app",
        data: { appId: targetAppId, data: launchData ?? {} }
      })
    );
    return;
  }

  console.error("Native bridge is not available");
};
