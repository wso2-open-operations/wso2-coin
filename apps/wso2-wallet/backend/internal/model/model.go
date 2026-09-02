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

// Package model holds the API request and response types.
package model

// Direction classifies a transaction relative to the wallet viewing it.
type Direction string

const (
	// DirectionSent means the wallet is the sender.
	DirectionSent Direction = "sent"
	// DirectionReceived means the wallet is the recipient.
	DirectionReceived Direction = "received"
)

// Wallet is a wallet owned by the caller.
type Wallet struct {
	Address       string `json:"address"`
	DefaultWallet bool   `json:"defaultWallet"`
	CreatedOn     string `json:"createdOn"`
}

// Balance is a wallet's current balance.
type Balance struct {
	Address string `json:"address"`
	Balance string `json:"balance"`
}

// Transaction is one entry in a wallet's history.
type Transaction struct {
	TransactionHash string    `json:"transactionHash"`
	FromAddress     string    `json:"fromAddress"`
	ToAddress       string    `json:"toAddress"`
	Amount          string    `json:"amount"`
	Direction       Direction `json:"direction"`
	Timestamp       string    `json:"timestamp"`
}

// TransactionPage is a paginated slice of transactions.
type TransactionPage struct {
	Transactions []Transaction `json:"transactions"`
	Limit        int           `json:"limit"`
	Offset       int           `json:"offset"`
	HasMore      bool          `json:"hasMore"`
}

// TransferRequest is the body of a transfer.
type TransferRequest struct {
	FromAddress string `json:"fromAddress"`
	ToAddress   string `json:"toAddress"`
	Amount      string `json:"amount"`
}

// TransferResponse is returned after a successful transfer.
type TransferResponse struct {
	TransactionHash string `json:"transactionHash"`
}

// WalletHealth reports service and wallet integrity for a wallet.
type WalletHealth struct {
	Healthy       bool `json:"healthy"`
	Exists        bool `json:"exists"`
	BalanceIntact bool `json:"balanceIntact"`
}
