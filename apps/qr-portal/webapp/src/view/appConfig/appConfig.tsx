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
import { Autocomplete, Box, Button, TextField, Typography, useTheme } from "@mui/material";

import { useEffect, useState } from "react";

import {
  type ThemeConfig,
  Themes,
  useGetThemeQuery,
  useSetThemeMutation,
} from "@root/src/services/config.api";

interface Audio {
  label: string;
  value: string;
}

interface ThemeOption {
  label: string;
  value: string;
  audio: Audio[];
}

export const themeOptions: ThemeOption[] = [
  {
    label: "DEFAULT_THEME",
    value: Themes.DEFAULT_THEME,
    audio: [],
  },
  {
    label: "CHRISTMAS_THEME",
    value: Themes.XMAS_THEME,
    audio: [],
  },
];

export default function AppConfig() {
  const theme = useTheme();
  const [setTheme] = useSetThemeMutation();
  const { data: currentThemeConfig } = useGetThemeQuery();
  const currentTheme = currentThemeConfig?.theme || Themes.DEFAULT_THEME;

  const [selectedTheme, setSelectedTheme] = useState<ThemeOption | null>(null);

  useEffect(() => {
    const themeOption = themeOptions.find((option) => option.value === currentTheme);
    setSelectedTheme(themeOption || null);
  }, [currentTheme]);

  const handleSetTheme = (themeConfig: ThemeConfig) => {
    themeConfig.audio = null;
    setTheme(themeConfig);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h6" sx={{ color: theme.palette.customText.primary.p1.active }}>
        App Configs
      </Typography>

      <Typography variant="body1" sx={{ color: theme.palette.customText.primary.p2.active }}>
        Seasonal Theme
      </Typography>

      <Box sx={{ display: "flex", gap: 2 }}>
        <Autocomplete
          disablePortal
          options={themeOptions}
          value={selectedTheme}
          onChange={(_, option) => setSelectedTheme(option ?? null)}
          sx={{ width: 300 }}
          renderInput={(params) => <TextField {...params} label="Theme" />}
        />

        <Button
          onClick={() => {
            if (!selectedTheme) return;
            const themeConfig: ThemeConfig = {
              theme: selectedTheme.value as Themes,
              audio: currentThemeConfig?.audio || null,
            };
            handleSetTheme(themeConfig);
          }}
          variant="outlined"
          disabled={!selectedTheme || selectedTheme.value === currentTheme}
        >
          Set Theme
        </Button>
      </Box>
    </Box>
  );
}
