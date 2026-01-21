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
public isolated function addConferenceQrCode(string qrId, AddConferenceQrCodePayload payload, string createdBy) returns error? {
    _ = check databaseClient->execute(addConferenceQrCodeQuery(qrId, payload, createdBy));
}

# Fetch QR by ID.
#
# + qrId - UUID of the QR code
# + return - ConferenceQR object or error
public isolated function fetchConferenceQrCode(string qrId) returns ConferenceQrCode|error? {
    ConferenceQrCodeRecord|error qr = databaseClient->queryRow(fetchConferenceQrCodeQuery(qrId));
    if qr is error {
        return qr is sql:NoRowsError ? () : qr;
    }

    return {
        qrId: qr.qrId,
        info: check qr.info.fromJsonStringWithType(),
        description: qr.description,
        coins: qr.coins,
        createdBy: qr.createdBy,
        createdOn: qr.createdOn
    };
}

# Fetch QRs with pagination.
#
# + filters - Filters for fetching QRs
# + return - ConferenceQRsResponse object or error
public isolated function fetchConferenceQrCodes(ConferenceQrCodeFilters filters) returns ConferenceQrCodesResponse|error {
    stream<ConferenceQrCodeRecord, sql:Error?> resultStream = databaseClient->query(fetchConferenceQrCodesQuery(filters));

    int totalCount = 0;
    ConferenceQrCode[] qrs = [];
    check from ConferenceQrCodeRecord qr in resultStream
        do {
            totalCount = qr.totalCount;
            qrs.push({
                qrId: qr.qrId,
                info: check qr.info.fromJsonStringWithType(),
                description: qr.description,
                coins: qr.coins,
                createdBy: qr.createdBy,
                createdOn: qr.createdOn
            });
        };

    return {totalCount, qrs};
}

# Extract identifier from QR info based on type.
#
# + qrInfo - QR info to extract identifier from
# + return - Identifier string (email, eventTypeName, or sessionId)
public isolated function getQrCodeIdentifier(QrCodeInfo qrInfo) returns string {
    if qrInfo is QrCodeInfoO2Bar {
        return qrInfo.email;
    }
    if qrInfo is QrCodeInfoGeneral {
        return qrInfo.eventTypeName;
    }
    return qrInfo.sessionId;
}

# Check if QR code already exists.
#
# + qrInfo - QR info to check
# + return - true if exists, false otherwise
public isolated function isQrCodeExists(QrCodeInfo qrInfo) returns boolean|error {
    CountRecord|error result = databaseClient->queryRow(checkIsQrCodeExistsQuery(qrInfo));
    
    if result is error {
        return result is sql:NoRowsError ? false : result;
    }
    
    return true;
}

# Delete QR by ID.
#
# + qrId - UUID of the QR code to delete
# + deletedBy - Email of the user performing the deletion
# + return - Error if the deletion failed or no rows were affected
public isolated function deleteConferenceQrCode(string qrId, string deletedBy) returns error? {
    sql:ExecutionResult|sql:Error deleteResult = databaseClient->execute(deleteConferenceQrCodeQuery(qrId, deletedBy));
    if deleteResult is sql:Error {
        return deleteResult;
    }

    if deleteResult.affectedRowCount <= 0 {
        return error("QR code not found or already deleted");
    }
}

# Fetch all event types.
#
# + return - Array of event types or error
public isolated function fetchConferenceEventTypes() returns ConferenceEventType[]|error {
    stream<ConferenceEventTypeRecord, sql:Error?> resultStream = databaseClient->query(fetchConferenceEventTypesQuery());

    return check from ConferenceEventTypeRecord eventType in resultStream
        select {
            ...eventType
        };
}

# Fetch event type by name.
#
# + typeName - Event type name
# + return - ConferenceEventType or error
public isolated function fetchConferenceEventTypeByName(string typeName) returns ConferenceEventType|error? {
    ConferenceEventTypeRecord|error eventType = databaseClient->queryRow(fetchConferenceEventTypeByNameQuery(typeName));
    if eventType is error {
        return eventType is sql:NoRowsError ? () : eventType;
    }

    return {
        ...eventType
    };
}

# Add new event type.
#
# + payload - Payload containing the event type details
# + return - Error if the insertion failed
public isolated function addConferenceEventType(AddConferenceEventTypePayload payload) returns error? {
    _ = check databaseClient->execute(addConferenceEventTypeQuery(payload));
}

# Update event type.
#
# + typeName - Event type name to update
# + payload - Payload containing the updated event type details
# + return - Error if the update failed
public isolated function updateConferenceEventType(string typeName, AddConferenceEventTypePayload payload) returns error? {
    sql:ExecutionResult|sql:Error updateResult = databaseClient->execute(updateConferenceEventTypeQuery(typeName, payload));
    if updateResult is sql:Error {
        return updateResult;
    }
    if updateResult.affectedRowCount <= 0 {
        return error("Event type not found");
    }
}

# Get default coins for an event type based on QR info.
#
# + qrInfo - QR code info to determine event type
# + return - Default coins amount or error
public isolated function getDefaultCoinsForQrInfo(QrCodeInfo qrInfo) returns EventTypeCoinsInfo|error? {
    string eventTypeName;
    if qrInfo is QrCodeInfoSession {
        eventTypeName = "SESSION";
    } else if qrInfo is QrCodeInfoO2Bar {
        eventTypeName = "O2BAR";
    } else {
        eventTypeName = qrInfo.eventTypeName;
    }
    
    ConferenceEventTypeRecord|error eventType = databaseClient->queryRow(fetchConferenceEventTypeByNameQuery(eventTypeName));
    if eventType is error {
        return eventType is sql:NoRowsError ? () : eventType;
    }
    
    return eventType.defaultCoins;
}

# Delete event type.
#
# + typeName - Event type name to delete
# + return - Error if the deletion failed
public isolated function deleteConferenceEventType(string typeName) returns error? {
    sql:ExecutionResult|sql:Error deleteResult = databaseClient->execute(deleteConferenceEventTypeQuery(typeName));
    if deleteResult is sql:Error {
        return deleteResult;
    }

    if deleteResult.affectedRowCount <= 0 {
        return error("Event type not found");
    }
}
