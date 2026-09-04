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

// Balance is a wallet's current balance.
type Balance struct {
	WalletAddress string `json:"walletAddress"`
	Balance       string `json:"balance"`
}

// TransferRequest is the body of a transfer from the caller's master wallet.
type TransferRequest struct {
	ToAddress string `json:"toAddress"`
	Amount    string `json:"amount"`
}

// TransferResponse is returned after a successful transfer.
type TransferResponse struct {
	Reference   string `json:"reference"`
	FromAddress string `json:"fromAddress"`
	ToAddress   string `json:"toAddress"`
	Amount      string `json:"amount"`
}

// Transaction is one recorded transfer.
type Transaction struct {
	Reference   string `json:"reference"`
	FromAddress string `json:"fromAddress"`
	ToAddress   string `json:"toAddress"`
	Amount      string `json:"amount"`
	Timestamp   string `json:"timestamp"`
}

// TransactionSearchRequest is the body of a transaction search. Every field is
// optional; supplied fields are combined with AND.
type TransactionSearchRequest struct {
	FromAddresses []string `json:"fromAddresses"`
	ToAddresses   []string `json:"toAddresses"`
	Reference     string   `json:"reference"`
	DateFrom      string   `json:"dateFrom"`
	DateTo        string   `json:"dateTo"`
	Limit         int      `json:"limit"`
	Offset        int      `json:"offset"`
}

// TransactionPage is a paginated slice of transactions.
type TransactionPage struct {
	Transactions []Transaction `json:"transactions"`
	Total        int           `json:"total"`
	Limit        int           `json:"limit"`
	Offset       int           `json:"offset"`
	Next         *string       `json:"next"`
	Previous     *string       `json:"previous"`
}
