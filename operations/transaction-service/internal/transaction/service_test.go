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
	"database/sql"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/wso2/wso2-coin/operations/transaction-service/internal/crypto"
	"github.com/wso2/wso2-coin/operations/transaction-service/internal/model"
	"github.com/wso2/wso2-coin/operations/transaction-service/internal/money"
)

type fakeRepo struct {
	masters     map[string]string
	wallets     []*WalletRow
	txns        []TxnInsert
	searchRows  []TxnRow
	searchTotal int
	lastFilters SearchFilters
	byRef       map[string]*TxnRow
}

func (r *fakeRepo) find(address string) *WalletRow {
	for _, w := range r.wallets {
		if strings.EqualFold(w.Address, address) {
			return w
		}
	}
	return nil
}

func (r *fakeRepo) MasterWalletByClient(_ context.Context, clientID string) (string, error) {
	addr, ok := r.masters[clientID]
	if !ok {
		return "", ErrNoMasterWallet
	}
	return addr, nil
}

func (r *fakeRepo) WalletByAddress(_ context.Context, address string) (*WalletRow, error) {
	w := r.find(address)
	if w == nil {
		return nil, nil
	}
	cp := *w
	return &cp, nil
}

func (r *fakeRepo) SearchTransactions(_ context.Context, f SearchFilters) ([]TxnRow, int, error) {
	r.lastFilters = f
	return r.searchRows, r.searchTotal, nil
}

func (r *fakeRepo) TransactionByReference(_ context.Context, reference string) (*TxnRow, error) {
	t, ok := r.byRef[reference]
	if !ok {
		return nil, nil
	}
	cp := *t
	return &cp, nil
}

func (r *fakeRepo) Tx(_ context.Context, fn func(Queries) error) error {
	return fn(&fakeQueries{r: r})
}

type fakeQueries struct {
	r *fakeRepo
}

func (q *fakeQueries) LockBalance(_ context.Context, address string) (string, error) {
	w := q.r.find(address)
	if w == nil {
		return "", errors.New("wallet not found")
	}
	if !w.Balance.Valid {
		return "", errors.New("no balance")
	}
	return w.Balance.String, nil
}

func (q *fakeQueries) UpdateBalance(_ context.Context, address, encBalance string) error {
	w := q.r.find(address)
	if w == nil {
		return errors.New("wallet not found")
	}
	w.Balance = sql.NullString{String: encBalance, Valid: true}
	return nil
}

func (q *fakeQueries) InsertTransaction(_ context.Context, t TxnInsert) error {
	q.r.txns = append(q.r.txns, t)
	return nil
}

func newEnc(t *testing.T) *crypto.Encryptor {
	t.Helper()
	key := make([]byte, crypto.KeySize)
	for i := range key {
		key[i] = byte(i)
	}
	enc, err := crypto.New(key)
	if err != nil {
		t.Fatalf("crypto.New: %v", err)
	}
	return enc
}

func seedWallet(t *testing.T, enc Encryptor, r *fakeRepo, address, amount string) {
	t.Helper()
	units, err := money.ParseUnits(amount)
	if err != nil {
		t.Fatalf("parse %q: %v", amount, err)
	}
	c, err := enc.Encrypt(money.FormatUnits(units), balanceAAD(address))
	if err != nil {
		t.Fatalf("encrypt: %v", err)
	}
	r.wallets = append(r.wallets, &WalletRow{Address: address, Balance: sql.NullString{String: c, Valid: true}})
}

func balanceOf(t *testing.T, enc Encryptor, r *fakeRepo, address string) string {
	t.Helper()
	w := r.find(address)
	if w == nil || !w.Balance.Valid {
		t.Fatalf("wallet %s has no balance", address)
	}
	plain, err := enc.Decrypt(w.Balance.String, balanceAAD(address))
	if err != nil {
		t.Fatalf("decrypt balance of %s: %v", address, err)
	}
	return plain
}

func newFixture(t *testing.T) (*crypto.Encryptor, *fakeRepo, *Service) {
	t.Helper()
	enc := newEnc(t)
	repo := &fakeRepo{masters: map[string]string{"client-1": "0xmaster"}}
	seedWallet(t, enc, repo, "0xmaster", "100")
	seedWallet(t, enc, repo, "0xuser", "5")
	return enc, repo, NewService(repo, enc)
}

func TestTransfer(t *testing.T) {
	enc, repo, svc := newFixture(t)

	res, err := svc.Transfer(context.Background(), "client-1",
		model.TransferRequest{ToAddress: "0xuser", Amount: "12"})
	if err != nil {
		t.Fatalf("Transfer: %v", err)
	}
	if res.FromAddress != "0xmaster" || res.ToAddress != "0xuser" {
		t.Errorf("transfer endpoints = %s -> %s, want 0xmaster -> 0xuser", res.FromAddress, res.ToAddress)
	}
	if res.Amount != "12.000000000" {
		t.Errorf("amount = %q, want 12.000000000", res.Amount)
	}
	if !strings.HasPrefix(res.Reference, "0x") || len(res.Reference) != 66 {
		t.Errorf("reference = %q, want 0x + 64 hex", res.Reference)
	}
	if got := balanceOf(t, enc, repo, "0xmaster"); got != "88.000000000" {
		t.Errorf("sender balance = %q, want 88.000000000", got)
	}
	if got := balanceOf(t, enc, repo, "0xuser"); got != "17.000000000" {
		t.Errorf("recipient balance = %q, want 17.000000000", got)
	}
	if len(repo.txns) != 1 || repo.txns[0].Reference != res.Reference {
		t.Error("transfer transaction not recorded with the returned reference")
	}
}

