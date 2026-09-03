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

import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./Home/Home";
import CreateWallet from "./CreateWallet/CreateWallet";
import SendAssets from "./SendAssets/SendAssets";
import ConfirmSendAssets from "./SendAssets/ConfirmSendAssets";
import Profile from "./Profile/Profile";
import History from "./History/History";
import ReceiveCoins from "./ReceiveCoins/ReceiveCoins";

function Pages() {
  return (
    <Routes>
      <Route path="/" exact element={<Home />} />
      <Route path="/create-wallet" exact element={<CreateWallet />} />
      <Route path="/send" exact element={<SendAssets />} />
      <Route path="/receive" exact element={<ReceiveCoins />} />
      <Route path="/confirm-assets-send" exact element={<ConfirmSendAssets />} />
      <Route path="/profile" exact element={<Profile />} />
      <Route path="/history" exact element={<History />} />
    </Routes>
  );
}

export default Pages;
