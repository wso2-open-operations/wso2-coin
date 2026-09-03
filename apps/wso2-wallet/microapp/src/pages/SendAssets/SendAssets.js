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

import React, { useEffect, useState } from "react";
import { Avatar, message, Spin } from "antd";
import {
  ArrowRightOutlined,
  LoadingOutlined,
  QrcodeOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import "./SendAssets.css";
import { isAddress } from "ethereum-address";
import Wso2MainImg from "../../assets/images/pulse-orange.png";
import {
  ERROR_FETCHING_LOCAL_TX_DETAILS,
  ERROR_SAVING_TX_DETAILS,
  ERROR_RETRIEVE_WALLET_ADDRESS,
  ERROR_BRIDGE_NOT_READY,
  WSO2_TOKEN,
} from "../../constants/strings";
import { getLocalDataAsync, saveLocalDataAsync } from "../../helpers/storage";
import { STORAGE_KEYS, DEFAULT_WALLET_ADDRESS } from "../../constants/configs";
import { useWalletBalance } from "../../services/query-hooks";
import { waitForBridge } from "../../helpers/bridge";
import { scanQrCode } from "../../microapp-bridge";
import {
  getPaymentLaunchData,
  peekPaymentLaunchData,
  hydrateLaunchDataFromBridge,
} from "../../helpers/paymentFlow";

function SendAssets() {
  const navigate = useNavigate();

  const [messageApi, contextHolder] = message.useMessage();

  const [sendWalletAddress, setSendWalletAddress] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [isValidWalletAddress, setIsValidWalletAddress] = useState(false);
  const [isShowErrorMsg, setIsShowErrorMsg] = useState(false);
  const [walletValidationErrorMsg, setWalletValidationErrorMsg] = useState("");
  const [isCanContinue, setIsCanContinue] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isAmountFocused, setIsAmountFocused] = useState(false);

  const [storedSendWalletAddress, setStoredSendWalletAddress] = useState("");
  const [storedSendAmount, setStoredSendAmount] = useState("");

  const [walletAddress, setWalletAddress] = useState(DEFAULT_WALLET_ADDRESS);
  const {
    data: tokenBalance,
    isLoading: isTokenBalanceLoading,
    isError: isTokenBalanceError,
    refetch: refetchTokenBalance,
  } = useWalletBalance(walletAddress);

  const fetchWalletAddress = async (retryCount = 0) => {
    const maxRetries = 3;

    try {
      const isBridgeReady = await waitForBridge();
      if (!isBridgeReady) {
        console.error(ERROR_BRIDGE_NOT_READY);
        messageApi.error(ERROR_BRIDGE_NOT_READY);
        return;
      }
      const walletAddressResponse = await getLocalDataAsync(
        STORAGE_KEYS.WALLET_ADDRESS,
      );
      if (
        walletAddressResponse &&
        walletAddressResponse !== null &&
        walletAddressResponse !== DEFAULT_WALLET_ADDRESS &&
        typeof walletAddressResponse === "string" &&
        walletAddressResponse.length > 2
      ) {
        setWalletAddress(walletAddressResponse);
      } else {
        if (retryCount < maxRetries) {
          setTimeout(() => fetchWalletAddress(retryCount + 1), 1000);
        } else {
          setWalletAddress(DEFAULT_WALLET_ADDRESS);
        }
      }
    } catch (error) {
      console.log(`${ERROR_RETRIEVE_WALLET_ADDRESS} - ${error}`);
      if (retryCount < maxRetries) {
        setTimeout(() => fetchWalletAddress(retryCount + 1), 1000);
      } else {
        messageApi.error(ERROR_RETRIEVE_WALLET_ADDRESS);
        setWalletAddress(DEFAULT_WALLET_ADDRESS);
      }
    }
  };

  useEffect(() => {
    const initializeWallet = async () => {
      await fetchWalletAddress();
    };

    initializeWallet();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const initializePaymentLaunch = async () => {
      // 1. Peek payment launch data (instant check if already in URL / window)
      let peekPayment = peekPaymentLaunchData();

      // 2. If not present, run the bridge hydration once
      if (!peekPayment) {
        await hydrateLaunchDataFromBridge();
        if (isCancelled) return;
        peekPayment = peekPaymentLaunchData();
      }

      // 3. Process the flow if matched
      if (peekPayment) {
        const paymentData = getPaymentLaunchData();
        if (paymentData) {
          try {
            await saveLocalDataAsync(
              STORAGE_KEYS.SENDER_WALLET_ADDRESS,
              paymentData.walletAddress,
            );
            if (isCancelled) return;
            await saveLocalDataAsync(
              STORAGE_KEYS.SENDING_AMOUNT,
              paymentData.amount,
            );
            if (isCancelled) return;
            navigate("/confirm-assets-send", {
              replace: true,
              state: {
                isParkingPaymentFlow: paymentData.flow === "PARKING",
                isShopPaymentFlow: paymentData.flow === "SHOP",
                returnAppId: paymentData.returnAppId,
                returnRoute: paymentData.returnRoute,
              },
            });
          } catch (error) {
            if (!isCancelled) {
              console.log(`${ERROR_SAVING_TX_DETAILS}: ${error}`);
            }
          }
        }
      }
    };

    initializePaymentLaunch();

    return () => {
      isCancelled = true;
    };
  }, [navigate]);

  // If the native scanner is dismissed without scanning, no bridge callback
  // fires — reset the loading state when the WebView regains visibility.
  useEffect(() => {
    if (!isScanning) return;
    let timeoutId;
    const onVisibility = () => {
      if (document.hidden) return;
      timeoutId = setTimeout(() => setIsScanning(false), 600);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isScanning]);

  const handleSendAssetsNext = async () => {
    try {
      await saveLocalDataAsync(STORAGE_KEYS.SENDING_AMOUNT, sendAmount);
      await saveLocalDataAsync(
        STORAGE_KEYS.SENDER_WALLET_ADDRESS,
        sendWalletAddress,
      );
      navigate("/confirm-assets-send");
    } catch (error) {
      console.log(`${ERROR_SAVING_TX_DETAILS}: ${error}`);
    }
  };

  const handleWalletAddressInputChange = (e) => {
    const address = e.target.value;
    setSendWalletAddress(address);

    if (e.target.value === "") {
      setIsShowErrorMsg(false);
    }
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    if (/^\d*(\.\d*)?$/.test(value)) {
      setSendAmount(value);
    }
  };

  const handleUseMax = () => {
    if (tokenBalance !== undefined && tokenBalance !== null) {
      setSendAmount(String(tokenBalance));
    }
  };

  const parsedBalance = parseFloat(tokenBalance);
  const hasBalance = !isNaN(parsedBalance);
  const isAmountExceedingBalance =
    sendAmount &&
    !isNaN(parseFloat(sendAmount)) &&
    hasBalance &&
    parseFloat(sendAmount) > parsedBalance;

  const handleScanQrCode = () => {
    setIsScanning(true);
    scanQrCode(
      async (qrData) => {
        try {
          const parsedData = JSON.parse(qrData);

          if (
            !parsedData.wallet_address ||
            !isAddress(parsedData.wallet_address)
          ) {
            messageApi.error("QR code has an invalid wallet address");
            setIsScanning(false);
            return;
          }

          if (parsedData.coin_amount) {
            const amountStr = String(parsedData.coin_amount).trim();
            // Require a complete positive decimal; parseFloat alone would accept
            // strings like "1invalid" as 1 and then persist the raw value.
            if (!/^\d+(\.\d+)?$/.test(amountStr) || parseFloat(amountStr) <= 0) {
              messageApi.error("QR code has an invalid amount");
              setIsScanning(false);
              return;
            }

            await saveLocalDataAsync(
              STORAGE_KEYS.SENDER_WALLET_ADDRESS,
              parsedData.wallet_address,
            );
            await saveLocalDataAsync(
              STORAGE_KEYS.SENDING_AMOUNT,
              amountStr,
            );
            messageApi.success("Payment request loaded");

            setTimeout(() => {
              navigate("/confirm-assets-send");
            }, 500);
          } else {
            setSendWalletAddress(parsedData.wallet_address);
            messageApi.success("Recipient address added");
          }
          setIsScanning(false);
        } catch (error) {
          if (isAddress(qrData)) {
            setSendWalletAddress(qrData);
            messageApi.success("Recipient address added");
          } else {
            messageApi.error("Couldn't read that QR code");
          }
          setIsScanning(false);
        }
      },
      (error) => {
        console.error("QR Code scan failed:", error);
        messageApi.error("Couldn't scan QR. Please try again.");
        setIsScanning(false);
      },
    );
  };

  const fetchLocalTxDetails = async () => {
    try {
      const sendingAmount = await getLocalDataAsync(
        STORAGE_KEYS.SENDING_AMOUNT,
      );
      const senderWalletAddress = await getLocalDataAsync(
        STORAGE_KEYS.SENDER_WALLET_ADDRESS,
      );
      setStoredSendWalletAddress(senderWalletAddress);
      setStoredSendAmount(sendingAmount);
    } catch (error) {
      console.log(`${ERROR_FETCHING_LOCAL_TX_DETAILS}: ${error}`);
    }
  };

  useEffect(() => {
    fetchLocalTxDetails();
  }, []);

  useEffect(() => {
    if (storedSendWalletAddress || storedSendAmount) {
      setSendWalletAddress(storedSendWalletAddress);
      setSendAmount(storedSendAmount);
    }
  }, [storedSendWalletAddress, storedSendAmount]);

  useEffect(() => {
    if (
      isValidWalletAddress &&
      sendAmount &&
      parseFloat(sendAmount) > 0 &&
      !isAmountExceedingBalance
    ) {
      setIsCanContinue(true);
    } else {
      setIsCanContinue(false);
    }
  }, [isValidWalletAddress, sendAmount, isAmountExceedingBalance]);

  useEffect(() => {
    setIsValidWalletAddress(isAddress(sendWalletAddress));
    if (sendWalletAddress === "") {
      setIsShowErrorMsg(false);
      setWalletValidationErrorMsg("");
    } else if (isAddress(sendWalletAddress)) {
      setIsShowErrorMsg(false);
      setWalletValidationErrorMsg("");
    } else {
      setIsShowErrorMsg(true);
      setWalletValidationErrorMsg("Invalid wallet address");
    }
  }, [sendWalletAddress]);

  return (
    <div className="send-page">
      {contextHolder}

      <button
        type="button"
        className="send-scan-btn"
        onClick={handleScanQrCode}
        disabled={isScanning}
      >
        {isScanning ? (
          <LoadingOutlined style={{ color: "#ffffff", fontSize: 18 }} spin />
        ) : (
          <QrcodeOutlined style={{ color: "#ffffff", fontSize: 18 }} />
        )}
        <span>{isScanning ? "Scanning..." : "Scan QR Code"}</span>
      </button>

      <div className="send-divider">
        <span className="send-divider-line" />
        <span className="send-divider-text">or enter manually</span>
        <span className="send-divider-line" />
      </div>

      <div className="send-form">
        <div className="send-field-label">Recipient Address</div>
        <div className={`send-address-wrap ${isShowErrorMsg && sendWalletAddress ? "is-error" : ""}`}>
          <SearchOutlined className="send-address-icon" />
          <input
            className="send-address-input"
            type="text"
            placeholder="Enter wallet address (0x...)"
            value={sendWalletAddress || ""}
            onChange={handleWalletAddressInputChange}
          />
        </div>
        {isShowErrorMsg && sendWalletAddress && (
          <div className="send-hint is-error">{walletValidationErrorMsg}</div>
        )}
      </div>

      <div className="send-form">
        <div className="send-field-label">Wallet Balance</div>
        <div className="send-balance-card">
          <div className="send-balance-coin">
            <Avatar size={42} src={Wso2MainImg} />
          </div>
          <div className="send-balance-info">
            <div className="send-balance-name">{WSO2_TOKEN}</div>
            <div className="send-balance-amount">
              {isTokenBalanceLoading ? (
                <>
                  Loading…{" "}
                  <Spin size="small" indicator={<LoadingOutlined spin />} />
                </>
              ) : isTokenBalanceError || tokenBalance === undefined ? (
                <>
                  Couldn't load{" "}
                  <button
                    type="button"
                    className="send-balance-retry"
                    onClick={() => refetchTokenBalance()}
                  >
                    Retry
                  </button>
                </>
              ) : (
                <>
                  Balance: {tokenBalance} {WSO2_TOKEN}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="send-form">
        <div className="send-field-label">Amount</div>
        <div
          className={`send-amount-wrap ${isAmountFocused ? "is-focused" : ""} ${
            !isValidWalletAddress ? "is-disabled" : ""
          }`}
        >
          <input
            className="send-amount-input"
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={sendAmount || ""}
            onChange={handleAmountChange}
            onFocus={() => setIsAmountFocused(true)}
            onBlur={() => setIsAmountFocused(false)}
            disabled={!isValidWalletAddress}
          />
          <div className="send-ticker-pill">
            <Avatar size={20} src={Wso2MainImg} />
            <span className="send-ticker-text">{WSO2_TOKEN}</span>
          </div>
        </div>
        {!isValidWalletAddress && (
          <div className="send-hint">Enter a valid wallet address first</div>
        )}
        {isValidWalletAddress && isAmountExceedingBalance && (
          <div className="send-hint is-error">Amount exceeds your balance</div>
        )}
        {isValidWalletAddress && !sendAmount && hasBalance && parsedBalance > 0 && (
          <button
            type="button"
            className="send-max-btn"
            onClick={handleUseMax}
          >
            Use max: {tokenBalance} {WSO2_TOKEN}
          </button>
        )}
      </div>

      <button
        type="button"
        className={`send-continue-btn ${!isCanContinue ? "is-disabled" : ""}`}
        onClick={handleSendAssetsNext}
        disabled={!isCanContinue}
      >
        <span>Continue</span>
        <ArrowRightOutlined style={{ fontSize: 14 }} />
      </button>
    </div>
  );
}

export default SendAssets;
