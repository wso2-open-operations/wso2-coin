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

import React, { useEffect, useState, useRef } from "react";
import { Avatar, message } from "antd";
import {
  QrcodeOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import "./ReceiveCoins.css";
import Wso2MainImg from "../../assets/images/pulse-orange.png";
import { QRCodeSVG } from "qrcode.react";
import {
  AMOUNT_TO_RECEIVE,
  ERROR_BRIDGE_NOT_READY,
  ERROR_RETRIEVE_WALLET_ADDRESS,
  GENERATE_QR_CODE,
  SHARE_QR_CODE,
  WSO2_TOKEN,
} from "../../constants/strings";
import { getLocalDataAsync } from "../../helpers/storage";
import { STORAGE_KEYS, DEFAULT_WALLET_ADDRESS } from "../../constants/configs";
import { waitForBridge } from "../../helpers/bridge";

function ReceiveCoins() {
  const qrCodeRef = useRef(null);

  const [messageApi, contextHolder] = message.useMessage();

  const [receiveAmount, setReceiveAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState(DEFAULT_WALLET_ADDRESS);
  const [qrCodeData, setQrCodeData] = useState("");
  const [showQrCode, setShowQrCode] = useState(false);
  const [isAmountFocused, setIsAmountFocused] = useState(false);

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

  const handleGenerateQrCode = () => {
    if (!receiveAmount || parseFloat(receiveAmount) <= 0) {
      messageApi.warning("Enter an amount above 0");
      return;
    }

    const qrData = JSON.stringify({
      wallet_address: walletAddress,
      coin_amount: receiveAmount,
    });

    setQrCodeData(qrData);
    setShowQrCode(true);
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    if (/^\d*(\.\d*)?$/.test(value)) {
      setReceiveAmount(value);
    }
  };

  const SCREENSHOT_FALLBACK_MESSAGE =
    "Sharing isn't available here. Take a screenshot to save this QR code.";

  const handleShareQrCode = async () => {
    try {
      const svg = qrCodeRef.current.querySelector("svg");
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = async () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(async (blob) => {
          if (!blob) {
            messageApi.error("Couldn't generate QR image");
            return;
          }

          const file = new File(
            [blob],
            `receive-${receiveAmount}-${WSO2_TOKEN}.png`,
            { type: "image/png" },
          );

          const canShareFile =
            typeof navigator !== "undefined" &&
            typeof navigator.canShare === "function" &&
            typeof navigator.share === "function" &&
            navigator.canShare({ files: [file] });

          if (!canShareFile) {
            messageApi.info(SCREENSHOT_FALLBACK_MESSAGE);
            return;
          }

          try {
            await navigator.share({ files: [file] });
            messageApi.success("QR code shared");
          } catch (shareError) {
            if (shareError.name === "AbortError") {
              return;
            }
            console.error("Error sharing QR code:", shareError);
            messageApi.info(SCREENSHOT_FALLBACK_MESSAGE);
          }
        }, "image/png");
      };

      img.onerror = () => {
        messageApi.error("Couldn't render QR code");
      };

      img.src =
        "data:image/svg+xml;base64," +
        btoa(unescape(encodeURIComponent(svgData)));
    } catch (error) {
      console.error("Error sharing QR code:", error);
      messageApi.error("Couldn't share QR code");
    }
  };

  const handleNewQrCode = () => {
    setShowQrCode(false);
    setReceiveAmount("");
    setQrCodeData("");
  };

  const truncatedAddress =
    walletAddress && walletAddress.length > 24
      ? `${walletAddress.slice(0, 12)}...${walletAddress.slice(-10)}`
      : walletAddress;

  return (
    <div className="receive-page">
      {contextHolder}

      {!showQrCode ? (
        <>
          <div className="receive-intro">
            Enter the amount you want to receive and generate a QR code to share
            with the sender.
          </div>

          <div className="receive-form">
            <div className="receive-field-label">Your Wallet Address</div>
            <div className="receive-address-card">
              <div className="receive-address-card-text">{walletAddress}</div>
            </div>
            <div className="receive-hint">
              You will receive coins to this wallet
            </div>
          </div>

          <div className="receive-form">
            <div className="receive-field-label">{AMOUNT_TO_RECEIVE}</div>
            <div className={`receive-amount-wrap ${isAmountFocused ? "is-focused" : ""}`}>
              <input
                className="receive-amount-input"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={receiveAmount}
                onChange={handleAmountChange}
                onFocus={() => setIsAmountFocused(true)}
                onBlur={() => setIsAmountFocused(false)}
                autoFocus
              />
              <div className="receive-ticker-pill">
                <Avatar size={20} src={Wso2MainImg} />
                <span className="receive-ticker-text">{WSO2_TOKEN}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className={`receive-primary-btn ${
              !receiveAmount || parseFloat(receiveAmount) <= 0 ? "is-disabled" : ""
            }`}
            onClick={handleGenerateQrCode}
            disabled={!receiveAmount || parseFloat(receiveAmount) <= 0}
          >
            <QrcodeOutlined style={{ fontSize: 16 }} />
            <span>{GENERATE_QR_CODE}</span>
          </button>
        </>
      ) : (
        <>
          <div className="receive-intro">
            Share this QR code with the sender to receive payment.
          </div>

          <div className="receive-qr-card" ref={qrCodeRef}>
            <div className="receive-qr-canvas">
              <QRCodeSVG value={qrCodeData} size={220} level="M" includeMargin />
            </div>

            <div className="receive-qr-info">
              <div className="receive-qr-row">
                <span className="receive-qr-label">Amount</span>
                <div className="receive-qr-amount">
                  <span className="receive-qr-amount-num">{receiveAmount}</span>
                  <div className="receive-ticker-pill receive-ticker-pill-sm">
                    <Avatar size={18} src={Wso2MainImg} />
                    <span className="receive-ticker-text">{WSO2_TOKEN}</span>
                  </div>
                </div>
              </div>
              <div className="receive-qr-divider" />
              <div className="receive-qr-row receive-qr-row-stacked">
                <span className="receive-qr-label">Wallet Address</span>
                <span className="receive-qr-address">{truncatedAddress}</span>
              </div>
            </div>
          </div>

          <div className="receive-actions">
            <button
              type="button"
              className="receive-secondary-btn"
              onClick={handleNewQrCode}
            >
              <QrcodeOutlined style={{ fontSize: 14 }} />
              <span>New QR Code</span>
            </button>
            <button
              type="button"
              className="receive-primary-btn receive-primary-btn-inline"
              onClick={handleShareQrCode}
            >
              <ShareAltOutlined style={{ fontSize: 14 }} />
              <span>{SHARE_QR_CODE}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default ReceiveCoins;
