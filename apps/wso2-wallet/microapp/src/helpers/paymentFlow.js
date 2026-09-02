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

import { isAddress } from "ethereum-address";
import { requestGetLaunchData } from "../microapp-bridge";

export const SHOP_KEYS = {
  status: "shop_payment_status",
  txHash: "shop_payment_tx_hash",
  error: "shop_payment_error",
  pending: "shop_checkout_pending"
};

export const PARKING_KEYS = {
  status: "people_parking_payment_status",
  txHash: "people_parking_payment_tx_hash",
  error: "people_parking_payment_error"
};

const PARKING_APP_ID = "com.wso2.superapp.microapp.people";
const SHOP_APP_ID = "com.wso2.superapp.microapp.conference";

const LAUNCH_DATA_CONSUMED_FLAG = "__paymentLaunchDataConsumed";
const CANONICAL_POSITIVE_DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

const HYDRATE_ATTEMPT_TIMEOUT_MS = 2800;
const HYDRATE_RETRY_DELAY_MS = 500;
const HYDRATE_MAX_ATTEMPTS = 3;

let hydrateInFlight = null;

const hasPayloadInMicroappLaunchWindow = () =>
  Object.keys(window.__MICROAPP_LAUNCH_DATA__ || {}).length > 0;

const mergeLaunchPayloadIntoWindow = (raw) => {
  const merged = unwrapLaunchPayload(raw);
  if (!isObjectRecord(merged)) return;
  window.__MICROAPP_LAUNCH_DATA__ = {
    ...(window.__MICROAPP_LAUNCH_DATA__ || {}),
    ...merged,
  };
};

const singleHydrateAttempt = () =>
  new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    try {
      requestGetLaunchData(
        (data) => {
          mergeLaunchPayloadIntoWindow(data);
          finish();
        },
        () => finish(),
      );
    } catch {
      finish();
    }

    setTimeout(finish, HYDRATE_ATTEMPT_TIMEOUT_MS);
  });

/**
 * Fetch launch data from the native bridge into window.__MICROAPP_LAUNCH_DATA__.
 */
export const hydrateLaunchDataFromBridge = async () => {
  if (typeof window === "undefined") return;
  if (hasPayloadInMicroappLaunchWindow()) return;
  if (hydrateInFlight) return hydrateInFlight;

  hydrateInFlight = (async () => {
    try {
      for (let attempt = 0; attempt < HYDRATE_MAX_ATTEMPTS; attempt++) {
        await singleHydrateAttempt();
        if (hasPayloadInMicroappLaunchWindow()) return;
        if (attempt < HYDRATE_MAX_ATTEMPTS - 1) {
          await new Promise((r) => setTimeout(r, HYDRATE_RETRY_DELAY_MS));
        }
      }
    } finally {
      hydrateInFlight = null;
    }
  })();

  return hydrateInFlight;
};

const parseHashQuery = () => {
  const hash = window.location?.hash || "";
  const queryIndex = hash.indexOf("?");
  if (queryIndex === -1) {
    return {};
  }
  const params = new URLSearchParams(hash.slice(queryIndex + 1));
  return Object.fromEntries(params.entries());
};

const parseSearchQuery = () => {
  const params = new URLSearchParams(window.location?.search || "");
  return Object.fromEntries(params.entries());
};

