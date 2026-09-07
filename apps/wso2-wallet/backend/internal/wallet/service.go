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

// Package wallet implements wallet listing, creation, balances, transfers and history.
package wallet

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/wso2/wso2-coin/apps/wso2-wallet/backend/internal/model"
	"github.com/wso2/wso2-coin/apps/wso2-wallet/backend/internal/money"
)

// sourceWalletApp labels transactions originating from the wallet app. Every
// transaction this service writes is a wallet-app transaction, so its provenance
// is set server-side rather than supplied by callers.
const sourceWalletApp = "WALLET_APP"

// Domain errors returned by the service and mapped to HTTP statuses by the handler.
var (
	ErrNotFound          = errors.New("wallet not found")
	ErrForbidden         = errors.New("wallet not owned by caller")
	ErrInvalidAmount     = errors.New("invalid amount")
	ErrInsufficientFunds = errors.New("insufficient funds")
	ErrRecipientNotFound = errors.New("recipient wallet not found")
	ErrSelfTransfer      = errors.New("cannot transfer to the same wallet")
	ErrIntegrity         = errors.New("balance integrity check failed")
)

// Encryptor authenticates and (de)encrypts stored values, binding them to an AAD.
type Encryptor interface {
	Encrypt(plaintext, aad string) (string, error)
	Decrypt(encoded, aad string) (string, error)
}

// InitialCoins configures the one-time allocation on a user's first wallet.
type InitialCoins struct {
	Enabled       bool
	Amount        string
	FundingWallet string
	EmailDomain   string
}

// Service holds wallet business logic.
type Service struct {
	repo         Repository
	enc          Encryptor
	initialCoins InitialCoins
}

// NewService returns a wallet Service.
func NewService(repo Repository, enc Encryptor, initialCoins InitialCoins) *Service {
	return &Service{repo: repo, enc: enc, initialCoins: initialCoins}
}

// ListWallets returns the caller's wallets.
func (s *Service) ListWallets(ctx context.Context, email string) ([]model.Wallet, error) {
	rows, err := s.repo.WalletsByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	wallets := make([]model.Wallet, 0, len(rows))
	for _, w := range rows {
		wallets = append(wallets, model.Wallet{
			Address:       w.Address,
			DefaultWallet: w.DefaultWallet,
			CreatedOn:     w.CreatedOn.UTC().Format(time.RFC3339),
		})
	}
	return wallets, nil
}

// CreateWallet provisions a new wallet for the caller, allocating initial coins when
// it is their first wallet and the policy applies.
func (s *Service) CreateWallet(ctx context.Context, email string) (model.Wallet, error) {
	address, err := newAddress()
	if err != nil {
		return model.Wallet{}, err
	}

	var isDefault bool
	err = s.repo.Tx(ctx, func(q Queries) error {
		// Serialize concurrent creates for this user so exactly one wallet becomes the
		// default and initial coins are granted at most once. When initial coins are
		// enabled every create contends on the shared funding-wallet lock, and the
		// user's wallet count is read under that lock — making first-wallet selection
		// race-free across both the allocation and no-allocation paths.
		var fundingUnits *big.Int
		if s.initialCoins.Enabled {
			fundingUnits, err = s.lockedUnits(ctx, q, s.initialCoins.FundingWallet)
			if err != nil {
				return err
			}
		}
		count, err := q.CountWalletsByEmail(ctx, email)
		if err != nil {
			return err
		}
		isDefault = count == 0

		if isDefault && s.allocationApplies(email) {
			return s.allocateFirstWallet(ctx, q, address, email, fundingUnits)
		}
		encZero, err := s.enc.Encrypt(money.FormatUnits(big.NewInt(0)), balanceAAD(address))
		if err != nil {
			return err
		}
		return q.InsertWallet(ctx, address, email, encZero, isDefault)
	})
	if err != nil {
		return model.Wallet{}, err
	}

	return model.Wallet{Address: address, DefaultWallet: isDefault, CreatedOn: time.Now().UTC().Format(time.RFC3339)}, nil
}

func (s *Service) allocationApplies(email string) bool {
	return s.initialCoins.Enabled &&
		strings.HasSuffix(strings.ToLower(strings.TrimSpace(email)), "@"+strings.ToLower(s.initialCoins.EmailDomain))
}

