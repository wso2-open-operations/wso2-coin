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

import { message } from 'antd';
import { DateTime } from 'luxon';

export const formatWalletAddress = (address) => {
  if (!address) return '';
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
};

export const copyTextToClipboard = async (text, label = 'Value') => {
  const successMsg = `${label} copied to clipboard!`;
  try {
    await navigator.clipboard.writeText(text);
    message.success(successMsg);
  } catch (err) {
    // Fallback for older browsers / WebViews without clipboard API.
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    message.success(successMsg);
  }
};

export const formatTimestamp = (timestamp) => {
  return new Date(timestamp).toLocaleString();
};

const getDateLabel = (dateTime, today) => {
  const startOfDay = dateTime.startOf('day');
  const diffDays = Math.round(today.diff(startOfDay, 'days').days);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (startOfDay.year === today.year) {
    return startOfDay.toFormat('d LLLL');
  }
  return startOfDay.toFormat('d LLLL yyyy');
};

export const groupTransactionsByDate = (transactions) => {
  if (!transactions || transactions.length === 0) return [];
  const today = DateTime.local().startOf('day');
  const groups = [];
  const indexByKey = new Map();

  transactions.forEach((tx) => {
    const ts = tx.blockTimestamp;
    let key = 'unknown';
    let label = 'Unknown date';
    if (typeof ts === 'number' && Number.isFinite(ts)) {
      const dt = DateTime.fromMillis(ts).startOf('day');
      key = dt.toISODate();
      label = getDateLabel(dt, today);
    }
    if (!indexByKey.has(key)) {
      indexByKey.set(key, groups.length);
      groups.push({ key, label, transactions: [] });
    }
    groups[indexByKey.get(key)].transactions.push(tx);
  });

  return groups;
};
