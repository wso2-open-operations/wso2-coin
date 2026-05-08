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

    // Build the service request
    TransactionServiceRequest serviceRequest = {
        transactionHash: request.transactionHash,
        startTime: request.startTime,
        endTime: request.endTime,
        'limit: request.'limit,
        offset: request.offset
    };

    // Set sender address filter
    string? senderAddress = request.senderAddress;
    if senderAddress is string {
        serviceRequest.senderAddresses = [senderAddress];
    }

    // Set receiver address filter
    string? receiverAddress = request.receiverAddress;
    if receiverAddress is string {
        serviceRequest.receiverAddresses = [receiverAddress];
    }

    http:Response response = check transactionClient->post("/api/v1/blockchain/transactions/search", serviceRequest);

    if response.statusCode != http:STATUS_OK {
        return error(string `Transaction service returned status ${response.statusCode}`);
    }

    json responseJson = check response.getJsonPayload();
    TransactionServiceEnvelope envelope = check responseJson.fromJsonWithType();

    return {
        hasMore: envelope.payload.hasMore,
        offset: envelope.payload.offset,
        'limit: envelope.payload.'limit,
        transactions: envelope.payload.transactions
    };
}

# Fetch token balance for a single wallet address.
#
# + walletAddress - Wallet address to check balance for
# + return - WalletBalance or error
public isolated function fetchWalletBalance(string walletAddress) returns WalletBalance|error {
    if !ETH_ADDRESS_REGEX.isFullMatch(walletAddress) {
        return error("Invalid wallet address format");
    }

    http:Response response = check transactionClient->/api/v1/blockchain/get\-balance/[walletAddress].get();

    if response.statusCode != http:STATUS_OK {
        return error(string `Transaction service returned status ${response.statusCode}`);
    }

    json responseJson = check response.getJsonPayload();
    BalanceServiceEnvelope envelope = check responseJson.fromJsonWithType();

    return {
        walletAddress: walletAddress,
        balance: envelope.payload.balance
    };
}