func TestTransferErrors(t *testing.T) {
	tests := []struct {
		name     string
		clientID string
		req      model.TransferRequest
		wantErr  error
	}{
		{"no master mapping", "unknown", model.TransferRequest{ToAddress: "0xuser", Amount: "1"}, ErrForbidden},
		{"recipient not found", "client-1", model.TransferRequest{ToAddress: "0xzzz", Amount: "1"}, ErrRecipientNotFound},
		{"insufficient funds", "client-1", model.TransferRequest{ToAddress: "0xuser", Amount: "1000"}, ErrInsufficientFunds},
		{"self transfer", "client-1", model.TransferRequest{ToAddress: "0xmaster", Amount: "1"}, ErrSelfTransfer},
		{"invalid amount", "client-1", model.TransferRequest{ToAddress: "0xuser", Amount: "abc"}, ErrInvalidAmount},
		{"zero amount", "client-1", model.TransferRequest{ToAddress: "0xuser", Amount: "0"}, ErrInvalidAmount},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			enc, repo, svc := newFixture(t)

			_, err := svc.Transfer(context.Background(), tt.clientID, tt.req)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("Transfer error = %v, want %v", err, tt.wantErr)
			}
			if got := balanceOf(t, enc, repo, "0xmaster"); got != "100.000000000" {
				t.Errorf("sender balance changed on failure: %q", got)
			}
			if got := balanceOf(t, enc, repo, "0xuser"); got != "5.000000000" {
				t.Errorf("recipient balance changed on failure: %q", got)
			}
			if len(repo.txns) != 0 {
				t.Errorf("recorded %d transactions on failure, want 0", len(repo.txns))
			}
		})
	}
}

func TestMasterBalance(t *testing.T) {
	_, _, svc := newFixture(t)

	bal, err := svc.MasterBalance(context.Background(), "client-1")
	if err != nil {
		t.Fatalf("MasterBalance: %v", err)
	}
	if bal.WalletAddress != "0xmaster" || bal.Balance != "100.000000000" {
		t.Errorf("master balance = %+v, want {0xmaster 100.000000000}", bal)
	}

	if _, err := svc.MasterBalance(context.Background(), "unknown"); !errors.Is(err, ErrForbidden) {
		t.Errorf("MasterBalance for unmapped client error = %v, want ErrForbidden", err)
	}
}

func TestWalletBalance(t *testing.T) {
	_, _, svc := newFixture(t)

	bal, err := svc.WalletBalance(context.Background(), "0xuser")
	if err != nil {
		t.Fatalf("WalletBalance: %v", err)
	}
	if bal.Balance != "5.000000000" {
		t.Errorf("balance = %q, want 5.000000000", bal.Balance)
	}

	if _, err := svc.WalletBalance(context.Background(), "0xnope"); !errors.Is(err, ErrNotFound) {
		t.Errorf("WalletBalance for missing wallet error = %v, want ErrNotFound", err)
	}
}

func TestSearchTransactions(t *testing.T) {
	enc := newEnc(t)
	repo := &fakeRepo{}
	svc := NewService(repo, enc)

	mkRow := func(ref, amount string, ts time.Time) TxnRow {
		c, err := enc.Encrypt(amount, amountAADForRef(ref))
		if err != nil {
			t.Fatalf("encrypt amount: %v", err)
		}
		return TxnRow{
			Reference:   sql.NullString{String: ref, Valid: true},
			FromAddress: "0xmaster",
			ToAddress:   "0xuser",
			Amount:      c,
			CreatedOn:   ts,
		}
	}
	now := time.Now().UTC()
	repo.searchRows = []TxnRow{
		mkRow("0xref1", "10.000000000", now),
		mkRow("0xref2", "20.000000000", now.Add(-time.Minute)),
	}
	repo.searchTotal = 5

	page, err := svc.SearchTransactions(context.Background(), model.TransactionSearchRequest{
		FromAddresses: []string{"0xmaster"},
		Limit:         2,
		Offset:        0,
	})
	if err != nil {
		t.Fatalf("SearchTransactions: %v", err)
	}
	if page.Total != 5 || page.Limit != 2 || page.Offset != 0 {
		t.Errorf("page meta = {total %d limit %d offset %d}, want {5 2 0}", page.Total, page.Limit, page.Offset)
	}
	if len(page.Transactions) != 2 {
		t.Fatalf("returned %d transactions, want 2", len(page.Transactions))
	}
	if page.Transactions[0].Reference != "0xref1" || page.Transactions[0].Amount != "10.000000000" {
		t.Errorf("first txn = %+v, want ref 0xref1 amount 10.000000000", page.Transactions[0])
	}
	if page.Next == nil || *page.Next != "?offset=2&limit=2" {
		t.Errorf("next = %v, want ?offset=2&limit=2", page.Next)
	}
	if page.Previous != nil {
		t.Errorf("previous = %v, want nil", page.Previous)
	}
	if len(repo.lastFilters.FromAddresses) != 1 || repo.lastFilters.FromAddresses[0] != "0xmaster" {
		t.Errorf("filters not forwarded: %+v", repo.lastFilters)
	}
}
