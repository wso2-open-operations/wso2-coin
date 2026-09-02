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

package wallet

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

// WalletRow is a persisted wallet.
type WalletRow struct {
	Address       string
	Email         string
	DefaultWallet bool
	CreatedOn     time.Time
	Balance       sql.NullString
}

// TxnRow is a persisted transaction as read from storage.
type TxnRow struct {
	Hash        sql.NullString
	Reference   sql.NullString
	FromAddress string
	ToAddress   string
	Amount      string
	LogIndex    sql.NullInt64
	BlockTime   sql.NullTime
	CreatedOn   time.Time
}

// TxnInsert is a new transaction to persist.
type TxnInsert struct {
	FromAddress string
	ToAddress   string
	Amount      string
	Reference   string
}

// Queries is the set of reads and writes available inside a database transaction.
type Queries interface {
	LockBalance(ctx context.Context, address string) (string, error)
	CountWalletsByEmail(ctx context.Context, email string) (int, error)
	UpdateBalance(ctx context.Context, address, encBalance string) error
	InsertWallet(ctx context.Context, address, email, encBalance string, isDefault bool) error
	InsertTransaction(ctx context.Context, t TxnInsert) error
}

// Repository is the wallet persistence contract.
type Repository interface {
	WalletsByEmail(ctx context.Context, email string) ([]WalletRow, error)
	WalletByAddress(ctx context.Context, address string) (*WalletRow, error)
	CountWalletsByEmail(ctx context.Context, email string) (int, error)
	SetPrimary(ctx context.Context, email, address string) error
	Transactions(ctx context.Context, address string, limit, offset int, direction string) ([]TxnRow, error)
	Tx(ctx context.Context, fn func(Queries) error) error
}

type mysqlRepository struct {
	db *sql.DB
}

// NewRepository returns a MySQL-backed Repository.
func NewRepository(db *sql.DB) Repository {
	return &mysqlRepository{db: db}
}

func (r *mysqlRepository) WalletsByEmail(ctx context.Context, email string) ([]WalletRow, error) {
	const q = `SELECT wallet_address, default_wallet, created_on
		FROM user_wallet WHERE user_email = ?
		ORDER BY default_wallet DESC, created_on DESC`
	rows, err := r.db.QueryContext(ctx, q, email)
	if err != nil {
		return nil, fmt.Errorf("query wallets: %w", err)
	}
	defer rows.Close()

	var wallets []WalletRow
	for rows.Next() {
		var wr WalletRow
		if err := rows.Scan(&wr.Address, &wr.DefaultWallet, &wr.CreatedOn); err != nil {
			return nil, fmt.Errorf("scan wallet: %w", err)
		}
		wr.Email = email
		wallets = append(wallets, wr)
	}
	return wallets, rows.Err()
}

func (r *mysqlRepository) WalletByAddress(ctx context.Context, address string) (*WalletRow, error) {
	const q = `SELECT wallet_address, user_email, default_wallet, created_on, total_balance
		FROM user_wallet WHERE wallet_address = ?`
	var wr WalletRow
	err := r.db.QueryRowContext(ctx, q, address).
		Scan(&wr.Address, &wr.Email, &wr.DefaultWallet, &wr.CreatedOn, &wr.Balance)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("query wallet: %w", err)
	}
	return &wr, nil
}

func (r *mysqlRepository) CountWalletsByEmail(ctx context.Context, email string) (int, error) {
	var n int
	err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM user_wallet WHERE user_email = ?", email).Scan(&n)
	if err != nil {
		return 0, fmt.Errorf("count wallets: %w", err)
	}
	return n, nil
}

func (r *mysqlRepository) SetPrimary(ctx context.Context, email, address string) error {
	const q = `UPDATE user_wallet SET default_wallet = (wallet_address = ?) WHERE user_email = ?`
	if _, err := r.db.ExecContext(ctx, q, address, email); err != nil {
		return fmt.Errorf("set primary wallet: %w", err)
	}
	return nil
}

func (r *mysqlRepository) Transactions(ctx context.Context, address string, limit, offset int, direction string) ([]TxnRow, error) {
	where := "from_address = ? OR to_address = ?"
	args := []any{address, address}
	switch direction {
	case "sent":
		where, args = "from_address = ?", []any{address}
	case "received":
		where, args = "to_address = ?", []any{address}
	}
	q := fmt.Sprintf(`SELECT tx_hash, reference, from_address, to_address, amount, tx_log_index, tx_block_timestamp, created_on
		FROM `+"`transaction`"+` WHERE %s
		ORDER BY COALESCE(tx_block_timestamp, created_on) DESC, id DESC
		LIMIT ? OFFSET ?`, where)
	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("query transactions: %w", err)
	}
	defer rows.Close()

	var txns []TxnRow
	for rows.Next() {
		var t TxnRow
		if err := rows.Scan(&t.Hash, &t.Reference, &t.FromAddress, &t.ToAddress, &t.Amount, &t.LogIndex, &t.BlockTime, &t.CreatedOn); err != nil {
			return nil, fmt.Errorf("scan transaction: %w", err)
		}
		txns = append(txns, t)
	}
	return txns, rows.Err()
}

func (r *mysqlRepository) Tx(ctx context.Context, fn func(Queries) error) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	if err := fn(&txQueries{tx: tx}); err != nil {
		return err
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}
	return nil
}

type txQueries struct {
	tx *sql.Tx
}

func (q *txQueries) LockBalance(ctx context.Context, address string) (string, error) {
	var bal sql.NullString
	err := q.tx.QueryRowContext(ctx,
		"SELECT total_balance FROM user_wallet WHERE wallet_address = ? FOR UPDATE", address).Scan(&bal)
	if err == sql.ErrNoRows {
		return "", fmt.Errorf("wallet %s not found", address)
	}
	if err != nil {
		return "", fmt.Errorf("lock balance: %w", err)
	}
	if !bal.Valid {
		return "", fmt.Errorf("wallet %s has no balance", address)
	}
	return bal.String, nil
}

func (q *txQueries) CountWalletsByEmail(ctx context.Context, email string) (int, error) {
	var n int
	err := q.tx.QueryRowContext(ctx,
		"SELECT COUNT(*) FROM user_wallet WHERE user_email = ?", email).Scan(&n)
	if err != nil {
		return 0, fmt.Errorf("count wallets: %w", err)
	}
	return n, nil
}

func (q *txQueries) UpdateBalance(ctx context.Context, address, encBalance string) error {
	if _, err := q.tx.ExecContext(ctx,
		"UPDATE user_wallet SET total_balance = ? WHERE wallet_address = ?", encBalance, address); err != nil {
		return fmt.Errorf("update balance: %w", err)
	}
	return nil
}

func (q *txQueries) InsertWallet(ctx context.Context, address, email, encBalance string, isDefault bool) error {
	if _, err := q.tx.ExecContext(ctx,
		"INSERT INTO user_wallet (wallet_address, user_email, default_wallet, total_balance) VALUES (?, ?, ?, ?)",
		address, email, isDefault, encBalance); err != nil {
		return fmt.Errorf("insert wallet: %w", err)
	}
	return nil
}

func (q *txQueries) InsertTransaction(ctx context.Context, t TxnInsert) error {
	const stmt = "INSERT INTO `transaction` (from_address, to_address, amount, reference) VALUES (?, ?, ?, ?)"
	if _, err := q.tx.ExecContext(ctx, stmt, t.FromAddress, t.ToAddress, t.Amount, t.Reference); err != nil {
		return fmt.Errorf("insert transaction: %w", err)
	}
	return nil
}
