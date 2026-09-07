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
	"fmt"
	"strings"
	"time"

	"github.com/go-sql-driver/mysql"
)

// mysqlDuplicateEntry is the MySQL server error number for a unique-key violation.
const mysqlDuplicateEntry = 1062

// ErrNoMasterWallet is returned when a client has no active master wallet mapping.
// The service maps it to a forbidden response.
var ErrNoMasterWallet = errors.New("no master wallet mapping for client")

// ErrDuplicateReference is returned when inserting a transaction whose reference
// already exists (the uq_reference unique index). The service uses it to drive
// idempotent replay and conflict detection.
var ErrDuplicateReference = errors.New("duplicate transaction reference")

// WalletRow is a persisted wallet balance.
type WalletRow struct {
	Address string
	Balance sql.NullString
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

// WalletSummaryRow is a row of the wallet listing.
type WalletSummaryRow struct {
	Address       string
	DefaultWallet bool
	CreatedOn     time.Time
}

// TxnInsert is a new transaction to persist.
type TxnInsert struct {
	FromAddress string
	ToAddress   string
	Amount      string
	Reference   string
	Source      string
}

// SearchFilters constrains a transaction search. Every field is optional; the
// non-empty ones are combined with AND.
type SearchFilters struct {
	FromAddresses []string
	ToAddresses   []string
	Reference     string
	DateFrom      string
	DateTo        string
	Limit         int
	Offset        int
}

// Queries is the set of reads and writes available inside a database transaction.
type Queries interface {
	LockBalance(ctx context.Context, address string) (string, error)
	UpdateBalance(ctx context.Context, address, encBalance string) error
	InsertTransaction(ctx context.Context, t TxnInsert) error
}

// Repository is the transaction persistence contract.
type Repository interface {
	MasterWalletByClient(ctx context.Context, clientID string) (string, error)
	WalletByAddress(ctx context.Context, address string) (*WalletRow, error)
	WalletOwnedBy(ctx context.Context, address, email string) (bool, error)
	ListWallets(ctx context.Context) ([]WalletSummaryRow, error)
	ListWalletAddresses(ctx context.Context) ([]string, error)
	SearchTransactions(ctx context.Context, f SearchFilters) ([]TxnRow, int, error)
	TransactionByReference(ctx context.Context, reference string) (*TxnRow, error)
	Tx(ctx context.Context, fn func(Queries) error) error
}

type mysqlRepository struct {
	db *sql.DB
}

// NewRepository returns a MySQL-backed Repository.
func NewRepository(db *sql.DB) Repository {
	return &mysqlRepository{db: db}
}

func (r *mysqlRepository) MasterWalletByClient(ctx context.Context, clientID string) (string, error) {
	const q = `SELECT wallet_address FROM client_master_wallet WHERE client_id = ? AND is_active = TRUE`
	var address string
	err := r.db.QueryRowContext(ctx, q, clientID).Scan(&address)
	if errors.Is(err, sql.ErrNoRows) {
		return "", ErrNoMasterWallet
	}
	if err != nil {
		return "", fmt.Errorf("query master wallet: %w", err)
	}
	return address, nil
}

func (r *mysqlRepository) WalletByAddress(ctx context.Context, address string) (*WalletRow, error) {
	const q = `SELECT wallet_address, total_balance FROM user_wallet WHERE wallet_address = ?`
	var wr WalletRow
	err := r.db.QueryRowContext(ctx, q, address).Scan(&wr.Address, &wr.Balance)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("query wallet: %w", err)
	}
	return &wr, nil
}

// WalletOwnedBy reports whether the wallet at address belongs to the given user
// email. A missing or not-owned wallet both return false without distinction, so the
// caller cannot enumerate wallets it does not own.
func (r *mysqlRepository) WalletOwnedBy(ctx context.Context, address, email string) (bool, error) {
	const q = `SELECT 1 FROM user_wallet WHERE wallet_address = ? AND user_email = ? LIMIT 1`
	var one int
	err := r.db.QueryRowContext(ctx, q, address, email).Scan(&one)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("query wallet ownership: %w", err)
	}
	return true, nil
}

func (r *mysqlRepository) ListWallets(ctx context.Context) ([]WalletSummaryRow, error) {
	const q = `SELECT wallet_address, default_wallet, created_on FROM user_wallet ORDER BY created_on DESC`
	rows, err := r.db.QueryContext(ctx, q)
	if err != nil {
		return nil, fmt.Errorf("query wallets: %w", err)
	}
	defer rows.Close()

	var wallets []WalletSummaryRow
	for rows.Next() {
		var wr WalletSummaryRow
		var defaultWallet sql.NullBool
		var createdOn sql.NullTime
		if err := rows.Scan(&wr.Address, &defaultWallet, &createdOn); err != nil {
			return nil, fmt.Errorf("scan wallet: %w", err)
		}
		wr.DefaultWallet = defaultWallet.Bool
		wr.CreatedOn = createdOn.Time
		wallets = append(wallets, wr)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate wallets: %w", err)
	}
	return wallets, nil
}

func (r *mysqlRepository) ListWalletAddresses(ctx context.Context) ([]string, error) {
	const q = `SELECT DISTINCT wallet_address FROM user_wallet ORDER BY wallet_address`
	rows, err := r.db.QueryContext(ctx, q)
	if err != nil {
		return nil, fmt.Errorf("query wallet addresses: %w", err)
	}
	defer rows.Close()

	var addresses []string
	for rows.Next() {
		var address string
		if err := rows.Scan(&address); err != nil {
			return nil, fmt.Errorf("scan wallet address: %w", err)
		}
		addresses = append(addresses, address)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate wallet addresses: %w", err)
	}
	return addresses, nil
}

