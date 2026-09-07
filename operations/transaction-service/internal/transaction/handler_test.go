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
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/wso2/wso2-coin/operations/transaction-service/internal/model"
)

func newTestMux(t *testing.T, repo *fakeRepo) *http.ServeMux {
	t.Helper()
	mux := http.NewServeMux()
	NewHandler(NewService(repo, newEnc(t))).RegisterRoutes(mux)
	return mux
}

func TestHandlerListWalletsEmptyReturnsJSONArray(t *testing.T) {
	mux := newTestMux(t, &fakeRepo{})
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/wallets", nil))

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if body := strings.TrimSpace(rec.Body.String()); body != "[]" {
		t.Fatalf("body = %q, want [] (not null) for empty result", body)
	}
}

func TestHandlerListWallets(t *testing.T) {
	repo := &fakeRepo{summaries: []WalletSummaryRow{
		{Address: "0xaaa", DefaultWallet: true, CreatedOn: time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC)},
	}}
	rec := httptest.NewRecorder()
	newTestMux(t, repo).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/wallets", nil))

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	var got []model.WalletSummary
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("decode: %v", err)
	}
	want := model.WalletSummary{WalletAddress: "0xaaa", DefaultWallet: true, CreatedOn: "2026-01-02T03:04:05Z"}
	if len(got) != 1 || got[0] != want {
		t.Fatalf("wallets = %+v, want [%+v]", got, want)
	}
}

func TestHandlerListWalletAddressesEmptyReturnsJSONArray(t *testing.T) {
	mux := newTestMux(t, &fakeRepo{})
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/wallets/addresses", nil))

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if body := strings.TrimSpace(rec.Body.String()); body != "[]" {
		t.Fatalf("body = %q, want [] (not null) for empty result", body)
	}
}

func TestHandlerSearchRejectsTooManyAddresses(t *testing.T) {
	addrs := make([]string, maxSearchAddresses+1)
	for i := range addrs {
		addrs[i] = "0xabc"
	}
	payload, err := json.Marshal(model.TransactionSearchRequest{FromAddresses: addrs})
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/transactions/search", bytes.NewReader(payload))
	newTestMux(t, &fakeRepo{}).ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
}