// allocateFirstWallet inserts the caller's first wallet with the initial coin
// allocation and debits the funding wallet, which the caller has already locked and
// read as fundingUnits.
func (s *Service) allocateFirstWallet(ctx context.Context, q Queries, address, email string, fundingUnits *big.Int) error {
	amount, err := money.ParseUnits(s.initialCoins.Amount)
	if err != nil {
		return fmt.Errorf("parse initial coins amount: %w", err)
	}
	if amount.Sign() <= 0 {
		return fmt.Errorf("initial coins amount must be positive, got %q", s.initialCoins.Amount)
	}
	if fundingUnits.Cmp(amount) < 0 {
		return ErrInsufficientFunds
	}
	ref, err := newReference()
	if err != nil {
		return err
	}
	funding := s.initialCoins.FundingWallet
	encInitial, err := s.enc.Encrypt(money.FormatUnits(amount), balanceAAD(address))
	if err != nil {
		return err
	}
	encAmount, err := s.enc.Encrypt(money.FormatUnits(amount), amountAADForRef(ref))
	if err != nil {
		return err
	}
	encFunding, err := s.enc.Encrypt(money.FormatUnits(new(big.Int).Sub(fundingUnits, amount)), balanceAAD(funding))
	if err != nil {
		return err
	}
	if err := q.InsertWallet(ctx, address, email, encInitial, true); err != nil {
		return err
	}
	if err := q.UpdateBalance(ctx, funding, encFunding); err != nil {
		return err
	}
	return q.InsertTransaction(ctx, TxnInsert{FromAddress: funding, ToAddress: address, Amount: encAmount, Reference: ref, Source: sourceWalletApp})
}

// SetPrimary marks one of the caller's wallets as their default.
func (s *Service) SetPrimary(ctx context.Context, email, address string) error {
	w, err := s.ownedWallet(ctx, email, address)
	if err != nil {
		return err
	}
	return s.repo.SetPrimary(ctx, email, w.Address)
}

// Balance returns the decrypted balance of one of the caller's wallets.
func (s *Service) Balance(ctx context.Context, email, address string) (model.Balance, error) {
	w, err := s.ownedWallet(ctx, email, address)
	if err != nil {
		return model.Balance{}, err
	}
	plain, err := s.decryptBalance(w)
	if err != nil {
		return model.Balance{}, err
	}
	return model.Balance{Address: w.Address, Balance: plain}, nil
}

// Transactions returns a page of the caller's wallet history, newest first.
func (s *Service) Transactions(ctx context.Context, email, address string, limit, offset int, direction string) (model.TransactionPage, error) {
	w, err := s.ownedWallet(ctx, email, address)
	if err != nil {
		return model.TransactionPage{}, err
	}
	rows, err := s.repo.Transactions(ctx, w.Address, limit+1, offset, direction)
	if err != nil {
		return model.TransactionPage{}, err
	}
	hasMore := len(rows) > limit
	if hasMore {
		rows = rows[:limit]
	}

	txns := make([]model.Transaction, 0, len(rows))
	for _, row := range rows {
		amount, err := s.enc.Decrypt(row.Amount, amountAADForRow(row))
		if err != nil {
			return model.TransactionPage{}, ErrIntegrity
		}
		txns = append(txns, model.Transaction{
			TransactionHash: transactionHash(row),
			FromAddress:     row.FromAddress,
			ToAddress:       row.ToAddress,
			Amount:          amount,
			Direction:       directionFor(w.Address, row.FromAddress),
			Timestamp:       transactionTime(row).UTC().Format(time.RFC3339),
		})
	}
	return model.TransactionPage{Transactions: txns, Limit: limit, Offset: offset, HasMore: hasMore}, nil
}

// Transfer moves coins between two wallets atomically and returns the transaction hash.
func (s *Service) Transfer(ctx context.Context, email string, req model.TransferRequest) (model.TransferResponse, error) {
	amount, err := money.ParseUnits(req.Amount)
	if err != nil || amount.Sign() <= 0 {
		return model.TransferResponse{}, ErrInvalidAmount
	}
	if strings.EqualFold(req.FromAddress, req.ToAddress) {
		return model.TransferResponse{}, ErrSelfTransfer
	}
	from, err := s.ownedWallet(ctx, email, req.FromAddress)
	if err != nil {
		return model.TransferResponse{}, err
	}
	to, err := s.repo.WalletByAddress(ctx, req.ToAddress)
	if err != nil {
		return model.TransferResponse{}, err
	}
	if to == nil {
		return model.TransferResponse{}, ErrRecipientNotFound
	}

	ref, err := newReference()
	if err != nil {
		return model.TransferResponse{}, err
	}
	encAmount, err := s.enc.Encrypt(money.FormatUnits(amount), amountAADForRef(ref))
	if err != nil {
		return model.TransferResponse{}, err
	}

	err = s.repo.Tx(ctx, func(q Queries) error {
		balances, err := s.lockBalances(ctx, q, from.Address, to.Address)
		if err != nil {
			return err
		}
		fromUnits, toUnits := balances[from.Address], balances[to.Address]
		if fromUnits.Cmp(amount) < 0 {
			return ErrInsufficientFunds
		}
		encFrom, err := s.enc.Encrypt(money.FormatUnits(new(big.Int).Sub(fromUnits, amount)), balanceAAD(from.Address))
		if err != nil {
			return err
		}
		encTo, err := s.enc.Encrypt(money.FormatUnits(new(big.Int).Add(toUnits, amount)), balanceAAD(to.Address))
		if err != nil {
			return err
		}
		if err := q.UpdateBalance(ctx, from.Address, encFrom); err != nil {
			return err
		}
		if err := q.UpdateBalance(ctx, to.Address, encTo); err != nil {
			return err
		}
		return q.InsertTransaction(ctx, TxnInsert{FromAddress: from.Address, ToAddress: to.Address, Amount: encAmount, Reference: ref, Source: sourceWalletApp})
	})
	if err != nil {
		return model.TransferResponse{}, err
	}
	return model.TransferResponse{TransactionHash: ref}, nil
}

