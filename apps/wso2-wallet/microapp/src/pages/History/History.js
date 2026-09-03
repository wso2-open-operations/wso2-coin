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
import TransactionHistory from "../../components/History/TransactionHistory";
import { STORAGE_KEYS } from '../../constants/configs';
import { getLocalDataAsync } from '../../helpers/storage';

function History() {
  const [walletAddress, setWalletAddress] = useState("");
  useEffect(() => {
    document.body.classList.add('history-active');
    const fetchWalletAddress = async () => {
      const address = await getLocalDataAsync(STORAGE_KEYS.WALLET_ADDRESS);
      setWalletAddress(address || "");
    };
    fetchWalletAddress();
    return () => {
      document.body.classList.remove('history-active');
    };
  }, []);

  return (
    <div className="history-page">
      <div className="history-content">
        <TransactionHistory walletAddress={walletAddress} />
      </div>
    </div>
  );
}

export default History;
