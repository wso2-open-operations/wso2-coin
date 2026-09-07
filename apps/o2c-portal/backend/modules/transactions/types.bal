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
import ballerina/constraint;

# Wallet address pattern: 0x followed by 40 hex characters.
final string:RegExp WALLET_ADDRESS_REGEX = re `^0x[0-9a-fA-F]{40}$`;

# Reference pattern: 0x followed by 64 hex characters.
final string:RegExp REFERENCE_REGEX = re `^0x[0-9a-fA-F]{64}$`;

# OAuth2 client auth configurations.
public type ClientAuthConfig record {|
    # Token URL
    string tokenUrl;
    # Client Id
    string clientId;
    # Client Secret
    string clientSecret;
|};

# Retry config for the HTTP client.
public type RetryConfig record {|
    # Retry count
    int count = RETRY_COUNT;
    # Retry interval in seconds
    decimal interval = RETRY_INTERVAL;
    # Retry backoff factor
    float backOffFactor = RETRY_BACKOFF_FACTOR;
    # Retry max wait interval in seconds
    decimal maxWaitInterval = RETRY_MAX_INTERVAL;
|};

# Transaction search request payload.
public type TransactionSearchRequest record {
    # Sender wallet address
    @constraint:String {
        pattern: {
            value: WALLET_ADDRESS_REGEX,
            message: "Invalid fromAddress. Must be a valid wallet address (0x followed by 40 hex characters)"
        }
    }
    string fromAddress?;
    # Receiver wallet address
    @constraint:String {
        pattern: {
            value: WALLET_ADDRESS_REGEX,
            message: "Invalid toAddress. Must be a valid wallet address (0x followed by 40 hex characters)"
        }
    }
    string toAddress?;
    # Transaction reference
    @constraint:String {
        pattern: {
            value: REFERENCE_REGEX,
            message: "Invalid reference. Must start with 0x followed by 64 hex characters"
        }
    }
    string reference?;
    # Start time filter (ISO-8601)
    string startTime?;
    # End time filter (ISO-8601)
    string endTime?;
    # Number of records to fetch
    @constraint:Int {
        minValue: 1,
        maxValue: 100
    }
    int 'limit?;
    # Offset for pagination
    @constraint:Int {
        minValue: 0
    }
    int offset?;
};

# A single transaction record.
public type Transaction record {|
    # Transaction reference
    string reference;
    # Sender wallet address
    string fromAddress;
    # Receiver wallet address
    string toAddress;
    # Human-readable amount
    string amount;
    # Transaction timestamp (ISO-8601)
    string timestamp;
    json...;
|};

# Payload returned from a transaction search.
public type TransactionSearchResponse record {|
    # Total number of matching transactions
    int total;
    # Current offset
    int offset;
    # Current limit
    int 'limit;
    # Array of transactions
    Transaction[] transactions;
|};

# Internal request payload sent to the transaction service (arrays for addresses).
type TransactionServiceRequest record {|
    # Sender wallet addresses
    string[] fromAddresses?;
    # Receiver wallet addresses
    string[] toAddresses?;
    # Transaction reference
    string reference?;
    # Start date filter (ISO-8601)
    string dateFrom?;
    # End date filter (ISO-8601)
    string dateTo?;
    # Number of records to fetch
    int 'limit?;
    # Offset for pagination
    int offset?;
|};

# Response payload returned by the transaction service search endpoint.
type TransactionServiceResponse record {|
    # Matching transactions
    Transaction[] transactions;
    # Total number of matching transactions
    int total;
    # Applied result limit
    int 'limit;
    # Applied result offset
    int offset;
    json...;
|};

# Wallet detail returned by the transaction service.
public type WalletDetail record {|
    # Wallet address
    string walletAddress;
    # Whether this is the default wallet
    boolean defaultWallet;
    # Created timestamp (RFC3339)
    string createdOn;
    json...;
|};

# Wallet balance result.
public type WalletBalance record {|
    # Wallet address
    string walletAddress;
    # Human-readable token balance
    string balance;
|};

# Balance response payload returned by the transaction service.
type BalanceServiceResponse record {|
    # Wallet address
    string walletAddress;
    # Human-readable balance
    string balance;
    json...;
|};