const txnColumns = "tx_hash, reference, from_address, to_address, amount, tx_log_index, tx_block_timestamp, created_on"

func (r *mysqlRepository) SearchTransactions(ctx context.Context, f SearchFilters) ([]TxnRow, int, error) {
	where, args := buildWhere(f)

	var total int
	// #nosec G202 -- where is assembled only from constant fragments and bound "?"
	// placeholders; all user-supplied values are passed as query parameters in args.
	countQuery := "SELECT COUNT(*) FROM `transaction`" + where
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count transactions: %w", err)
	}

	// #nosec G202 -- see the note above; the interpolated fragments are constants.
	pageQuery := "SELECT " + txnColumns + " FROM `transaction`" + where +
		" ORDER BY COALESCE(tx_block_timestamp, created_on) DESC, id DESC LIMIT ? OFFSET ?"
	pageArgs := make([]any, 0, len(args)+2)
	pageArgs = append(pageArgs, args...)
	pageArgs = append(pageArgs, f.Limit, f.Offset)

	rows, err := r.db.QueryContext(ctx, pageQuery, pageArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("query transactions: %w", err)
	}
	defer rows.Close()

	txns := make([]TxnRow, 0, f.Limit)
	for rows.Next() {
		t, err := scanTxn(rows)
		if err != nil {
			return nil, 0, err
		}
		txns = append(txns, t)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate transactions: %w", err)
	}
	return txns, total, nil
}

func (r *mysqlRepository) TransactionByReference(ctx context.Context, reference string) (*TxnRow, error) {
	// #nosec G202 -- txnColumns is a compile-time constant; reference is bound as a parameter.
	const q = "SELECT " + txnColumns + " FROM `transaction` WHERE reference = ? LIMIT 1"
	rows, err := r.db.QueryContext(ctx, q, reference)
	if err != nil {
		return nil, fmt.Errorf("query transaction: %w", err)
	}
	defer rows.Close()

	if !rows.Next() {
		if err := rows.Err(); err != nil {
			return nil, fmt.Errorf("query transaction: %w", err)
		}
		return nil, nil
	}
	t, err := scanTxn(rows)
	if err != nil {
		return nil, err
	}
	return &t, nil
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

// buildWhere assembles the shared WHERE clause for search and count. It only ever
// interpolates constant column names and "?" placeholders; every user-supplied value
// is returned in args to be bound as a query parameter.
func buildWhere(f SearchFilters) (string, []any) {
	var clauses []string
	var args []any

	if len(f.FromAddresses) > 0 {
		clauses = append(clauses, "from_address IN ("+placeholders(len(f.FromAddresses))+")")
		for _, a := range f.FromAddresses {
			args = append(args, a)
		}
	}
	if len(f.ToAddresses) > 0 {
		clauses = append(clauses, "to_address IN ("+placeholders(len(f.ToAddresses))+")")
		for _, a := range f.ToAddresses {
			args = append(args, a)
		}
	}
	if f.Reference != "" {
		clauses = append(clauses, "reference = ?")
		args = append(args, f.Reference)
	}
	if f.DateFrom != "" {
		clauses = append(clauses, "created_on >= ?")
		args = append(args, f.DateFrom)
	}
	if f.DateTo != "" {
		clauses = append(clauses, "created_on <= ?")
		args = append(args, f.DateTo)
	}

	if len(clauses) == 0 {
		return "", nil
	}
	return " WHERE " + strings.Join(clauses, " AND "), args
}

func placeholders(n int) string {
	return strings.TrimSuffix(strings.Repeat("?,", n), ",")
}

func scanTxn(rows *sql.Rows) (TxnRow, error) {
	var t TxnRow
	if err := rows.Scan(&t.Hash, &t.Reference, &t.FromAddress, &t.ToAddress, &t.Amount, &t.LogIndex, &t.BlockTime, &t.CreatedOn); err != nil {
		return TxnRow{}, fmt.Errorf("scan transaction: %w", err)
	}
	return t, nil
}

type txQueries struct {
	tx *sql.Tx
}

func (q *txQueries) LockBalance(ctx context.Context, address string) (string, error) {
	var bal sql.NullString
	err := q.tx.QueryRowContext(ctx,
		"SELECT total_balance FROM user_wallet WHERE wallet_address = ? FOR UPDATE", address).Scan(&bal)
	if errors.Is(err, sql.ErrNoRows) {
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

func (q *txQueries) UpdateBalance(ctx context.Context, address, encBalance string) error {
	if _, err := q.tx.ExecContext(ctx,
		"UPDATE user_wallet SET total_balance = ? WHERE wallet_address = ?", encBalance, address); err != nil {
		return fmt.Errorf("update balance: %w", err)
	}
	return nil
}

func (q *txQueries) InsertTransaction(ctx context.Context, t TxnInsert) error {
	const stmt = "INSERT INTO `transaction` (from_address, to_address, amount, reference, source) VALUES (?, ?, ?, ?, ?)"
	if _, err := q.tx.ExecContext(ctx, stmt, t.FromAddress, t.ToAddress, t.Amount, t.Reference, t.Source); err != nil {
		var mysqlErr *mysql.MySQLError
		if errors.As(err, &mysqlErr) && mysqlErr.Number == mysqlDuplicateEntry {
			return ErrDuplicateReference
		}
		return fmt.Errorf("insert transaction: %w", err)
	}
	return nil
}
