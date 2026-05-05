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
        if addresses.length() > 0 {
            serviceRequest.senderAddresses = addresses;
        }
    } else if senderAddress is string {
        serviceRequest.senderAddresses = [senderAddress];
    }

    // Resolve receiver address(es)
    string? receiverAddress = request.receiverAddress;
    string? receiverEmail = request.receiverEmail;
    if receiverEmail is string {
        string[] addresses = check database:fetchWalletAddressesByEmail(receiverEmail);
        if addresses.length() > 0 {
            serviceRequest.receiverAddresses = addresses;
        }
    } else if receiverAddress is string {
        serviceRequest.receiverAddresses = [receiverAddress];
    }

    http:Response response = check transactionClient->post("/api/v1/blockchain/transactions/search", serviceRequest);

    if response.statusCode != http:STATUS_OK {
        return error(string `Transaction service returned status ${response.statusCode}`);
    }

    json responseJson = check response.getJsonPayload();
    TransactionServiceEnvelope envelope = check responseJson.fromJsonWithType();

    // Enrich transactions with email info
    EnrichedTransaction[] enriched = [];

    foreach Transaction tx in envelope.payload.transactions {
        database:WalletUserRecord? senderInfo = check database:fetchEmailByAddress(tx.senderAddress);
        database:WalletUserRecord? receiverInfo = check database:fetchEmailByAddress(tx.receiverAddress);

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
