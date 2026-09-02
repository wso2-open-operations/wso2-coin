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

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getTransactionHistory, MAX_TRANSFER_PAGE } from '../services/wallet.service';

export function useTransactionHistory({
  walletAddress,
  pageSize = 20,
  filter = 'all',
  page = 1,
  dateRange = null,
}) {
  const queryClient = useQueryClient();
  const {
    data,
    error,
    isFetching,
    refetch,
    status
  } = useQuery({
    queryKey: ['transactions', walletAddress],
    queryFn: async () => {
      if (!walletAddress || walletAddress === '0x' || walletAddress.length !== 42) {
        return { transactions: [], totalCount: 0 };
      }
      const result = await getTransactionHistory(walletAddress, 0, 'latest', MAX_TRANSFER_PAGE, 0); // fetch most recent page; client-side filter/paginate below
      return { ...result, totalCount: result.transactions.length };
    },
    enabled: !!walletAddress && walletAddress !== '0x' && walletAddress.length === 42,
    staleTime: 1000 * 60, // Data is considered fresh for 1 minute
    cacheTime: 1000 * 60 * 5, // Unused data stays in cache for 5 minutes before garbage collection
  });

  const allTransactions = data?.transactions || [];
  let filtered = allTransactions;
  if (filter !== 'all') {
    const direction = filter === 'sent' ? 'send' : 'receive';
    filtered = filtered.filter(tx => tx.direction === direction);
  }
  if (dateRange && (dateRange.from != null || dateRange.to != null)) {
    const fromMs = dateRange.from ?? -Infinity;
    const toMs = dateRange.to ?? Infinity;
    filtered = filtered.filter((tx) => {
      const ts = tx.blockTimestamp;
      if (typeof ts !== 'number' || !Number.isFinite(ts)) return false;
      return ts >= fromMs && ts <= toMs;
    });
  }
  const totalCount = filtered.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedTransactions = filtered.slice((page - 1) * pageSize, page * pageSize);

  const refresh = () => {
    queryClient.removeQueries({ queryKey: ['transactions', walletAddress] });
    refetch();
  };

  return {
    transactions: paginatedTransactions,
    loading: isFetching,
    error,
    refetch,
    refresh,
    totalCount,
    totalPages,
    page,
    pageSize,
    status
  };
}
