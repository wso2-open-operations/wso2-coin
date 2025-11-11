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

import React from "react";
import Typography from "@mui/material/Typography";
import Toolbar from "@mui/material/Toolbar";
import { alpha, AppBar, Avatar, Box, Menu, MenuItem, Stack, Tooltip, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useAppAuthContext } from "@context/AuthContext";
import { APP_NAME } from "@config/config";
import { RootState, useAppSelector } from "@slices/store";

const Header = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const authContext = useAppAuthContext();
  const [anchorElUser, setAnchorElUser] = React.useState<null | HTMLElement>(null);
  const user = useAppSelector((state: RootState) => state.user);
  const auth = useAppSelector((state: RootState) => state.auth);

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  // Get user display name from decoded token (given_name + family_name) or fallback to email
  const getUserDisplayName = (): string => {
    if (auth.decodedIdToken) {
      const token = auth.decodedIdToken as any;
      if (token.given_name && token.family_name) {
        return `${token.given_name} ${token.family_name}`;
      }
      if (token.name) {
        return token.name;
      }
      if (token.given_name) {
        return token.given_name;
      }
    }
    return user.userInfo?.email || "";
  };

  const getUserInitial = (): string => {
    const displayName = getUserDisplayName();
    if (displayName && displayName !== user.userInfo?.email) {
      return displayName.charAt(0).toUpperCase();
    }
    return user.userInfo?.email?.charAt(0).toUpperCase() || "";
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        color: (theme) => (theme.palette.mode === "light" ? theme.palette.primary.main : theme.palette.common.white),
        background: (theme) =>
          theme.palette.mode === "light" ? theme.palette.common.white : theme.palette.primary.dark,
        boxShadow: 2,
      }}
    >
      <Toolbar
        variant="dense"
        sx={{
          paddingY: 0.3,
          "&.MuiToolbar-root": {
            pl: 0.3,
          },
        }}
      >
        <img
          alt="wso2"
          style={{
            height: "45px",
            maxWidth: "100px",
          }}
          onClick={() => (window.location.href = "/")}
          src={require("../../assets/images/wso2-logo.svg").default}
        ></img>
        <Typography
          variant="h5"
          sx={{
            ml: 1,
            flexGrow: 1,
            fontWeight: 600,
            fontSize: { xs: "0.875rem", sm: undefined },
          }}
          color={"primary"}
        >
          {APP_NAME}
        </Typography>

        <Box sx={{ flexGrow: 0 }}>
          {user.userInfo && (
            <>
              <Stack flexDirection={"row"} alignItems={"center"} gap={{ xs: 1, sm: 2 }}>
                {!isMobile && (
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {getUserDisplayName()}
                  </Typography>
                )}
                <Tooltip title="Open settings" arrow enterDelay={300}>
                  <Avatar
                    onClick={handleOpenUserMenu}
                    sx={{
                      width: { xs: 32, sm: 40 },
                      height: { xs: 32, sm: 40 },
                      boxShadow: (theme) =>
                        `0 0 0 2px ${theme.palette.background.paper}, 0 0 0 4px ${alpha(
                          theme.palette.primary.main,
                          0.3
                        )}`,
                    }}
                  >
                    {getUserInitial()}
                  </Avatar>
                </Tooltip>
              </Stack>

              <Menu
                sx={{ mt: "45px" }}
                id="menu-appbar"
                anchorEl={anchorElUser}
                anchorOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                keepMounted
                transformOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                open={Boolean(anchorElUser)}
                onClose={handleCloseUserMenu}
              >
                <MenuItem
                  key={"logout"}
                  onClick={() => {
                    authContext.appSignOut();
                  }}
                >
                  <Typography textAlign="center">Logout</Typography>
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
