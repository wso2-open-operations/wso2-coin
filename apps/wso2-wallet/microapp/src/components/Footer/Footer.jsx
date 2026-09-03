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

import './Footer.css';

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import {
  HistoryOutlined,
  UserOutlined,
  WalletOutlined,
} from '@ant-design/icons';

import {
  HISTORY,
  PROFILE,
  WALLET,
} from '../../constants/strings';

const WALLET_FLOW_PATHS = new Set([
  '/',
  '/send',
  '/receive',
  '/confirm-assets-send',
]);

const NAV_ITEMS = [
  {
    path: '/',
    label: WALLET,
    Icon: WalletOutlined,
    isActive: (pathname) => WALLET_FLOW_PATHS.has(pathname),
  },
  {
    path: '/history',
    label: HISTORY,
    Icon: HistoryOutlined,
    isActive: (pathname) => pathname === '/history',
  },
  {
    path: '/profile',
    label: PROFILE,
    Icon: UserOutlined,
    isActive: (pathname) => pathname === '/profile',
  },
];

const FooterBar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="footer-nav" role="navigation" aria-label="Primary">
      {NAV_ITEMS.map(({ path, label, Icon, isActive: matchActive }) => {
        const isActive = matchActive(location.pathname);
        return (
          <button
            key={path}
            type="button"
            className={`footer-nav-item ${isActive ? 'is-active' : ''}`}
            onClick={() => navigate(path)}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="footer-nav-icon">
              <Icon style={{ fontSize: 22 }} />
            </span>
            <span className="footer-nav-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default FooterBar;
