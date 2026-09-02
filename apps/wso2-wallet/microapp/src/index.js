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

import './index.css';

import React from 'react';
import ReactDOM from 'react-dom';

import { ThemeSwitcherProvider } from 'react-css-theme-switcher';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import App from './App';
import reportWebVitals from './reportWebVitals';

const themes = {
  dark: `${process.env.PUBLIC_URL}/dark-theme.css`,
  light: `${process.env.PUBLIC_URL}/light-theme.css`
};

const init = async () => {
  // const storedTheme = await getLocalDataAsync(STORAGE_KEYS.THEME_MODE);
  // const themeState = storedTheme || "light";
  
  // Set light theme as default
  const themeState = "light";
  const queryClient = new QueryClient();

  ReactDOM.render(
    <React.StrictMode>
      <ThemeSwitcherProvider themeMap={themes} defaultTheme={themeState}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ThemeSwitcherProvider>
    </React.StrictMode>,
    document.getElementById("root")
  );
};

init();

reportWebVitals();
