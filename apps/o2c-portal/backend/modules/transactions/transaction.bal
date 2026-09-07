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
import ballerina/http;
import ballerina/time;

# Search transactions from the transaction service.
#
# + request - Transaction search filters
# + return - Transaction search response or error
public isolated function searchTransactions(TransactionSearchRequest request) returns TransactionSearchResponse|error {
    // Validate time range if both provided
    string? startTime = request.startTime;
    string? endTime = request.endTime;
    if startTime is string && endTime is string {
        time:Utc|error startUtc = time:utcFromString(startTime);
        time:Utc|error endUtc = time:utcFromString(endTime);
        if startUtc is error {
            return error("Invalid startTime format. Use ISO-8601 (e.g. 2026-01-01T00:00:00Z)");
        }
        if endUtc is error {
            return error("Invalid endTime format. Use ISO-8601 (e.g. 2026-01-01T00:00:00Z)");
        }
        if time:utcDiffSeconds(endUtc, startUtc) < 0d {
            return error("startTime must be before endTime");
        }
    }

    // Build the service request, including only the fields that are set
    TransactionServiceRequest serviceRequest = {};

    string? fromAddress = request.fromAddress;
    if fromAddress is string {
        serviceRequest.fromAddresses = [fromAddress];
    }

    string? toAddress = request.toAddress;
    if toAddress is string {
        serviceRequest.toAddresses = [toAddress];
    }

    string? reference = request.reference;
    if reference is string {
        serviceRequest.reference = reference;
    }

    if startTime is string {
        serviceRequest.dateFrom = startTime;
    }

    if endTime is string {
        serviceRequest.dateTo = endTime;
    }

    int? searchLimit = request.'limit;
    if searchLimit is int {
        serviceRequest.'limit = searchLimit;
    }

    int? searchOffset = request.offset;
    if searchOffset is int {
        serviceRequest.offset = searchOffset;
    }

    http:Response response = check transactionClient->post("/transactions/search", serviceRequest);

    if response.statusCode != http:STATUS_OK {
        return error(string `Transaction service returned status ${response.statusCode}`);
    }

    json responseJson = check response.getJsonPayload();
    TransactionServiceResponse serviceResponse = check responseJson.fromJsonWithType();

    return {
        total: serviceResponse.total,
        offset: serviceResponse.offset,
        'limit: serviceResponse.'limit,
        transactions: serviceResponse.transactions
    };
}

# Fetch token balance for a single wallet address.
#
# + walletAddress - Wallet address to check balance for
# + return - WalletBalance or error
public isolated function fetchWalletBalance(string walletAddress) returns WalletBalance|error {
    if !WALLET_ADDRESS_REGEX.isFullMatch(walletAddress) {
        return error("Invalid wallet address format");
    }

    http:Response response = check transactionClient->/wallets/[walletAddress]/balance.get();

    if response.statusCode != http:STATUS_OK {
        return error(string `Transaction service returned status ${response.statusCode}`);
    }

    json responseJson = check response.getJsonPayload();
    BalanceServiceResponse balanceResponse = check responseJson.fromJsonWithType();

    return {
        walletAddress: walletAddress,
        balance: balanceResponse.balance
    };
}

# Fetch all wallets from the transaction service.
#
# + return - Array of wallet details or error
public isolated function fetchAllWallets() returns WalletDetail[]|error {
    http:Response response = check transactionClient->/wallets.get();

    if response.statusCode != http:STATUS_OK {
        return error(string `Transaction service returned status ${response.statusCode}`);
    }

    json responseJson = check response.getJsonPayload();
    WalletDetail[] wallets = check responseJson.fromJsonWithType();

    return wallets;
}

# Fetch all wallet addresses from the transaction service.
#
# + return - Array of wallet addresses or error
public isolated function fetchWalletAddresses() returns string[]|error {
    http:Response response = check transactionClient->/wallets/addresses.get();

    if response.statusCode != http:STATUS_OK {
        return error(string `Transaction service returned status ${response.statusCode}`);
    }

    json responseJson = check response.getJsonPayload();
    string[] addresses = check responseJson.fromJsonWithType();

    return addresses;
}
