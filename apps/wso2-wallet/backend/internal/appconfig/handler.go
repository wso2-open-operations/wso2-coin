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

// Package appconfig serves client-facing runtime configuration.
package appconfig

import (
	"net/http"

	"github.com/wso2/wso2-coin/apps/wso2-wallet/backend/internal/model"
	"github.com/wso2/wso2-coin/apps/wso2-wallet/backend/internal/response"
)

// Handler serves the app configuration HTTP API.
type Handler struct {
	maintenanceMode    bool
	maintenanceMessage string
}

// NewHandler returns an app-config Handler over the given maintenance settings.
func NewHandler(maintenanceMode bool, maintenanceMessage string) *Handler {
	return &Handler{maintenanceMode: maintenanceMode, maintenanceMessage: maintenanceMessage}
}

// RegisterRoutes binds the app-config routes onto the mux.
func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/app-config", h.appConfig)
}

func (h *Handler) appConfig(w http.ResponseWriter, _ *http.Request) {
	response.WriteJSON(w, http.StatusOK, model.AppConfig{
		MaintenanceMode:    h.maintenanceMode,
		MaintenanceMessage: h.maintenanceMessage,
	})
}
