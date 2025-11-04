// Copyright (c) 2025 WSO2 LLC. (https://www.wso2.com).
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
import ballerina/sql;

# Add new conference QR.
#
# + qrId - UUID for the QR code
# + payload - Payload containing the QR details  
# + createdBy - Person who is creating the QR
# + return - Error if the insertion failed
public isolated function addConferenceQR(string qrId, AddConferenceQRPayload payload, string createdBy) returns error? {
    _ = check databaseClient->execute(addConferenceQRQuery(qrId, payload, createdBy));
}

# Fetch QR by ID.
#
# + qrId - UUID of the QR code
# + return - ConferenceQR object or error
public isolated function fetchConferenceQR(string qrId) returns ConferenceQR|error? {
    ConferenceQRRecord|error qr = databaseClient->queryRow(fetchConferenceQRQuery(qrId));
    if qr is error {
        return qr is sql:NoRowsError ? () : qr;
    }

    return {
        qrId: qr.qrId,
        info: check qr.info.fromJsonStringWithType(),
        description: qr.description,
        createdBy: qr.createdBy,
        createdOn: qr.createdOn
    };
}

# Fetch QRs with pagination.
#
# + filters - Filters for fetching QRs
# + return - ConferenceQRsResponse object or error
public isolated function fetchConferenceQRs(ConferenceQRFilters filters) returns ConferenceQRsResponse|error {
    stream<ConferenceQRRecord, sql:Error?> resultStream = databaseClient->query(fetchConferenceQRsQuery(filters));

    int totalCount = 0;
    ConferenceQR[] qrs = [];
    check from ConferenceQRRecord qr in resultStream
        do {
            totalCount = qr.totalCount;
            qrs.push({
                qrId: qr.qrId,
                info: check qr.info.fromJsonStringWithType(),
                description: qr.description,
                createdBy: qr.createdBy,
                createdOn: qr.createdOn
            });
        };

    return {totalCount, qrs};
}

# Delete QR by ID.
#
# + qrId - UUID of the QR code to delete
# + return - Error if the deletion failed or no rows were affected
public isolated function deleteConferenceQR(string qrId) returns error? {
    sql:ExecutionResult executionResult = check databaseClient->execute(deleteConferenceQRQuery(qrId));

    if executionResult.affectedRowCount < 1 {
        return error("No QR code found with the given ID!");
    }
}