const safeParseJson = (value) => {
  if (typeof value !== "string") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const isObjectRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const unwrapLaunchPayload = (value) => {
  const parsed = safeParseJson(value);
  if (!isObjectRecord(parsed)) {
    return null;
  }

  const directPayload = parsed.launchData;
  if (isObjectRecord(directPayload)) {
    return directPayload;
  }

  const nestedData = parsed.data;
  if (isObjectRecord(nestedData)) {
    if (isObjectRecord(nestedData.launchData)) {
      return nestedData.launchData;
    }
    return nestedData;
  }

  return parsed;
};

const peekWindowLaunchData = () => {
  const candidates = [
    { owner: window?.nativebridge, key: "launchData" },
    { owner: window, key: "__MICROAPP_LAUNCH_DATA__" },
    { owner: window, key: "microappLaunchData" },
    { owner: window, key: "launchData" }
  ];

  for (const candidateRef of candidates) {
    const candidate = unwrapLaunchPayload(candidateRef?.owner?.[candidateRef?.key]);
    if (!candidate) {
      continue;
    }
    if (candidate[LAUNCH_DATA_CONSUMED_FLAG]) {
      continue;
    }
    return { ...candidate };
  }

  return {};
};

const getWindowLaunchData = () => {
  const candidates = [
    { owner: window?.nativebridge, key: "launchData" },
    { owner: window, key: "__MICROAPP_LAUNCH_DATA__" },
    { owner: window, key: "microappLaunchData" },
    { owner: window, key: "launchData" }
  ];

  for (const candidateRef of candidates) {
    const candidate = unwrapLaunchPayload(candidateRef?.owner?.[candidateRef?.key]);
    if (!candidate) {
      continue;
    }
    if (candidate[LAUNCH_DATA_CONSUMED_FLAG]) {
      continue;
    }

    const payload = { ...candidate };
    candidate[LAUNCH_DATA_CONSUMED_FLAG] = true;

    try {
      delete candidateRef.owner[candidateRef.key];
    } catch (error) {
      // Best effort cleanup for immutable/native-injected objects.
    }

    return payload;
  }

  return {};
};

const normalizeLaunchData = (launchData = {}) => {
  return {
    wallet_address: launchData.wallet_address || launchData.walletAddress || "",
    coin_amount: launchData.coin_amount || launchData.coinAmount || "",
    source_app_id: launchData.source_app_id || launchData.sourceAppId || "",
    return_app_id: launchData.return_app_id || launchData.returnAppId || "",
    return_route: launchData.return_route || launchData.returnRoute || ""
  };
};

const validatePaymentLaunch = (normalized) => {
  const amountString = String(normalized.coin_amount).trim();
  const validAmountFormat = CANONICAL_POSITIVE_DECIMAL_PATTERN.test(amountString);
  const parsedAmount = Number(amountString);
  const validAmount =
    validAmountFormat && Number.isFinite(parsedAmount) && parsedAmount > 0;
  const validWallet =
    typeof normalized.wallet_address === "string" &&
    isAddress(normalized.wallet_address);

  if (!validAmount || !validWallet) {
    return null;
  }

  const sourceAppId = String(normalized.source_app_id || "").trim();
  const returnAppId = String(normalized.return_app_id || "").trim();

  // Reject when both sourceAppId and returnAppId are empty
  if (sourceAppId.length === 0 && returnAppId.length === 0) {
    return null;
  }

  // 1. Try Parking payment flow validation
  const isParkingSource = sourceAppId.length === 0 || sourceAppId === PARKING_APP_ID;
  const isParkingReturn = returnAppId.length === 0 || returnAppId === PARKING_APP_ID;
  if (isParkingSource && isParkingReturn) {
    return {
      flow: "PARKING",
      walletAddress: normalized.wallet_address,
      amount: amountString,
      returnAppId: returnAppId || sourceAppId || PARKING_APP_ID,
      returnRoute: normalized.return_route || ""
    };
  }

  // 2. Try Shop checkout flow validation
  const isShopSource = sourceAppId.length === 0 || sourceAppId === SHOP_APP_ID;
  const isShopReturn = returnAppId.length === 0 || returnAppId === SHOP_APP_ID;
  const hasExplicitShopId = sourceAppId === SHOP_APP_ID || returnAppId === SHOP_APP_ID;
  if (isShopSource && isShopReturn && hasExplicitShopId) {
    return {
      flow: "SHOP",
      walletAddress: normalized.wallet_address,
      amount: amountString,
      returnAppId: returnAppId || sourceAppId || SHOP_APP_ID,
      returnRoute: normalized.return_route || ""
    };
  }

  return null;
};

export const peekPaymentLaunchData = () => {
  const launchData = {
    ...parseSearchQuery(),
    ...parseHashQuery(),
    ...peekWindowLaunchData()
  };
  return validatePaymentLaunch(normalizeLaunchData(launchData));
};

export const getPaymentLaunchData = () => {
  const launchData = {
    ...parseSearchQuery(),
    ...parseHashQuery(),
    ...getWindowLaunchData()
  };
  return validatePaymentLaunch(normalizeLaunchData(launchData));
};

export const isPaymentFlow = () => Boolean(peekPaymentLaunchData());

export const completePayment = async ({
  flow,
  status,
  txHash = "",
  error = "",
  saveLocalDataAsync,
  requestOpenMicroApp,
  returnAppId,
  returnRoute
}) => {
  if (flow === "SHOP") {
    await saveLocalDataAsync(SHOP_KEYS.status, status);
    await saveLocalDataAsync(SHOP_KEYS.txHash, txHash);
    await saveLocalDataAsync(SHOP_KEYS.error, error);
  } else {
    // Default to PARKING flow keys
    await saveLocalDataAsync(PARKING_KEYS.status, status);
    await saveLocalDataAsync(PARKING_KEYS.txHash, txHash);
    await saveLocalDataAsync(PARKING_KEYS.error, error);
  }

  if (typeof requestOpenMicroApp === "function") {
    requestOpenMicroApp(returnAppId || (flow === "SHOP" ? SHOP_APP_ID : PARKING_APP_ID), {
      initialRoute: returnRoute || undefined
    });
  }
};
