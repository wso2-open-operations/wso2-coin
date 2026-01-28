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
import EventIcon from "@mui/icons-material/Event";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import type { RouteObject } from "react-router-dom";

import React from "react";

import { Role } from "@/types/types";
import { isIncludedRole } from "@utils/utils";
import { View } from "@view/Index";

import type { RouteDetail, RouteObjectWithRole } from "./types/types";

export const routes: RouteObjectWithRole[] = [
  {
    path: "/",
    text: "Conference QR",
    icon: React.createElement(QrCode2Icon),
    element: React.createElement(View.home),
    allowRoles: [Role.GENERAL_ADMIN, Role.SESSION_ADMIN, Role.O2BAR_ADMIN],
  },
  {
    path: "/EventTypes",
    text: "Event Types",
    icon: React.createElement(EventIcon),
    element: React.createElement(View.eventTypes),
    allowRoles: [Role.GENERAL_ADMIN],
  },
  /*
   TODO: Implement App Config page when the content is ready.
  {
    path: "/AppConfig",
    text: "App Config",
    icon: React.createElement(SettingsSuggestOutlinedIcon),
    element: React.createElement(View.appConfig),
    allowRoles: [Role.GENERAL_ADMIN],
    bottomNav: true,
  },
   TODO: Implement User Guide page when the user guide content is ready.
   The /help route is commented out for now and will be re-enabled once the
   user guide page (View.help) is implemented.

  {
    path: "/help",
    text: "Help",
    icon: React.createElement(HelpOutlineIcon),
    element: React.createElement(View.help),
    allowRoles: [Role.ADMIN, Role.O2BAR_ADMIN],
    bottomNav: true,
  }
  */
];

export const getActiveRoutesV2 = (
  routes: RouteObjectWithRole[] | undefined,
  roles: string[],
): RouteObjectWithRole[] => {
  if (!routes) return [];
  const routesObj: RouteObjectWithRole[] = [];
  routes.forEach((routeObj) => {
    if (isIncludedRole(roles, routeObj.allowRoles)) {
      routesObj.push({
        ...routeObj,
        children: getActiveRoutesV2(routeObj.children, roles),
      });
    }
  });

  return routesObj;
};

export const getActiveRoutes = (roles: string[]): RouteObject[] => {
  const routesObj: RouteObject[] = [];
  routes.forEach((routeObj) => {
    if (isIncludedRole(roles, routeObj.allowRoles)) {
      routesObj.push({
        ...routeObj,
      });
    }
  });
  return routesObj;
};

export const getActiveRouteDetails = (roles: string[]): RouteDetail[] => {
  const routesObj: RouteDetail[] = [];
  routes.forEach((routeObj) => {
    if (isIncludedRole(roles, routeObj.allowRoles)) {
      routesObj.push({
        ...routeObj,
        path: routeObj.path ?? "",
      });
    }
  });
  return routesObj;
};

interface getActiveParentRoutesProps {
  routes: RouteObjectWithRole[] | undefined;
  roles: string[];
}

export const getActiveParentRoutes = ({ routes, roles }: getActiveParentRoutesProps): string[] => {
  if (!routes) return [];

  let activeParentPaths: string[] = [];

  routes.forEach((routeObj) => {
    if (!routeObj.element) return;

    if (isIncludedRole(roles, routeObj.allowRoles)) {
      if (routeObj.path) {
        activeParentPaths.push(routeObj.path);
      }
    }
  });

  return activeParentPaths;
};
