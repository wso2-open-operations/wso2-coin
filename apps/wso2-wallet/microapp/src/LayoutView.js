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

import { Layout } from "antd";
import React, { useEffect } from "react";
import FooterBar from "./components/Footer/Footer";
import TopBar from "./components/TopBar/TopBar";
import Pages from "./pages/Pages";
// import "./dark-theme.css";
// import "./light-theme.css";
import { useLocation, useNavigate } from "react-router-dom";
import {
  hydrateLaunchDataFromBridge,
  peekPaymentLaunchData,
} from "./helpers/paymentFlow";
import { waitForBridge } from "./helpers/bridge";
import { requestDeviceSafeAreaInsets } from "./microapp-bridge";

const MIN_BOTTOM_PADDING_PX = 8;

function LayoutView() {
  const { Content } = Layout;
  const location = useLocation();
  const navigate = useNavigate();

  // Derived synchronously from the route so the footer hides on the same render
  // as the navigation, with no one-frame flash on entering create-wallet.
  const isShowFooter = location.pathname !== "/create-wallet";

  useEffect(() => {
    if (location.pathname !== "/") {
      return;
    }
    let cancelled = false;
    (async () => {
      // 1. Peek payment launch data (instant check if already in URL / window)
      let peekPayment = peekPaymentLaunchData();

      // 2. If not present, run the bridge hydration once
      if (!peekPayment) {
        await hydrateLaunchDataFromBridge();
        if (cancelled) return;
        peekPayment = peekPaymentLaunchData();
      }

      if (peekPayment) {
        navigate("/send", { replace: true });
        return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, navigate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ready = await waitForBridge();
      if (!ready || cancelled) return;
      requestDeviceSafeAreaInsets((data) => {
        if (cancelled) return;
        const top = data?.insets?.top;
        const bottom = data?.insets?.bottom;

        if (typeof top === "number") {
          document.documentElement.style.setProperty(
            "--safe-area-top",
            `${Math.max(0, top)}px`,
          );
        }
        if (typeof bottom === "number") {
          const value = Math.max(MIN_BOTTOM_PADDING_PX, bottom);
          document.documentElement.style.setProperty(
            "--safe-area-bottom",
            `${value}px`,
          );
        }
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="main-background">
      <div className="col-lg-3 col-md-3 col-sm-12">
        <TopBar />
        <Layout className="main-layout">
          <Layout className="site-layout">
            <Content className={`layout-content ${isShowFooter ? 'has-footer' : 'no-footer'}`}>
              <div className="mt-3 mx-auto">
                <div>
                  <Pages />
                </div>
              </div>
            </Content>
          </Layout>
        </Layout>
        {isShowFooter ? (
          <div className="footer-wrapper">
            <FooterBar className="footer-bar" />
          </div>
        ) : (
          <></>
        )}
      </div>
    </div>
  );
}

export default LayoutView;
