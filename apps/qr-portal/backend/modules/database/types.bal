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
import ballerina/constraint;
import ballerina/sql;
import ballerinax/mysql;

# [Configurable] database configs.
type DatabaseConfig record {|
    # If the MySQL server is secured, the username
    string user;
    # The password of the MySQL server for the provided username
    string password;
    # The name of the database
    string database;
    # Hostname of the MySQL server
    string host;
    # Port number of the MySQL server
    int port;
    # The `mysql:Options` configurations
    mysql:Options options?;
    # The `sql:ConnectionPool` configurations
    sql:ConnectionPool connectionPool?;
|};

# Database audit fields.
public type AuditFields record {|
    # Who created the QR
    string createdBy;
    # When the QR was created 
    string createdOn;
|};

# [Database] Info entry for a speech session QR item.
public type QrCodeInfoSession record {|
    # Event type discriminator
    QrCodeType eventType;
    # Session identifier when `eventType` is SESSION
    @constraint:String {
        pattern: {
            value: NONE_EMPTY_PRINTABLE_STRING_REGEX,
            message: "The session ID should be a non-empty string with printable characters."
        }
    }
    string sessionId;
|};

# [Database] Info entry for an O2 bar QR item.
public type QrCodeInfoO2Bar record {|
    # Event type discriminator
    QrCodeType eventType;
    # Contact email when `eventType` is O2BAR
    @constraint:String {
        pattern: {
            value: EMAIL_REGEX,
            message: "Provide a valid email address."
        }
    }
    string email;
|};

# The `info` field is a session or o2bar entry.
public type QrCodeInfo QrCodeInfoSession|QrCodeInfoO2Bar;

# [Database] ConferenceQR record.
public type ConferenceQrCode record {|
    # UUID string
    @constraint:String {
        pattern: {
            value: UUID_REGEX,
            message: "qrId should be a UUID string."
        }
    }
    string qrId;
    # Parsed JSON array as strongly typed entries
    QrCodeInfo info;
    # Optional description/note about the QR code
    string? description = ();
    *AuditFields;
|};

# [Database] ConferenceQR record (matches DB column names).
type ConferenceQrCodeRecord record {|
    # UUID of the QR code
    @sql:Column {name: "qr_id"}
    string qrId;
    # JSON object as string from database
    @sql:Column {name: "info"}
    string info;
    # Optional description/note
    @sql:Column {name: "description"}
    string? description = ();
    # Creator email
    @sql:Column {name: "created_by"}
    string createdBy;
    # Creation timestamp
    @sql:Column {name: "created_on"}
    string createdOn;
    # Status of the QR code (ACTIVE or DELETED)
    @sql:Column {name: "status"}
    string status;
    # Total count for pagination
    @sql:Column {name: "total_count"}
    int totalCount = 0;
|};

# [Database] Count record for existence checks.
type CountRecord record {|
    # Count value
    int count;
|};

# [Database] Insert record for conference QR.
public type AddConferenceQrCodePayload record {|
    # Session or O2BAR entry
    QrCodeInfo info;
    # Optional description/note about the QR code
    string? description = ();
    # Who created the QR
    @constraint:String {
        pattern: {
            value: NONE_EMPTY_PRINTABLE_STRING_REGEX,
            message: "The creator email should be a non-empty string with printable characters."
        }
    }
    string createdBy;
|};

# Response record for list of QRs.
public type ConferenceQrCodesResponse record {|
    # The total count of QR codes
    int totalCount;
    # Array of QR codes
    ConferenceQrCode[] qrs;
|};

# Filters for fetching QR codes.
public type ConferenceQrCodeFilters record {|
    # Email in O2BAR QR info
    string? email = ();
    # Filter by event type (SESSION or O2BAR)
    QrCodeType? eventType = ();
    # Limit number of QRs to fetch
    int? 'limit = DEFAULT_LIMIT;
    # Offset for pagination
    int? offset = ();
|};
