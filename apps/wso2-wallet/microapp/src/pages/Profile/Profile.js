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

import './Profile.css';

import {
  useEffect,
  useState,
} from 'react';

import {
  Modal,
} from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { CopyToClipboard } from 'react-copy-to-clipboard';

import {
  CheckOutlined,
  CopyOutlined,
  DownOutlined,
  LoadingOutlined,
  PlusOutlined,
  QrcodeOutlined,
  RightOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { QRCodeSVG } from 'qrcode.react';

import { STORAGE_KEYS } from '../../constants/configs';
import {
  ERROR,
  ERROR_READING_WALLET_DETAILS,
  ERROR_CREATING_WALLET,
  CREATE_A_NEW_WALLET,
  SUCCESS,
  SUCCESS_WALLET_CREATED,
  OK,
  SHOW_WALLET_ADDRESS,
  WALLET_ADDRESS_COPIED,
} from '../../constants/strings';
import { showToast, showAlertBox } from '../../helpers/alerts';
import {
  getLocalDataAsync,
  saveLocalDataAsync,
} from '../../helpers/storage';
import { setWalletAsPrimary, createWallet } from '../../services/wallet.service';
import { useUserWallets } from '../../services/query-hooks';

const formatWalletAddress = (addr) => {
  if (!addr) return '';
  if (addr.length <= 24) return addr;
  return `${addr.slice(0, 12)}...${addr.slice(-10)}`;
};

function Profile() {
  const queryClient = useQueryClient();

  const [walletAddress, setWalletAddress] = useState('');

  const {
    data: userWallets = [],
    isLoading: isLoadingWallets,
    isError: isUserWalletsError,
  } = useUserWallets(walletAddress);

  const [selectedWallet, setSelectedWallet] = useState(null);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isSettingPrimary, setIsSettingPrimary] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isWalletsExpanded, setIsWalletsExpanded] = useState(false);

  const [isAddressCopied, setIsAddressCopied] = useState(false);

  const fetchWalletDetails = async () => {
    try {
      const walletAddressResponse = await getLocalDataAsync(STORAGE_KEYS.WALLET_ADDRESS);
      setWalletAddress(walletAddressResponse);
    } catch (error) {
      console.log(`${ERROR_READING_WALLET_DETAILS} - ${error}`);
    }
  };

  useEffect(() => {
    fetchWalletDetails();
  }, []);

  useEffect(() => {
    if (isUserWalletsError) {
      showAlertBox(ERROR, ERROR_READING_WALLET_DETAILS, OK);
    }
  }, [isUserWalletsError]);

  const handleCopyAddress = () => {
    showToast(SUCCESS, WALLET_ADDRESS_COPIED);
    setIsAddressCopied(true);
    setTimeout(() => setIsAddressCopied(false), 2000);
  };

  const handleSetAsPrimary = async () => {
    if (!selectedWallet || selectedWallet.defaultWallet) return;

    setIsSettingPrimary(true);
    try {
      await setWalletAsPrimary(selectedWallet.walletAddress);
      await saveLocalDataAsync(STORAGE_KEYS.WALLET_ADDRESS, selectedWallet.walletAddress);
      setWalletAddress(selectedWallet.walletAddress);
      showToast(SUCCESS, 'Primary wallet updated');
      await queryClient.invalidateQueries({ queryKey: ['userWallets'] });
      setIsWalletModalOpen(false);
      setSelectedWallet(null);
    } catch (error) {
      console.error('Error setting wallet as primary:', error);
      showAlertBox(ERROR, "Couldn't set as primary wallet", OK);
    } finally {
      setIsSettingPrimary(false);
    }
  };

  const createNewWallet = async () => {
    setIsCreating(true);
    try {
      await createWallet();
      showToast(SUCCESS, SUCCESS_WALLET_CREATED);
      await queryClient.invalidateQueries({ queryKey: ['userWallets'] });
    } catch (error) {
      console.error('Error creating wallet:', error);
      showAlertBox(ERROR, ERROR_CREATING_WALLET, OK);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateWallet = () => {
    Modal.confirm({
      title: CREATE_A_NEW_WALLET,
      content: 'Are you sure you want to create a new wallet?',
      okText: 'Create',
      cancelText: 'Cancel',
      onOk: createNewWallet,
    });
  };

  return (
    <div className="profile-page">
      {/* Wallet Details Modal */}
      <Modal
        open={isWalletModalOpen}
        onCancel={() => setIsWalletModalOpen(false)}
        footer={null}
        title="Wallet Details"
        centered
      >
        {selectedWallet && (() => {
          const isActive =
            walletAddress &&
            selectedWallet.walletAddress &&
            selectedWallet.walletAddress.toLowerCase() ===
              walletAddress.toLowerCase();
          const isPrimary = selectedWallet.defaultWallet;
          const showTagRow = isActive || isPrimary;
          return (
            <div className="profile-modal">
              <div className="profile-modal-address">
                {selectedWallet.walletAddress}
              </div>
              <div className="profile-modal-meta">
                Created on{' '}
                {new Date(selectedWallet.createdOn).toLocaleString()}
              </div>

              {showTagRow && (
                <div className="profile-modal-tag-row">
                  {isPrimary && (
                    <span className="profile-primary-tag">Default</span>
                  )}
                  {isActive && (
                    <span className="profile-active-tag">Active</span>
                  )}
                </div>
              )}

              {isPrimary && (
                <div className="profile-modal-explainer is-primary">
                  <div className="profile-modal-explainer-title">
                    Default Wallet
                  </div>
                  <div className="profile-modal-explainer-text">
                    This is your default wallet. Coin rewards will be received
                    to this wallet. To change it, tap another wallet and set it
                    as default.
                  </div>
                </div>
              )}

              {isActive && (
                <div className="profile-modal-explainer is-active">
                  <div className="profile-modal-explainer-title">
                    Active Wallet
                  </div>
                  <div className="profile-modal-explainer-text">
                    This is the wallet you are currently using. Balance and
                    transactions are shown for this wallet. Set another wallet
                    as default to switch.
                  </div>
                </div>
              )}

              {!isPrimary && !isActive && (
                <div className="profile-modal-explainer">
                  <div className="profile-modal-explainer-title">
                    Not your default wallet
                  </div>
                  <div className="profile-modal-explainer-text">
                    Set this wallet as default to receive your coin rewards
                    here.
                  </div>
                </div>
              )}

              {!isPrimary && (
                <button
                  type="button"
                  className="profile-modal-primary-btn"
                  onClick={handleSetAsPrimary}
                  disabled={isSettingPrimary}
                >
                  {isSettingPrimary ? (
                    <LoadingOutlined style={{ fontSize: 14 }} spin />
                  ) : (
                    <CheckOutlined style={{ fontSize: 14 }} />
                  )}
                  <span>
                    {isSettingPrimary ? 'Updating…' : 'Make this my default'}
                  </span>
                </button>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* QR Code Modal */}
      <Modal
        open={isQrModalOpen}
        onCancel={() => setIsQrModalOpen(false)}
        footer={null}
        title="Wallet QR Code"
        centered
      >
        <div className="profile-qr-modal">
          <div className="profile-qr-subtitle">Share this QR code to receive coins</div>
          <div className="profile-qr-canvas">
            <QRCodeSVG
              value={JSON.stringify({ wallet_address: walletAddress })}
              size={200}
              level="M"
            />
          </div>
          <CopyToClipboard text={walletAddress} onCopy={handleCopyAddress}>
            <button className="profile-qr-address" type="button">
              <span className="profile-qr-address-text">{walletAddress}</span>
              {isAddressCopied ? <CheckOutlined /> : <CopyOutlined />}
            </button>
          </CopyToClipboard>
        </div>
      </Modal>

      <div className="profile-section">
        <div className="profile-group-label">Wallet</div>
        <div className="profile-card">
          <button
            type="button"
            className="profile-btn"
            onClick={() => setIsQrModalOpen(true)}
          >
            <span className="profile-btn-icon neutral">
              <QrcodeOutlined style={{ fontSize: 18, color: '#1C1917' }} />
            </span>
            <span className="profile-btn-text">
              <span className="profile-btn-label">{SHOW_WALLET_ADDRESS}</span>
              <span className="profile-btn-sub">View your public QR code</span>
            </span>
            <RightOutlined className="profile-btn-chevron" />
          </button>

          <button
            type="button"
            className="profile-btn"
            onClick={handleCreateWallet}
            disabled={isCreating}
          >
            <span className="profile-btn-icon neutral">
              {isCreating ? (
                <LoadingOutlined style={{ fontSize: 18, color: '#1C1917' }} spin />
              ) : (
                <PlusOutlined style={{ fontSize: 18, color: '#1C1917' }} />
              )}
            </span>
            <span className="profile-btn-text">
              <span className="profile-btn-label">{CREATE_A_NEW_WALLET}</span>
              <span className="profile-btn-sub">Add another wallet to your account</span>
            </span>
            <RightOutlined className="profile-btn-chevron" />
          </button>
        </div>

        <div className="profile-group-label">My Wallets</div>
        {(() => {
          const isActiveWallet = (w) =>
            walletAddress &&
            w.walletAddress &&
            w.walletAddress.toLowerCase() === walletAddress.toLowerCase();
          const activeWallet = userWallets.find(isActiveWallet);
          const primaryWallet = userWallets.find((w) => w.defaultWallet);
          const count = userWallets.length;
          const summaryLabel = isLoadingWallets
            ? 'Loading…'
            : count === 0
              ? 'No wallets found'
              : `${count} wallet${count === 1 ? '' : 's'}`;
          const summarySub = isLoadingWallets
            ? 'Fetching your wallets'
            : count === 0
              ? 'Nothing to display yet'
              : activeWallet
                ? `Active ${formatWalletAddress(activeWallet.walletAddress)}`
                : primaryWallet
                  ? `Default ${formatWalletAddress(primaryWallet.walletAddress)}`
                  : 'Tap to view all';
          const canExpand = !isLoadingWallets && count > 0;
          const isOpen = canExpand && isWalletsExpanded;

          return (
            <div className="profile-card profile-wallets-card">
              <button
                type="button"
                className="profile-btn"
                onClick={() =>
                  canExpand && setIsWalletsExpanded((prev) => !prev)
                }
                disabled={!canExpand}
                aria-expanded={isWalletsExpanded}
              >
                <span className="profile-btn-icon neutral">
                  {isLoadingWallets ? (
                    <LoadingOutlined
                      style={{ fontSize: 18, color: '#1C1917' }}
                      spin
                    />
                  ) : (
                    <WalletOutlined
                      style={{ fontSize: 18, color: '#1C1917' }}
                    />
                  )}
                </span>
                <span className="profile-btn-text">
                  <span className="profile-btn-label">{summaryLabel}</span>
                  <span className="profile-btn-sub">{summarySub}</span>
                </span>
                {canExpand && (
                  <DownOutlined
                    className="profile-btn-chevron"
                    style={{
                      transform: `rotate(${isWalletsExpanded ? 180 : 0}deg)`,
                      transition: 'transform 0.25s ease',
                    }}
                  />
                )}
              </button>

              <div
                className={`profile-wallets-body ${isOpen ? 'is-open' : ''}`}
                aria-hidden={!isOpen}
              >
                <div className="profile-wallets-body-inner">
                  <div className="profile-wallets-list">
                    {userWallets.map((wallet, idx) => {
                      const isActive = isActiveWallet(wallet);
                      return (
                        <button
                          key={wallet.walletAddress + idx}
                          type="button"
                          className={`profile-wallet-row ${isActive ? 'is-active' : ''}`}
                          onClick={() => {
                            setSelectedWallet(wallet);
                            setIsWalletModalOpen(true);
                          }}
                        >
                          <span className="profile-wallet-info">
                            <span className="profile-wallet-addr">
                              {formatWalletAddress(wallet.walletAddress)}
                            </span>
                            <span className="profile-wallet-date">
                              Created {new Date(wallet.createdOn).toLocaleDateString()}
                            </span>
                          </span>
                          <span className="profile-wallet-tags">
                            {isActive && (
                              <span className="profile-active-tag">Active</span>
                            )}
                            {wallet.defaultWallet && (
                              <span className="profile-primary-tag">Default</span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

export default Profile;
