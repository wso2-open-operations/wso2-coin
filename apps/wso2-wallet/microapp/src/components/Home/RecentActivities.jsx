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

import {
  useEffect,
  useState,
  useRef,
  useCallback,
  memo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  InboxOutlined,
  LoadingOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

import { STORAGE_KEYS } from '../../constants/configs';
import {
  RECENT_ACTIVITIES,
  VIEW_ALL,
} from '../../constants/strings';
import { getLocalDataAsync } from '../../helpers/storage';
import { useTransactionHistory } from '../../hooks/useTransactionHistory';
import TransactionItem from '../shared/TransactionItem';
import { TransactionListSkeleton } from '../shared/TransactionItemSkeleton';
import { COLORS } from '../../constants/colors';
import { groupTransactionsByDate } from '../../utils/transactionUtils';

const RECENT_PREVIEW_SIZE = 5;
const PULL_THRESHOLD_PX = 70;
const PULL_MAX_PX = 110;
const PULL_DAMPENING = 0.5;

const RecentActivities = forwardRef(
  ({ walletAddress: propWalletAddress, onPullRefresh }, ref) => {
    const navigate = useNavigate();
    const [walletAddress, setWalletAddress] = useState(propWalletAddress || '');

    useEffect(() => {
      if (propWalletAddress) {
        setWalletAddress(propWalletAddress);
      } else {
        const fetchWalletAddress = async () => {
          try {
            const address = await getLocalDataAsync(STORAGE_KEYS.WALLET_ADDRESS);
            setWalletAddress(address || '');
          } catch (error) {
            console.error('RecentActivities: Error fetching wallet address:', error);
          }
        };
        fetchWalletAddress();
      }
    }, [propWalletAddress]);

    const { transactions, loading, refresh, totalCount } = useTransactionHistory({
      walletAddress,
      pageSize: RECENT_PREVIEW_SIZE,
      page: 1,
    });

    useImperativeHandle(
      ref,
      () => ({
        refreshTransactions: () => {
          refresh();
        },
      }),
      [refresh],
    );

    // Pull-to-refresh
    const containerRef = useRef(null);
    const pullStartY = useRef(null);
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const triggerRefresh = useCallback(async () => {
      setIsRefreshing(true);
      try {
        await Promise.all([
          Promise.resolve(refresh()),
          onPullRefresh ? Promise.resolve(onPullRefresh()) : Promise.resolve(),
        ]);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        pullStartY.current = null;
      }
    }, [refresh, onPullRefresh]);

    const handleTouchStart = (e) => {
      if (!containerRef.current) return;
      if (containerRef.current.scrollTop > 0) return;
      pullStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      if (pullStartY.current === null) return;
      if (!containerRef.current || containerRef.current.scrollTop > 0) {
        setPullDistance(0);
        return;
      }
      const delta = e.touches[0].clientY - pullStartY.current;
      if (delta <= 0) {
        setPullDistance(0);
        return;
      }
      setPullDistance(Math.min(delta * PULL_DAMPENING, PULL_MAX_PX));
    };

    const handleTouchEnd = () => {
      if (isRefreshing) return;
      if (pullDistance >= PULL_THRESHOLD_PX) {
        triggerRefresh();
        return;
      }
      setPullDistance(0);
      pullStartY.current = null;
    };

    const indicatorHeight = isRefreshing
      ? PULL_THRESHOLD_PX
      : Math.round(pullDistance);
    const indicatorOpacity = isRefreshing
      ? 1
      : Math.min(pullDistance / PULL_THRESHOLD_PX, 1);
    const indicatorRotation = isRefreshing
      ? 0
      : Math.min((pullDistance / PULL_THRESHOLD_PX) * 180, 180);

    function TransactionList({ transactions }) {
      if (transactions.length > 0) {
        const groups = groupTransactionsByDate(transactions);
        return (
          <>
            {groups.map((group) => (
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
          </>
        );
      }
      return (
        <div className="empty-state empty-state-compact">
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
      <div className="recent-activities-widget">
        <div className="recent-activities-widget-inner">
          <div className="mt-1">
            <div className="d-flex justify-content-between align-items-center">
              <div className="sub-heading">
                <h4>{RECENT_ACTIVITIES}</h4>
              </div>
              {totalCount > RECENT_PREVIEW_SIZE && (
                <span
                  className="recent-activities-view-all"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate('/history')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      navigate('/history');
                    }
                  }}
                  style={{
                    color: COLORS.ORANGE_PRIMARY,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {VIEW_ALL}
                  <RightOutlined style={{ fontSize: 12 }} />
                </span>
              )}
            </div>
          </div>

          {loading && transactions.length === 0 && !isRefreshing ? (
            <div className="recent-activity-container">
              <TransactionListSkeleton count={5} />
            </div>
          ) : (
            <div
              ref={containerRef}
              className="recent-activity-container"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            >
              <div
                className="pull-indicator"
                style={{
                  height: `${indicatorHeight}px`,
                  opacity: indicatorOpacity,
                }}
                aria-hidden="true"
              >
                {isRefreshing ? (
                  <LoadingOutlined
                    spin
                    style={{ fontSize: 22, color: COLORS.ORANGE_PRIMARY }}
                  />
                ) : (
                  <LoadingOutlined
                    style={{
                      fontSize: 22,
                      color: COLORS.ORANGE_PRIMARY,
                      transform: `rotate(${indicatorRotation}deg)`,
                      transition: pullStartY.current === null ? 'transform 0.2s ease' : undefined,
                    }}
                  />
                )}
              </div>
              <TransactionList transactions={transactions} />
            </div>
          )}
        </div>
      </div>
    );
  },
);

RecentActivities.displayName = 'RecentActivities';

export default memo(RecentActivities);
