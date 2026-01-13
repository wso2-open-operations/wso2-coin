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

# Build query to persist a conference QR.
#
# + qrId - UUID for the QR code
# + payload - Payload containing the QR details
# + createdBy - Person who is creating the QR
# + return - sql:ParameterizedQuery - Insert query for the new QR
isolated function addConferenceQrCodeQuery(string qrId, AddConferenceQrCodePayload payload, string createdBy) returns sql:ParameterizedQuery
    => `
        INSERT INTO conference_qr
        (
            qr_id,
            info,
            description,
            coins,
            created_by
        )
        VALUES
        (
            ${qrId},
            ${payload.info.toJsonString()},
            ${payload.description},
            ${payload.coins},
            ${createdBy}
        );
    `;

# Build query to fetch a QR by ID.
#
# + qrId - UUID of the QR code
# + return - sql:ParameterizedQuery - Select query for the QR based on the UUID
isolated function fetchConferenceQrCodeQuery(string qrId) returns sql:ParameterizedQuery => `
        SELECT
            qr_id,
            info,
            description,
            coins,
            created_by,
            created_on,
            status
        FROM 
            conference_qr
        WHERE 
            qr_id = ${qrId}
            AND status = ${ACTIVE};
    `;

# Build query to fetch QRs with optional filters and pagination.
#
# + filters - Filters for fetching QRs
# + return - sql:ParameterizedQuery - Select query for QRs based on the provided filters and pagination
isolated function fetchConferenceQrCodesQuery(ConferenceQrCodeFilters filters) returns sql:ParameterizedQuery {

    sql:ParameterizedQuery mainQuery = `
        SELECT 
            qr_id,
            info,
            description,
            coins,
            created_by,
            created_on,
            status,
            COUNT(*) OVER() AS total_count
        FROM 
            conference_qr
    `;

    sql:ParameterizedQuery[] filterQueries = [];
    filterQueries.push(` status = ${ACTIVE}`);

    // Setting the filters based on the inputs.
    if filters.email is string && filters.eventType is QrCodeType {
        if filters.eventType == SESSION {
            filterQueries.push(`
                (
                    JSON_UNQUOTE(JSON_EXTRACT(info, '$.eventType')) = ${SESSION}
                    OR (
                        JSON_UNQUOTE(JSON_EXTRACT(info, '$.eventType')) = ${O2BAR}
                        AND JSON_UNQUOTE(JSON_EXTRACT(info, '$.email')) = ${filters.email}
                    )
                )
            `);
        } else if filters.eventType == O2BAR {
            filterQueries.push(`
                JSON_UNQUOTE(JSON_EXTRACT(info, '$.eventType')) = ${O2BAR}
                AND JSON_UNQUOTE(JSON_EXTRACT(info, '$.email')) = ${filters.email}
            `);
        }
    } else if filters.eventType is QrCodeType {
        filterQueries.push(` JSON_UNQUOTE(JSON_EXTRACT(info, '$.eventType')) = ${filters.eventType}`);
    }

    if filterQueries.length() > 0 {
        mainQuery = buildSqlSelectQuery(mainQuery, filterQueries);
    }

    // Sorting the result by created_on.
    mainQuery = sql:queryConcat(mainQuery, ` ORDER BY created_on DESC`);

    // Setting the limit and offset.
    if filters.'limit is int {
        mainQuery = sql:queryConcat(mainQuery, ` LIMIT ${filters.'limit}`);
        if filters.offset is int {
            mainQuery = sql:queryConcat(mainQuery, ` OFFSET ${filters.offset}`);
        }
    } else {
        mainQuery = sql:queryConcat(mainQuery, ` LIMIT ${DEFAULT_LIMIT}`);
    }

    return mainQuery;
}

# Build query to check if QR exists.
#
# + qrInfo - QR info to check (Session or O2Bar)
# + return - sql:ParameterizedQuery - Select query to check for existing QR
isolated function checkIsQrCodeExistsQuery(QrCodeInfo qrInfo) returns sql:ParameterizedQuery {
    sql:ParameterizedQuery mainQuery = `
        SELECT 1 AS count
        FROM conference_qr
        WHERE `;

    sql:ParameterizedQuery whereClause;
    if qrInfo is QrCodeInfoO2Bar {
        whereClause = `JSON_UNQUOTE(JSON_EXTRACT(info, '$.email')) = ${qrInfo.email}`;
    } else if qrInfo is QrCodeInfoGeneral {
        whereClause = `JSON_UNQUOTE(JSON_EXTRACT(info, '$.eventTypeName')) = ${qrInfo.eventTypeName}`;
    } else {
        whereClause = `JSON_UNQUOTE(JSON_EXTRACT(info, '$.sessionId')) = ${qrInfo.sessionId}`;
    }

    return sql:queryConcat(mainQuery, whereClause, ` AND status = ${ACTIVE} LIMIT 1`);
}

# Build query to delete a QR by ID.
#
# + qrId - UUID of the QR code to delete
# + deletedBy - Email of the user performing the deletion
# + return - sql:ParameterizedQuery - Update query to set status to DELETED
isolated function deleteConferenceQrCodeQuery(string qrId, string deletedBy) returns sql:ParameterizedQuery => `
        UPDATE conference_qr
        SET status = ${DELETED},
            updated_by = ${deletedBy},
            updated_on = CURRENT_TIMESTAMP(6)
        WHERE qr_id = ${qrId}
            AND status = ${ACTIVE}
    `;

# Build query to fetch all event types.
#
# + return - sql:ParameterizedQuery - Select query for all event types
isolated function fetchConferenceEventTypesQuery() returns sql:ParameterizedQuery => `
        SELECT
            type,
            category,
            description,
            default_coins
        FROM 
            conference_event_type
        ORDER BY category, type;
    `;

# Build query to fetch event type by type name.
#
# + typeName - Event type name
# + return - sql:ParameterizedQuery - Select query for the event type
isolated function fetchConferenceEventTypeQuery(string typeName) returns sql:ParameterizedQuery => `
        SELECT
            type,
            category,
            description,
            default_coins
        FROM 
            conference_event_type
        WHERE 
            type = ${typeName};
    `;

# Build query to add a new event type.
#
# + payload - Payload containing the event type details
# + return - sql:ParameterizedQuery - Insert query for the new event type
isolated function addConferenceEventTypeQuery(AddConferenceEventTypePayload payload) returns sql:ParameterizedQuery
    => `
        INSERT INTO conference_event_type
        (
            type,
            category,
            description,
            default_coins
        )
        VALUES
        (
            ${payload.eventTypeName},
            ${payload.category},
            ${payload.description},
            ${payload.defaultCoins}
        );
    `;

# Build query to update an event type.
#
# + typeName - Event type name to update
# + payload - Payload containing the updated event type details
# + return - sql:ParameterizedQuery - Update query for the event type
isolated function updateConferenceEventTypeQuery(string typeName, AddConferenceEventTypePayload payload) returns sql:ParameterizedQuery
    => `
        UPDATE conference_event_type
        SET
            category = ${payload.category},
            description = ${payload.description},
            default_coins = ${payload.defaultCoins}
        WHERE 
            type = ${typeName};
    `;

# Build query to delete an event type.
#
# + typeName - Event type name to delete
# + return - sql:ParameterizedQuery - Delete query for the event type
isolated function deleteConferenceEventTypeQuery(string typeName) returns sql:ParameterizedQuery => `
        DELETE FROM conference_event_type
        WHERE type = ${typeName};
    `;
