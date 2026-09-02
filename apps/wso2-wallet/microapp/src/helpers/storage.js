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

import { saveLocalData, getLocalData } from "../microapp-bridge";

// Single-flight: `resolveGetLocalData` / `resolveSaveLocalData` are single
// host-overwritten slots on `window.nativebridge`. Concurrent callers would
// clobber each other, so we serialize requests through a FIFO queue.

const getQueue = [];
let getInFlight = false;

const drainGetQueue = () => {
  if (getQueue.length === 0) {
    getInFlight = false;
    return;
  }
  getInFlight = true;
  const { key, resolve, reject } = getQueue.shift();
  try {
    getLocalData(
      key,
      (data) => {
        resolve(data);
        drainGetQueue();
      },
      (err) => {
        reject(err);
        drainGetQueue();
      }
    );
  } catch (e) {
    reject(e);
    drainGetQueue();
  }
};

export function getLocalDataAsync(key) {
  return new Promise((resolve, reject) => {
    getQueue.push({ key, resolve, reject });
    if (!getInFlight) drainGetQueue();
  });
}

const saveQueue = [];
let saveInFlight = false;

const drainSaveQueue = () => {
  if (saveQueue.length === 0) {
    saveInFlight = false;
    return;
  }
  saveInFlight = true;
  const { key, value, resolve, reject } = saveQueue.shift();
  try {
    saveLocalData(
      key,
      value,
      () => {
        resolve();
        drainSaveQueue();
      },
      (err) => {
        reject(err);
        drainSaveQueue();
      }
    );
  } catch (e) {
    reject(e);
    drainSaveQueue();
  }
}

export function saveLocalDataAsync(key, value) {
  return new Promise((resolve, reject) => {
    saveQueue.push({ key, value, resolve, reject });
    if (!saveInFlight) drainSaveQueue();
  });
}
