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

import React from 'react';

const TransactionItemSkeleton = () => (
  <div className="transaction-item-skeleton" aria-hidden="true">
    <div className="skeleton-block skeleton-icon" />
    <div className="skeleton-main">
      <div className="skeleton-block skeleton-line skeleton-line-title" />
      <div className="skeleton-block skeleton-line skeleton-line-sub" />
    </div>
    <div className="skeleton-block skeleton-amount" />
  </div>
);

export const TransactionListSkeleton = ({ count = 5 }) => (
  <div className="transaction-list-skeleton" role="status" aria-label="Loading transactions">
    {Array.from({ length: count }).map((_, i) => (
      <TransactionItemSkeleton key={i} />
    ))}
  </div>
);

export default TransactionItemSkeleton;
