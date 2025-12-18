// Copyright (c) 2025 WSO2 LLC. (https://www.wso2.com).
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
// RTK Query API for application configuration endpoints
import { createApi } from "@reduxjs/toolkit/query/react";

import { AppConfig } from "@config/config";

import { baseQueryWithRetry } from "./BaseQuery";

const THEME_STORAGE_KEY = "app_theme_config";

interface SupportTeamEmail {
  team: string;
  email: string;
}

export interface AppConfigInfo {
  supportTeamEmails: SupportTeamEmail[];
}

export enum Themes {
  DEFAULT_THEME = "Default Theme",
  XMAS_THEME = "Christmas Theme",
}

export interface ThemeConfig {
  theme: Themes;
  audio: string | null;
}

const saveThemeInLocalStorage = (themeConfig: ThemeConfig) => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(themeConfig));
    return { data: undefined };
  } catch (error) {
    return {
      error: {
        status: 500,
        statusText: "Local Storage Error",
        data: (error as Error).message,
      },
    };
  }
};

const getThemeFromLocalStorage = () => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    const data = stored ? (JSON.parse(stored) as ThemeConfig) : null;
    return { data };
  } catch (error) {
    return {
      error: {
        status: 500,
        statusText: "Local Storage Error",
        data: (error as Error).message,
      },
    };
  }
};

export const configApi = createApi({
  reducerPath: "configApi",
  baseQuery: baseQueryWithRetry,
  tagTypes: ["Config"],
  endpoints: (builder) => ({
    getAppConfig: builder.query<AppConfigInfo, void>({
      query: () => AppConfig.serviceUrls.appConfig,
      providesTags: ["Config"],
    }),
    setTheme: builder.mutation<void, ThemeConfig>({
      queryFn: (themeConfig) => saveThemeInLocalStorage(themeConfig),
      invalidatesTags: ["Config"],
    }),
    getTheme: builder.query<ThemeConfig | null, void>({
      queryFn: () => getThemeFromLocalStorage(),
      providesTags: ["Config"],
    }),
  }),
});

export const { useGetAppConfigQuery, useSetThemeMutation, useGetThemeQuery } = configApi;
