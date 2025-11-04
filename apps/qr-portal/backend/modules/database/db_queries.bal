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
isolated function addConferenceQRQuery(string qrId, AddConferenceQRPayload payload, string createdBy) returns sql:ParameterizedQuery
    => `
        INSERT INTO conference_qr
        (
            qr_id,
            info,
            description,
            created_by
        )
        VALUES
        (
            ${qrId},
            ${payload.info.toJsonString()},
            ${payload.description},
            ${createdBy}
        );
    `;

# Build query to fetch a QR by ID.
#
# + qrId - UUID of the QR code
# + return - sql:ParameterizedQuery - Select query for the QR based on the UUID
isolated function fetchConferenceQRQuery(string qrId) returns sql:ParameterizedQuery => `
        SELECT
            qr_id AS qrId,
            info,
            description,
            created_by AS createdBy,
            created_on AS createdOn
        FROM 
            conference_qr
        WHERE 
            qr_id = ${qrId};
    `;

# Build query to fetch QRs with optional filters and pagination.
#
# + filters - Filters for fetching QRs
# + return - sql:ParameterizedQuery - Select query for QRs based on the provided filters and pagination
isolated function fetchConferenceQRsQuery(ConferenceQRFilters filters) returns sql:ParameterizedQuery {

    sql:ParameterizedQuery mainQuery = `
        SELECT 
            qr_id AS qrId,
            info,
            description,
            created_by AS createdBy,
            created_on AS createdOn,
            COUNT(*) OVER() AS totalCount
        FROM 
            conference_qr
    `;

    // Setting the filters based on the inputs.
    sql:ParameterizedQuery[] filterQueries = [];
    if filters.createdBy is string {
        filterQueries.push(` created_by = ${filters.createdBy}`);
    }

    // Build main query with the filters.
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

# Build query to delete a QR by ID.
#
# + qrId - UUID of the QR code to delete
# + return - sql:ParameterizedQuery - Delete query for the QR
isolated function deleteConferenceQRQuery(string qrId) returns sql:ParameterizedQuery => `
        DELETE FROM conference_qr
        WHERE qr_id = ${qrId};
    `;