// WalletHealth reports whether the wallet exists and its balance decrypts cleanly.
func (s *Service) WalletHealth(ctx context.Context, email, address string) (model.WalletHealth, error) {
	w, err := s.repo.WalletByAddress(ctx, address)
	if err != nil {
		return model.WalletHealth{}, err
	}
	if w == nil {
		return model.WalletHealth{Healthy: false, Exists: false, BalanceIntact: false}, nil
	}
	if !ownedBy(w, email) {
		return model.WalletHealth{}, ErrForbidden
	}
	_, decErr := s.decryptBalance(w)
	intact := decErr == nil
	return model.WalletHealth{Healthy: intact, Exists: true, BalanceIntact: intact}, nil
}

func (s *Service) ownedWallet(ctx context.Context, email, address string) (*WalletRow, error) {
	w, err := s.repo.WalletByAddress(ctx, address)
	if err != nil {
		return nil, err
	}
	if w == nil {
		return nil, ErrNotFound
	}
	if !ownedBy(w, email) {
		return nil, ErrForbidden
	}
	return w, nil
}

func (s *Service) decryptBalance(w *WalletRow) (string, error) {
	if !w.Balance.Valid {
		return "", ErrIntegrity
	}
	plain, err := s.enc.Decrypt(w.Balance.String, balanceAAD(w.Address))
	if err != nil {
		return "", ErrIntegrity
	}
	return plain, nil
}

func (s *Service) lockedUnits(ctx context.Context, q Queries, address string) (*big.Int, error) {
	enc, err := q.LockBalance(ctx, address)
	if err != nil {
		return nil, err
	}
	plain, err := s.enc.Decrypt(enc, balanceAAD(address))
	if err != nil {
		return nil, ErrIntegrity
	}
	return money.ParseUnits(plain)
}

// lockBalances locks both wallets in a deterministic order (to avoid deadlocks
// between concurrent transfers) and returns their decrypted unit balances keyed by
// address.
func (s *Service) lockBalances(ctx context.Context, q Queries, a, b string) (map[string]*big.Int, error) {
	first, second := a, b
	if strings.ToLower(second) < strings.ToLower(first) {
		first, second = second, first
	}
	balances := make(map[string]*big.Int, 2)
	for _, addr := range []string{first, second} {
		units, err := s.lockedUnits(ctx, q, addr)
		if err != nil {
			return nil, err
		}
		balances[addr] = units
	}
	return balances, nil
}

func ownedBy(w *WalletRow, email string) bool {
	return strings.EqualFold(strings.TrimSpace(w.Email), strings.TrimSpace(email))
}

func directionFor(wallet, from string) model.Direction {
	if strings.EqualFold(wallet, from) {
		return model.DirectionSent
	}
	return model.DirectionReceived
}

func transactionHash(row TxnRow) string {
	if row.Hash.Valid && row.Hash.String != "" {
		return row.Hash.String
	}
	return row.Reference.String
}

func transactionTime(row TxnRow) time.Time {
	if row.BlockTime.Valid {
		return row.BlockTime.Time
	}
	return row.CreatedOn
}

func balanceAAD(address string) string {
	return "o2c:balance:" + strings.ToLower(address)
}

func amountAADForRef(reference string) string {
	return "o2c:amount:ref:" + reference
}

func amountAADForRow(row TxnRow) string {
	if row.Hash.Valid && row.Hash.String != "" {
		return fmt.Sprintf("o2c:amount:%s:%d", strings.ToLower(row.Hash.String), row.LogIndex.Int64)
	}
	return amountAADForRef(row.Reference.String)
}

func newReference() (string, error) {
	return randomHex(32)
}

func newAddress() (string, error) {
	return randomHex(20)
}

func randomHex(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generate random bytes: %w", err)
	}
	return "0x" + hex.EncodeToString(b), nil
}
