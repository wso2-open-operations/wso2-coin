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

import o2c_portal.database;

# Search transactions and enrich results with wallet email info.
#
# + request - Transaction search filters
# + return - Enriched transaction search response or error
public isolated function searchTransactions(TransactionSearchRequest request) returns TransactionSearchResponse|error {
    // Build the service request, resolving emails to wallet addresses
    TransactionServiceRequest serviceRequest = {
        transactionHash: request.transactionHash,
        startTime: request.startTime,
        endTime: request.endTime,
        'limit: request.'limit,
        offset: request.offset
    };

    // Resolve sender address(es)
    string? senderAddress = request.senderAddress;
    string? senderEmail = request.senderEmail;
    if senderEmail is string {
        string[] addresses = check database:fetchWalletAddressesByEmail(senderEmail);
        if addresses.length() == 0 {
            return {hasMore: false, offset: request.offset ?: 0, 'limit: request.'limit ?: 10, transactions: []};
        }
        serviceRequest.senderAddresses = addresses;
    } else if senderAddress is string {
        serviceRequest.senderAddresses = [senderAddress];
    }

    // Resolve receiver address(es)
    string? receiverAddress = request.receiverAddress;
    string? receiverEmail = request.receiverEmail;
    if receiverEmail is string {
        string[] addresses = check database:fetchWalletAddressesByEmail(receiverEmail);
        if addresses.length() == 0 {
            return {hasMore: false, offset: request.offset ?: 0, 'limit: request.'limit ?: 10, transactions: []};
        }
        serviceRequest.receiverAddresses = addresses;
    } else if receiverAddress is string {
        serviceRequest.receiverAddresses = [receiverAddress];
    }

    http:Response response = check transactionClient->post("/api/v1/blockchain/transactions/search", serviceRequest);

    if response.statusCode != http:STATUS_OK {
        return error(string `Transaction service returned status ${response.statusCode}`);
    }

    json responseJson = check response.getJsonPayload();
    TransactionServiceEnvelope envelope = check responseJson.fromJsonWithType();

    // Collect unique addresses and batch-lookup email info
    string[] uniqueAddresses = [];
    foreach Transaction tx in envelope.payload.transactions {
        if uniqueAddresses.indexOf(tx.senderAddress) is () {
            uniqueAddresses.push(tx.senderAddress);
        }
        if uniqueAddresses.indexOf(tx.receiverAddress) is () {
            uniqueAddresses.push(tx.receiverAddress);
        }
    }

    map<database:WalletUserRecord> addressInfoMap = {};
    foreach string addr in uniqueAddresses {
        database:WalletUserRecord? info = check database:fetchEmailByAddress(addr);
        if info is database:WalletUserRecord {
            addressInfoMap[addr] = info;
        }
    }

    // Enrich transactions from the map
    EnrichedTransaction[] enriched = [];

    foreach Transaction tx in envelope.payload.transactions {
        database:WalletUserRecord? senderInfo = addressInfoMap[tx.senderAddress];
        database:WalletUserRecord? receiverInfo = addressInfoMap[tx.receiverAddress];

        enriched.push({
            ...tx,
            senderEmail: senderInfo is database:WalletUserRecord ? senderInfo.userEmail : (),
            senderDefaultWallet: senderInfo is database:WalletUserRecord ? senderInfo.defaultWallet : (),
            receiverEmail: receiverInfo is database:WalletUserRecord ? receiverInfo.userEmail : (),
            receiverDefaultWallet: receiverInfo is database:WalletUserRecord ? receiverInfo.defaultWallet : ()
        });
    }

    return {
        hasMore: envelope.payload.hasMore,
        offset: envelope.payload.offset,
        'limit: envelope.payload.'limit,
        transactions: enriched
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
