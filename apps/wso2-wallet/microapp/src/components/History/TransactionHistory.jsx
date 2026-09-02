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

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Pagination } from 'antd';
import {
  SearchOutlined,
  CloseOutlined,
  CalendarOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { DateTime } from 'luxon';

import { useTransactionHistory } from '../../hooks/useTransactionHistory';
import TransactionItem from '../shared/TransactionItem';
import { TransactionListSkeleton } from '../shared/TransactionItemSkeleton';
import { groupTransactionsByDate } from '../../utils/transactionUtils';

import { useQueryClient } from '@tanstack/react-query';

const toInputDate = (ms) => (ms ? DateTime.fromMillis(ms).toISODate() : '');
const fromInputStart = (str) =>
  str ? DateTime.fromISO(str).startOf('day').toMillis() : null;
const fromInputEnd = (str) =>
  str ? DateTime.fromISO(str).endOf('day').toMillis() : null;

const formatRangeLabel = (from, to) => {
  if (from == null && to == null) return '';
  const fromDt = from != null ? DateTime.fromMillis(from) : null;
  const toDt = to != null ? DateTime.fromMillis(to) : null;
  const fmt = (dt) =>
    dt.year === DateTime.local().year
      ? dt.toFormat('d LLL')
      : dt.toFormat('d LLL yyyy');
  if (fromDt && toDt) {
    if (fromDt.hasSame(toDt, 'day')) return fmt(fromDt);
    return `${fmt(fromDt)} – ${fmt(toDt)}`;
  }
  if (fromDt) return `From ${fmt(fromDt)}`;
  return `Until ${fmt(toDt)}`;
};

const PRESETS = [
  { key: '7d', label: 'Last 7 days', days: 7 },
  { key: '30d', label: 'Last 30 days', days: 30 },
  { key: 'month', label: 'This month' },
];

function TransactionHistory({ walletAddress }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState('');
  const [draftTo, setDraftTo] = useState('');
  const searchInputRef = useRef(null);
  const datePopoverRef = useRef(null);
  const dateButtonRef = useRef(null);

  const queryClient = useQueryClient();
  const allData = queryClient.getQueryData(['transactions', walletAddress]);
  const allTransactions = allData?.transactions || [];

  const {
    transactions,
    loading,
    error,
    refetch,
    totalCount,
  } = useTransactionHistory({
    walletAddress,
    pageSize: 15,
    filter,
    page,
    dateRange,
  });

  useEffect(() => {
    setPage(1);
  }, [filter, searchTerm, walletAddress, dateRange]);

  useEffect(() => {
    if (!isDatePopoverOpen) return;
    const handleClickOutside = (e) => {
      if (
        datePopoverRef.current &&
        !datePopoverRef.current.contains(e.target) &&
        dateButtonRef.current &&
        !dateButtonRef.current.contains(e.target)
      ) {
        setIsDatePopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isDatePopoverOpen]);

  const filteredTransactions = useMemo(() => {
    if (!searchTerm) return transactions;
    return transactions.filter((transaction) => {
      const currentWallet = walletAddress?.toLowerCase();
      const fromAddress = transaction.from.toLowerCase();
      const toAddress = transaction.to.toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      let otherPartyAddress = '';
      if (fromAddress === currentWallet) {
        otherPartyAddress = toAddress;
      } else if (toAddress === currentWallet) {
        otherPartyAddress = fromAddress;
      } else {
        return (
          fromAddress.includes(searchLower) || toAddress.includes(searchLower)
        );
      }
      return otherPartyAddress.includes(searchLower);
    });
  }, [transactions, searchTerm, walletAddress]);

  const groupedTransactions = useMemo(
    () => groupTransactionsByDate(filteredTransactions),
    [filteredTransactions],
  );

  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    searchInputRef.current?.focus();
  }, []);

  const openDatePopover = () => {
    setDraftFrom(toInputDate(dateRange.from));
    setDraftTo(toInputDate(dateRange.to));
    setIsDatePopoverOpen((prev) => !prev);
  };

  const applyDateRange = () => {
    const from = fromInputStart(draftFrom);
    const to = fromInputEnd(draftTo);
    if (from != null && to != null && from > to) {
      setDateRange({ from: to, to: from });
    } else {
      setDateRange({ from, to });
    }
    setIsDatePopoverOpen(false);
  };

  const clearDateRange = () => {
    setDateRange({ from: null, to: null });
    setDraftFrom('');
    setDraftTo('');
    setIsDatePopoverOpen(false);
  };

  const applyPreset = (preset) => {
    const now = DateTime.local();
    let from;
    let to = now.endOf('day').toMillis();
    if (preset.key === 'month') {
      from = now.startOf('month').toMillis();
    } else {
      from = now.minus({ days: preset.days - 1 }).startOf('day').toMillis();
    }
    setDateRange({ from, to });
    setDraftFrom(toInputDate(from));
    setDraftTo(toInputDate(to));
    setIsDatePopoverOpen(false);
  };

  const isDateFilterActive = dateRange.from != null || dateRange.to != null;

  const sentCount = allTransactions.filter((tx) => tx.direction === 'send')
    .length;
  const receivedCount = allTransactions.filter(
    (tx) => tx.direction === 'receive',
  ).length;
  const allCount = allTransactions.length;

  const filters = [
    { key: 'all', label: 'All', count: allCount },
    { key: 'sent', label: 'Sent', count: sentCount },
    { key: 'received', label: 'Received', count: receivedCount },
  ];

  function TransactionList() {
    if (error) {
      return (
        <div className="history-empty">
          <p className="history-empty-text history-empty-text-danger">
            Error loading transactions.
          </p>
          <button
            className="history-empty-action"
            onClick={() => refetch()}
          >
            Retry
          </button>
        </div>
      );
    }
    if (filteredTransactions.length > 0) {
      return (
        <>
          {groupedTransactions.map((group) => (
            <div key={group.key} className="transaction-date-group">
              <div className="transaction-date-heading">{group.label}</div>
              {group.transactions.map((transaction, index) => (
                <TransactionItem
                  key={`${transaction.txHash}-${index}`}
                  transaction={transaction}
                  index={index}
                />
              ))}
            </div>
          ))}
          {searchTerm && (
            <div className="history-filtered-note">
              Showing {filteredTransactions.length} of {transactions.length}{' '}
              filtered transactions
            </div>
          )}
        </>
      );
    }
    if (searchTerm || isDateFilterActive) {
      return (
        <div className="history-empty">
          <p className="history-empty-text">
            No transactions match your filters
          </p>
          <button
            className="history-empty-action"
            onClick={() => {
              setSearchTerm('');
              clearDateRange();
            }}
          >
            Clear Filters
          </button>
        </div>
      );
    }
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <InboxOutlined />
        </div>
        <div className="empty-state-title">No transactions yet</div>
        <div className="empty-state-subtitle">
          Your sent and received O2C will appear here.
        </div>
      </div>
    );
  }

  return (
    <div className="transaction-history-widget">
      <div className="transaction-history-widget-inner">
        <div className="history-header">
          <div className="history-filter-pills">
            {filters.map(({ key, label, count }) => {
              const isActive = filter === key;
              return (
                <button
                  key={key}
                  type="button"
                  className={`history-pill ${isActive ? 'is-active' : ''}`}
                  onClick={() => setFilter(key)}
                >
                  <span>{label}</span>
                  <span className="history-pill-count">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="history-search-row">
            <div className="history-search-box">
              <SearchOutlined className="history-search-icon" />
              <input
                ref={searchInputRef}
                className="history-search-input"
                placeholder="Search by wallet address..."
                value={searchTerm}
                onChange={handleSearchChange}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="history-search-clear"
                  onClick={handleClearSearch}
                  aria-label="Clear search"
                >
                  <CloseOutlined />
                </button>
              )}
            </div>

            <div className="history-date-filter-wrap">
              <button
                ref={dateButtonRef}
                type="button"
                className={`history-date-button ${
                  isDateFilterActive ? 'is-active' : ''
                }`}
                onClick={openDatePopover}
                aria-label="Filter by date"
              >
                <CalendarOutlined />
              </button>

              {isDatePopoverOpen && (
                <div
                  ref={datePopoverRef}
                  className="history-date-popover"
                  role="dialog"
                  aria-label="Date filter"
                >
                  <div className="history-date-popover-title">
                    Filter by date
                  </div>

                  <div className="history-date-presets">
                    {PRESETS.map((preset) => (
                      <button
                        key={preset.key}
                        type="button"
                        className="history-date-preset"
                        onClick={() => applyPreset(preset)}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="history-date-fields">
                    <label className="history-date-field">
                      <span className="history-date-label">From</span>
                      <input
                        type="date"
                        className="history-date-input"
                        value={draftFrom}
                        max={draftTo || undefined}
                        onChange={(e) => setDraftFrom(e.target.value)}
                      />
                    </label>
                    <label className="history-date-field">
                      <span className="history-date-label">To</span>
                      <input
                        type="date"
                        className="history-date-input"
                        value={draftTo}
                        min={draftFrom || undefined}
                        onChange={(e) => setDraftTo(e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="history-date-actions">
                    <button
                      type="button"
                      className="history-date-action ghost"
                      onClick={clearDateRange}
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      className="history-date-action primary"
                      onClick={applyDateRange}
                      disabled={!draftFrom && !draftTo}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {isDateFilterActive && (
            <div className="history-active-filter-row">
              <span className="history-active-filter-chip">
                <CalendarOutlined className="history-active-filter-icon" />
                {formatRangeLabel(dateRange.from, dateRange.to)}
                <button
                  type="button"
                  className="history-active-filter-clear"
                  onClick={clearDateRange}
                  aria-label="Clear date filter"
                >
                  <CloseOutlined />
                </button>
              </span>
            </div>
          )}
        </div>

        {loading && transactions.length === 0 ? (
          <div className="transaction-history-container">
            <TransactionListSkeleton count={6} />
          </div>
        ) : (
          <>
            <div className="transaction-history-container">
              <TransactionList />
            </div>
            <div className="history-pagination-wrap">
              <Pagination
                current={page}
                pageSize={15}
                total={totalCount}
                onChange={setPage}
                showSizeChanger={false}
                hideOnSinglePage
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default TransactionHistory;
