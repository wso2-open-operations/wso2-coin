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

package transaction

import (
	"context"
	"errors"
	"log/slog"
	"net/http"

	"github.com/wso2/wso2-coin/operations/transaction-service/internal/middleware"
	"github.com/wso2/wso2-coin/operations/transaction-service/internal/model"
	"github.com/wso2/wso2-coin/operations/transaction-service/internal/response"
)

const (
	defaultLimit = 15
	maxLimit     = 100
)

// Handler serves the transaction HTTP API.
type Handler struct {
	svc *Service
}

// NewHandler returns a transaction Handler.
func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// RegisterRoutes binds the transaction routes onto the mux. The literal master routes
// are registered before the {address} pattern so they take precedence.
func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /wallets/master/balance", h.masterBalance)
	mux.HandleFunc("POST /wallets/master/transfer", h.transfer)
	mux.HandleFunc("GET /wallets/{address}/balance", h.walletBalance)
	mux.HandleFunc("POST /transactions/search", h.search)
	mux.HandleFunc("GET /transactions/{reference}", h.transactionByReference)
}

func (h *Handler) masterBalance(w http.ResponseWriter, r *http.Request) {
	clientID, ok := caller(w, r)
	if !ok {
		return
	}
	balance, err := h.svc.MasterBalance(r.Context(), clientID)
	if err != nil {
		writeServiceError(r.Context(), w, err)
		return
	}
	response.WriteJSON(w, http.StatusOK, balance)
}

func (h *Handler) transfer(w http.ResponseWriter, r *http.Request) {
	clientID, ok := caller(w, r)
	if !ok {
		return
	}
	var req model.TransferRequest
	if err := response.DecodeJSON(w, r, &req); err != nil {
		response.WriteDecodeError(w, err)
		return
	}
	res, err := h.svc.Transfer(r.Context(), clientID, req)
	if err != nil {
		writeServiceError(r.Context(), w, err)
		return
	}
	w.Header().Set("Location", "/transactions/"+res.Reference)
	response.WriteJSON(w, http.StatusCreated, res)
}

func (h *Handler) walletBalance(w http.ResponseWriter, r *http.Request) {
	balance, err := h.svc.WalletBalance(r.Context(), r.PathValue("address"))
	if err != nil {
		writeServiceError(r.Context(), w, err)
		return
	}
	response.WriteJSON(w, http.StatusOK, balance)
}

func (h *Handler) search(w http.ResponseWriter, r *http.Request) {
	var req model.TransactionSearchRequest
	if err := response.DecodeJSON(w, r, &req); err != nil {
		response.WriteDecodeError(w, err)
		return
	}
	req.Limit = normalizeLimit(req.Limit)
	if req.Offset < 0 {
		req.Offset = 0
	}
	page, err := h.svc.SearchTransactions(r.Context(), req)
	if err != nil {
		writeServiceError(r.Context(), w, err)
		return
	}
	response.WriteJSON(w, http.StatusOK, page)
}

func (h *Handler) transactionByReference(w http.ResponseWriter, r *http.Request) {
	txn, err := h.svc.TransactionByReference(r.Context(), r.PathValue("reference"))
	if err != nil {
		writeServiceError(r.Context(), w, err)
		return
	}
	response.WriteJSON(w, http.StatusOK, txn)
}

func caller(w http.ResponseWriter, r *http.Request) (string, bool) {
	clientID := middleware.ClientIDFromContext(r.Context())
	if clientID == "" {
		response.WriteError(w, http.StatusUnauthorized, response.ErrMsgUnauthorized)
		return "", false
	}
	return clientID, true
}

func normalizeLimit(limit int) int {
	if limit <= 0 {
		return defaultLimit
	}
	if limit > maxLimit {
		return maxLimit
	}
	return limit
}

func writeServiceError(ctx context.Context, w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrNotFound):
		response.WriteError(w, http.StatusNotFound, response.ErrMsgNotFound)
	case errors.Is(err, ErrForbidden):
		response.WriteError(w, http.StatusForbidden, response.ErrMsgForbidden)
	case errors.Is(err, ErrRecipientNotFound):
		response.WriteError(w, http.StatusBadRequest, response.ErrMsgRecipientNotFound)
	case errors.Is(err, ErrSelfTransfer):
		response.WriteError(w, http.StatusBadRequest, response.ErrMsgSelfTransfer)
	case errors.Is(err, ErrInvalidAmount):
		response.WriteError(w, http.StatusBadRequest, response.ErrMsgInvalidAmount)
	case errors.Is(err, ErrInsufficientFunds):
		response.WriteError(w, http.StatusBadRequest, response.ErrMsgInsufficientFunds)
	default:
		slog.ErrorContext(ctx, "request failed", "err", err)
		response.WriteError(w, http.StatusInternalServerError, response.ErrMsgInternal)
	}
}
