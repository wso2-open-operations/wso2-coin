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

import './TopBar.css';

import React, { useState } from 'react';
import { Modal } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';

import { WALLET } from '../../constants/strings';
import { requestNavigateToMyApps } from '../../microapp-bridge';
import { saveLocalDataAsync } from '../../helpers/storage';
import { SHOP_KEYS, PARKING_KEYS } from '../../helpers/paymentFlow';

const PAGE_TITLES = {
  '/': WALLET,
  '/create-wallet': WALLET,
  '/send': 'Send Coins',
  '/receive': 'Request Coins',
  '/confirm-assets-send': 'Review Transaction',
  '/history': 'History',
  '/profile': 'Profile',
};

// `apps` shows the 9-dot apps-grid icon and opens the leave-app confirmation.
// `back` shows a left arrow and navigates to `target` inside the wallet flow.
const NAV_BY_ROUTE = {
  '/': { mode: 'apps' },
  '/history': { mode: 'apps' },
  '/profile': { mode: 'apps' },
  '/create-wallet': { mode: 'apps' },
  '/wallet-phrase': { mode: 'apps' },
  '/recover-wallet': { mode: 'back', target: '/create-wallet' },
  '/send': { mode: 'back', target: '/' },
  '/receive': { mode: 'back', target: '/' },
  '/confirm-assets-send': { mode: 'back', target: '/send' },
};

const AppsGridIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6 4.5C6 5.32843 5.32843 6 4.5 6C3.67157 6 3 5.32843 3 4.5C3 3.67157 3.67157 3 4.5 3C5.32843 3 6 3.67157 6 4.5ZM6 12C6 12.8284 5.32843 13.5 4.5 13.5C3.67157 13.5 3 12.8284 3 12C3 11.1716 3.67157 10.5 4.5 10.5C5.32843 10.5 6 11.1716 6 12ZM4.5 21C5.32843 21 6 20.3284 6 19.5C6 18.6716 5.32843 18 4.5 18C3.67157 18 3 18.6716 3 19.5C3 20.3284 3.67157 21 4.5 21ZM13.5 12C13.5 12.8284 12.8284 13.5 12 13.5C11.1716 13.5 10.5 12.8284 10.5 12C10.5 11.1716 11.1716 10.5 12 10.5C12.8284 10.5 13.5 11.1716 13.5 12ZM12 6C12.8284 6 13.5 5.32843 13.5 4.5C13.5 3.67157 12.8284 3 12 3C11.1716 3 10.5 3.67157 10.5 4.5C10.5 5.32843 11.1716 6 12 6ZM13.5 19.5C13.5 20.3284 12.8284 21 12 21C11.1716 21 10.5 20.3284 10.5 19.5C10.5 18.6716 11.1716 18 12 18C12.8284 18 13.5 18.6716 13.5 19.5ZM19.5 13.5C20.3284 13.5 21 12.8284 21 12C21 11.1716 20.3284 10.5 19.5 10.5C18.6716 10.5 18 11.1716 18 12C18 12.8284 18.6716 13.5 19.5 13.5ZM21 4.5C21 5.32843 20.3284 6 19.5 6C18.6716 6 18 5.32843 18 4.5C18 3.67157 18.6716 3 19.5 3C20.3284 3 21 3.67157 21 4.5ZM19.5 21C20.3284 21 21 20.3284 21 19.5C21 18.6716 20.3284 18 19.5 18C18.6716 18 18 18.6716 18 19.5C18 20.3284 18.6716 21 19.5 21Z"
    />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M19 12H5M5 12L12 19M5 12L12 5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TopBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);

  const title = PAGE_TITLES[location.pathname] ?? WALLET;

  // Both Parking and Shop checkout flows on /confirm-assets-send have no in-app parent — fall back to
  // the apps-grid leave-dialog so the user always has an escape hatch.
  const baseConfig = NAV_BY_ROUTE[location.pathname] ?? { mode: 'apps' };
  const isPaymentConfirm =
    location.pathname === '/confirm-assets-send' &&
    (!!location.state?.isParkingPaymentFlow || !!location.state?.isShopPaymentFlow);
  const navConfig = isPaymentConfirm ? { mode: 'apps' } : baseConfig;

  const closeLeaveDialog = () => setIsLeaveOpen(false);

  const handleLeftButton = () => {
    if (navConfig.mode === 'back') {
      navigate(navConfig.target);
      return;
    }
    setIsLeaveOpen(true);
  };

  const confirmLeave = async () => {
    setIsLeaveOpen(false);

    // If leaving during a checkout or parking payment confirmation screen,
    // ensure we record the FAILED state so the calling app doesn't get stuck loading.
    if (location.pathname === '/confirm-assets-send') {
      const state = location.state;
      if (state?.isShopPaymentFlow) {
        try {
          await saveLocalDataAsync(SHOP_KEYS.status, "FAILED");
          await saveLocalDataAsync(SHOP_KEYS.error, "User aborted checkout");
          await saveLocalDataAsync(SHOP_KEYS.pending, null);
          await saveLocalDataAsync(SHOP_KEYS.txHash, "");
        } catch (e) {
          console.error("Failed to write aborted status for shop payment", e);
        }
      } else if (state?.isParkingPaymentFlow) {
        try {
          await saveLocalDataAsync(PARKING_KEYS.status, "FAILED");
          await saveLocalDataAsync(PARKING_KEYS.error, "User aborted payment");
          await saveLocalDataAsync(PARKING_KEYS.txHash, "");
        } catch (e) {
          console.error("Failed to write aborted status for parking payment", e);
        }
      }
    }

    requestNavigateToMyApps();
  };

  return (
    <>
      <header className="topbar">
        <button
          type="button"
          className="topbar-back-btn"
          onClick={handleLeftButton}
          aria-label={navConfig.mode === 'back' ? 'Back' : 'Back to My Apps'}
        >
          {navConfig.mode === 'back' ? <ArrowLeftIcon /> : <AppsGridIcon />}
        </button>
        <h1 className="topbar-title">{title}</h1>
      </header>

      <Modal
        open={isLeaveOpen}
        onCancel={closeLeaveDialog}
        footer={null}
        closable={false}
        centered
        title={null}
        className="topbar-leave-modal-wrap"
      >
        <div className="topbar-leave-modal">
          <h2 className="topbar-leave-title">Leave this App?</h2>
          <p className="topbar-leave-text">You&rsquo;ll return to the WSO2 App</p>
          <div className="topbar-leave-actions">
            <button
              type="button"
              className="topbar-leave-cancel"
              onClick={closeLeaveDialog}
            >
              Cancel
            </button>
            <button
              type="button"
              className="topbar-leave-confirm"
              onClick={confirmLeave}
            >
              Leave
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default TopBar;
