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

import { Avatar } from "antd";
import { useState } from "react";
import { LoadingOutlined, PlusOutlined } from "@ant-design/icons";
import "./CreateWallet.css";
import Wso2MainImg from "../../assets/images/pulse-orange.png";
import { useNavigate } from "react-router-dom";
import {
  WSO2_WALLET,
  CREATE_A_NEW_WALLET,
  CREATE_WALLET_CONFIRM,
  CREATE,
  CANCEL,
  SUCCESS,
  SUCCESS_WALLET_CREATED,
  OK,
  ERROR,
  ERROR_CREATING_WALLET,
} from "../../constants/strings";
import { STORAGE_KEYS } from "../../constants/configs";
import { saveLocalDataAsync } from "../../helpers/storage";
import { createWallet } from "../../services/wallet.service";
import { showAlertBox, showToast } from "../../helpers/alerts";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";

function CreateWallet() {
  const [walletCreateLoading, setWalletCreateLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const navigate = useNavigate();

  const createNewWallet = async () => {
    setWalletCreateLoading(true);
    try {
      const wallet = await createWallet();
      await saveLocalDataAsync(STORAGE_KEYS.WALLET_ADDRESS, wallet.walletAddress);
      showToast(SUCCESS, SUCCESS_WALLET_CREATED);
      setIsConfirmOpen(false);
      navigate("/");
    } catch (error) {
      console.log(error);
      showAlertBox(ERROR, ERROR_CREATING_WALLET, OK);
    } finally {
      setWalletCreateLoading(false);
    }
  };

  return (
    <div className="cw-page">
      <ConfirmModal
        open={isConfirmOpen}
        title={CREATE_A_NEW_WALLET}
        description={CREATE_WALLET_CONFIRM}
        confirmText={CREATE}
        cancelText={CANCEL}
        loading={walletCreateLoading}
        onConfirm={createNewWallet}
        onCancel={() => setIsConfirmOpen(false)}
      />

      <div className="cw-body">
        <div className="cw-logo">
          <Avatar size={96} src={Wso2MainImg} />
        </div>
        <div className="cw-title">{WSO2_WALLET}</div>
        <div className="cw-subtitle">
          Send, receive, and track your O2C.
        </div>
      </div>

      <div className="cw-footer">
        <button
          type="button"
          className="cw-btn-primary"
          onClick={() => setIsConfirmOpen(true)}
          disabled={walletCreateLoading}
        >
          {walletCreateLoading ? (
            <LoadingOutlined style={{ fontSize: 16 }} spin />
          ) : (
            <PlusOutlined style={{ fontSize: 16 }} />
          )}
          <span>
            {walletCreateLoading ? "Creating wallet..." : CREATE_A_NEW_WALLET}
          </span>
        </button>
      </div>
    </div>
  );
}

export default CreateWallet;
