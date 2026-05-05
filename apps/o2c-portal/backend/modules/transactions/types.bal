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

# Ethereum address pattern: 0x followed by 40 hex characters.
final string:RegExp ETH_ADDRESS_REGEX = re `^0x[0-9a-fA-F]{40}$`;

# Transaction hash pattern: 0x followed by 64 hex characters.
final string:RegExp TX_HASH_REGEX = re `^0x[0-9a-fA-F]{64}$`;

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
            value: ETH_ADDRESS_REGEX,
            message: "Invalid sender address. Must be a valid Ethereum address (0x followed by 40 hex characters)"
        }
    }
    string senderAddress?;
    # Receiver wallet address
    @constraint:String {
        pattern: {
            value: ETH_ADDRESS_REGEX,
            message: "Invalid receiver address. Must be a valid Ethereum address (0x followed by 40 hex characters)"
        }
    }
    string receiverAddress?;
    # Transaction hash
    @constraint:String {
        pattern: {
            value: TX_HASH_REGEX,
            message: "Invalid transaction hash. Must start with 0x followed by 64 hex characters"
        }
    }
    string transactionHash?;
    # Sender email (resolved to wallet addresses server-side)
    string senderEmail?;
    # Receiver email (resolved to wallet addresses server-side)
    string receiverEmail?;
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

# A single blockchain transaction.
public type Transaction record {|
    # Transaction hash
    string txHash;
    # Block number
    int blockNumber;
    # Sender wallet address
    string senderAddress;
    # Receiver wallet address
    string receiverAddress;
    # Human-readable amount
    string amount;
    # Raw unformatted amount
    string amountRaw;
    # Transaction timestamp (ISO-8601)
    string timestamp;
|};

# A transaction enriched with wallet email info.
public type EnrichedTransaction record {|
    *Transaction;
    # Sender email (if found in wallet DB)
    string? senderEmail = ();
    # Whether sender wallet is the default wallet
    boolean? senderDefaultWallet = ();
    # Receiver email (if found in wallet DB)
    string? receiverEmail = ();
    # Whether receiver wallet is the default wallet
    boolean? receiverDefaultWallet = ();
|};

# Payload returned from a transaction search.
public type TransactionSearchResponse record {|
    # Whether more results are available
    boolean hasMore;
    # Current offset
    int offset;
    # Current limit
    int 'limit;
    # Array of enriched transactions
    EnrichedTransaction[] transactions;
|};

# Internal request payload sent to the transaction service (arrays for addresses).
type TransactionServiceRequest record {
    # Sender wallet addresses
    string[] senderAddresses?;
    # Receiver wallet addresses
    string[] receiverAddresses?;
    # Transaction hash
    string transactionHash?;
    # Start time filter (ISO-8601)
    string startTime?;
    # End time filter (ISO-8601)
    string endTime?;
    # Number of records to fetch
    int 'limit?;
    # Offset for pagination
    int offset?;
};

# Full response envelope from the transaction service.
type TransactionServiceEnvelope record {|
    # Response message
    string message;
    # HTTP status code
    int httpCode;
    # Response payload
    record {|
        # Whether more results are available
        boolean hasMore;
        # Current offset
        int offset;
        # Current limit
        int 'limit;
        # Array of raw transactions
        Transaction[] transactions;
    |} payload;
|};
