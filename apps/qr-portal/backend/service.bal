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
import qr_portal.authorization;
import qr_portal.conference;
import qr_portal.database;

import ballerina/http;
import ballerina/log;
import ballerina/uuid;

@display {
    label: "QR Portal Service",
    id: "wso2/qr-portal-service"
}

service http:InterceptableService / on new http:Listener(9090) {

    # Request interceptor.
    #
    # + return - authorization:JwtInterceptor
    public function createInterceptors() returns http:Interceptor[] => [new authorization:JwtInterceptor()];

    # Fetch logged-in user's details with privileges.
    #
    # + ctx - Request context
    # + return - User information or error
    resource function get user\-info(http:RequestContext ctx) returns UserInfo|http:InternalServerError {
        authorization:CustomJwtPayload|error invokerInfo = ctx.getWithType(authorization:HEADER_USER_INFO);
        if invokerInfo is error {
            log:printError(USER_INFO_HEADER_NOT_FOUND_ERROR, invokerInfo);
            return <http:InternalServerError>{
                body: {
                    message: USER_INFO_HEADER_NOT_FOUND_ERROR
                }
            };
        }

        int[] privileges = [];
        if authorization:checkPermissions([authorization:authorizedRoles.generalAdminRole], invokerInfo.groups) {
            privileges.push(authorization:GENERAL_ADMIN_PRIVILEGE);
        }
        if authorization:checkPermissions([authorization:authorizedRoles.sessionAdminRole], invokerInfo.groups) {
            privileges.push(authorization:SESSION_ADMIN_PRIVILEGE);
        }
        if authorization:checkPermissions([authorization:authorizedRoles.employeeRole], invokerInfo.groups) {
            privileges.push(authorization:EMPLOYEE_PRIVILEGE);
        }

        return {
            workEmail: invokerInfo.email,
            privileges
        };
    }

    # Fetch all active sessions from the conference backend.
    #
    # + return - Array of active sessions or error
    resource function get sessions(http:RequestContext ctx) returns conference:Session[]|http:InternalServerError {

        authorization:CustomJwtPayload|error invokerInfo = ctx.getWithType(authorization:HEADER_USER_INFO);
        if invokerInfo is error {
            log:printError(USER_INFO_HEADER_NOT_FOUND_ERROR, invokerInfo);
            return <http:InternalServerError>{
                body: {
                    message: USER_INFO_HEADER_NOT_FOUND_ERROR
                }
            };
        }

        conference:Session[]|error sessions = conference:fetchActiveSessions();
        if sessions is error {
            string customError = "Error occurred while fetching active sessions!";
            log:printError(customError, sessions);
            return <http:InternalServerError>{
                body: {
                    message: customError
                }
            };
        }

        return sessions;
    }

    # Create a new QR code.
    #
    # + payload - Payload containing the QR details
    # + return - Created QR ID or error
    resource function post qr\-codes(http:RequestContext ctx, CreateQrCodePayload payload)
        returns http:Created|http:InternalServerError|http:BadRequest|http:Conflict|http:Forbidden {

        authorization:CustomJwtPayload|error invokerInfo = ctx.getWithType(authorization:HEADER_USER_INFO);
        if invokerInfo is error {
            log:printError(USER_INFO_HEADER_NOT_FOUND_ERROR, invokerInfo);
            return <http:InternalServerError>{
                body: {
                    message: USER_INFO_HEADER_NOT_FOUND_ERROR
                }
            };
        }

        boolean isGeneralAdmin = authorization:checkPermissions([authorization:authorizedRoles.generalAdminRole], invokerInfo.groups);
        boolean isSessionAdmin = authorization:checkPermissions([authorization:authorizedRoles.sessionAdminRole], invokerInfo.groups);
        boolean isEmployee = authorization:checkPermissions([authorization:authorizedRoles.employeeRole], invokerInfo.groups);

        if (payload.info is database:QrCodeInfoSession && payload.info.eventType != database:SESSION) ||
            (payload.info is database:QrCodeInfoO2Bar && payload.info.eventType != database:O2BAR) ||
            (payload.info is database:QrCodeInfoGeneral && payload.info.eventType != database:GENERAL) {
            return <http:BadRequest>{
                body: {
                    message: "Invalid event type in QR info"
                }
            };
        }

        boolean isSessionQr = payload.info is database:QrCodeInfoSession;
        boolean isGeneralQr = payload.info is database:QrCodeInfoGeneral;
        boolean isO2BarQr = payload.info is database:QrCodeInfoO2Bar;

        if isSessionQr && !isSessionAdmin {
            return <http:Forbidden>{
                body: {
                    message: "You don't have permission to create Session QR codes!"
                }
            };
        }

        if isGeneralQr && !isGeneralAdmin {
            return <http:Forbidden>{
                body: {
                    message: "Only General Admins can create General QR codes!"
                }
            };
        }

        if isO2BarQr {
            database:QrCodeInfoO2Bar o2BarInfo = <database:QrCodeInfoO2Bar>payload.info;
            if o2BarInfo.email == invokerInfo.email {
                if !authorization:checkAnyPermissions([authorization:authorizedRoles.generalAdminRole,
                 authorization:authorizedRoles.sessionAdminRole, authorization:authorizedRoles.employeeRole],
                 invokerInfo.groups) {
                    return <http:Forbidden>{
                        body: {
                            message: "You don't have permission to create O2 Bar QR codes!"
                        }
                    };
                }
            } else if !isGeneralAdmin {
                return <http:Forbidden>{
                    body: {
                        message: "Only General Admins can create QR codes for other emails!"
                    }
                };
            }
        }

        if !isGeneralQr {
            boolean|error isQrExists = database:isQrCodeExists(payload.info);
            if isQrExists is error {
                string customError = "Error occurred while checking for existing QR code!";
                log:printError(customError, isQrExists);
                return <http:InternalServerError>{
                    body: {
                        message: customError
                    }
                };
            }
            if isQrExists {
                string identifier = database:getQrCodeIdentifier(payload.info);
                return <http:Conflict>{
                    body: {
                        message: string `QR code already exists for: ${identifier}`
                    }
                };
            }
        }

        decimal coins = payload.coins;
        if isEmployee || (isSessionAdmin && !isGeneralAdmin && !isSessionQr) || (isGeneralAdmin && isSessionQr) {
            decimal|error? defaultCoins = database:getDefaultCoinsForQrInfo(payload.info);
            if defaultCoins is error {
                string customError = "Error occurred while fetching default coins for event type!";
                log:printError(customError, defaultCoins);
                return <http:InternalServerError>{
                    body: {
                        message: customError
                    }
                };
            }
            if defaultCoins is () {
                return <http:BadRequest>{
                    body: {
                        message: "Event type not found"
                    }
                };
            }
            coins = defaultCoins;
        }

        string qrId = uuid:createType4AsString();

        database:AddConferenceQrCodePayload dbPayload = {
            info: payload.info,
            description: payload.description,
            coins: coins,
            createdBy: invokerInfo.email
        };

        error? qrError = database:addConferenceQrCode(qrId, dbPayload, invokerInfo.email);
        if qrError is error {
            string customError = "Error occurred while creating QR code!";
            log:printError(customError, qrError);
            return <http:InternalServerError>{
                body: {
                    message: customError
                }
            };
        }

        return <http:Created>{
            body: {
                qrId
            }
        };
    }

    # Fetch a specific QR by ID.
    #
    # + id - UUID of the QR code
    # + return - QR details or error
    resource function get qr\-codes/[string id]()
        returns database:ConferenceQrCode|http:InternalServerError|http:NotFound {

        database:ConferenceQrCode|error? qr = database:fetchConferenceQrCode(id);
        if qr is error {
            string customError = "Error occurred while fetching QR code!";
            log:printError(customError, qr);
            return <http:InternalServerError>{
                body: {
                    message: customError
                }
            };
        }
        if qr is () {
            return <http:NotFound>{
                body: {
                    message: "QR code not found!"
                }
            };
        }

        // Public endpoint - no authentication required
        return qr;
    }

    # Fetch all QRs with optional filters.
    #
    # + ctx - Request context
    # + 'limit - Optional limit for pagination
    # + offset - Optional offset for pagination
    # + return - List of QRs based on user role, or error
    resource function get qr\-codes(http:RequestContext ctx, int? 'limit = (), int? offset = ())
        returns database:ConferenceQrCodesResponse|http:InternalServerError {

        authorization:CustomJwtPayload|error userInfo = ctx.getWithType(authorization:HEADER_USER_INFO);
        if userInfo is error {
            log:printError(USER_INFO_HEADER_NOT_FOUND_ERROR, userInfo);
            return <http:InternalServerError>{
                body: {
                    message: USER_INFO_HEADER_NOT_FOUND_ERROR
                }
            };
        }

        // Build filters based on role
        database:ConferenceQrCodeFilters filters = {
            'limit: 'limit,
            offset: offset
        };

        boolean isGeneralAdmin = authorization:checkPermissions([authorization:authorizedRoles.generalAdminRole], userInfo.groups);
        boolean isSessionAdmin = authorization:checkPermissions([authorization:authorizedRoles.sessionAdminRole], userInfo.groups);
        boolean isEmployee = authorization:checkPermissions([authorization:authorizedRoles.employeeRole], userInfo.groups);

        if isGeneralAdmin && isSessionAdmin {
            // No filters - see all QR codes (SESSION, O2BAR, GENERAL)
        } else if isGeneralAdmin {
            filters.excludeEventType = database:SESSION;
        } else if isSessionAdmin {
            filters.email = userInfo.email;
            filters.eventType = database:SESSION;
            filters.excludeEventType = database:GENERAL;
        } else if isEmployee {
            filters.email = userInfo.email;
            filters.eventType = database:O2BAR;
        } else {
            filters.email = userInfo.email;
        }

        database:ConferenceQrCodesResponse|error qrsResponse = database:fetchConferenceQrCodes(filters);
        if qrsResponse is error {
            string customError = "Error occurred while fetching QR codes!";
            log:printError(customError, qrsResponse);
            return <http:InternalServerError>{
                body: {
                    message: customError
                }
            };
        }

        return qrsResponse;
    }

    # Delete a QR code.
    #
    # + id - UUID of the QR code to delete
    # + return - Success or error
    resource function delete qr\-codes/[string id](http:RequestContext ctx)
        returns http:NoContent|http:InternalServerError|http:NotFound|http:Forbidden {

        authorization:CustomJwtPayload|error invokerInfo = ctx.getWithType(authorization:HEADER_USER_INFO);
        if invokerInfo is error {
            log:printError(USER_INFO_HEADER_NOT_FOUND_ERROR, invokerInfo);
            return <http:InternalServerError>{
                body: {
                    message: USER_INFO_HEADER_NOT_FOUND_ERROR
                }
            };
        }

        database:ConferenceQrCode|error? qr = database:fetchConferenceQrCode(id);
        if qr is error {
            string customError = "Error occurred while fetching QR code!";
            log:printError(customError, qr);
            return <http:InternalServerError>{
                body: {
                    message: customError
                }
            };
        }
        if qr is () {
            string customError = "QR code not found!";
            log:printWarn(customError);
            return <http:NotFound>{
                body: {
                    message: customError
                }
            };
        }

        if qr.createdBy != invokerInfo.email {
            string customError = "You don't have permission to delete this QR code!";
            log:printWarn(customError);
            return <http:Forbidden>{
                body: {
                    message: customError
                }
            };
        }

        error? deleteError = database:deleteConferenceQrCode(qr.qrId, invokerInfo.email);
        if deleteError is error {
            string customError = "Error occurred while deleting QR code!";
            log:printError(customError, deleteError);
            return <http:InternalServerError>{
                body: {
                    message: customError
                }
            };
        }

        return http:NO_CONTENT;
    }

    # Fetch all event types.
    #
    # + ctx - Request context
    # + return - Array of event types or error
    resource function get event\-types(http:RequestContext ctx)
        returns database:ConferenceEventType[]|http:InternalServerError {

        authorization:CustomJwtPayload|error invokerInfo = ctx.getWithType(authorization:HEADER_USER_INFO);
        if invokerInfo is error {
            log:printError(USER_INFO_HEADER_NOT_FOUND_ERROR, invokerInfo);
            return <http:InternalServerError>{
                body: {
                    message: USER_INFO_HEADER_NOT_FOUND_ERROR
                }
            };
        }

        database:ConferenceEventType[]|error eventTypes = database:fetchConferenceEventTypes();
        if eventTypes is error {
            string customError = "Error occurred while fetching event types!";
            log:printError(customError, eventTypes);
            return <http:InternalServerError>{
                body: {
                    message: customError
                }
            };
        }

        return eventTypes;
    }

    # Create a new event type.
    #
    # + ctx - Request context
    # + payload - Payload containing the event type details
    # + return - Created event type or error
    resource function post event\-types(http:RequestContext ctx, database:AddConferenceEventTypePayload payload)
        returns http:Created|http:InternalServerError|http:BadRequest|http:Forbidden {

        authorization:CustomJwtPayload|error invokerInfo = ctx.getWithType(authorization:HEADER_USER_INFO);
        if invokerInfo is error {
            log:printError(USER_INFO_HEADER_NOT_FOUND_ERROR, invokerInfo);
            return <http:InternalServerError>{
                body: {
                    message: USER_INFO_HEADER_NOT_FOUND_ERROR
                }
            };
        }

        boolean isGeneralAdmin = authorization:checkPermissions([authorization:authorizedRoles.generalAdminRole], invokerInfo.groups);
        if !isGeneralAdmin {
            return <http:Forbidden>{
                body: {
                    message: "Only General Admins can create event types!"
                }
            };
        }

        error? addError = database:addConferenceEventType(payload);
        if addError is error {
            string customError = "Error occurred while creating event type!";
            log:printError(customError, addError);
            return <http:InternalServerError>{
                body: {
                    message: customError
                }
            };
        }

        return <http:Created>{
            body: payload
        };
    }

    # Update an event type.
    #
    # + ctx - Request context
    # + typeName - Event type name to update
    # + payload - Payload containing the updated event type details
    # + return - Updated event type or error
    resource function put event\-types/[string typeName](http:RequestContext ctx, database:AddConferenceEventTypePayload payload)
        returns http:Ok|http:InternalServerError|http:NotFound|http:Forbidden|http:BadRequest {

        authorization:CustomJwtPayload|error invokerInfo = ctx.getWithType(authorization:HEADER_USER_INFO);
        if invokerInfo is error {
            log:printError(USER_INFO_HEADER_NOT_FOUND_ERROR, invokerInfo);
            return <http:InternalServerError>{
                body: {
                    message: USER_INFO_HEADER_NOT_FOUND_ERROR
                }
            };
        }

        boolean isGeneralAdmin = authorization:checkPermissions([authorization:authorizedRoles.generalAdminRole], invokerInfo.groups);
        if !isGeneralAdmin {
            return <http:Forbidden>{
                body: {
                    message: "Only General Admins can update event types!"
                }
            };
        }

        database:ConferenceEventType|error? currentEventType = database:fetchConferenceEventTypeByName(typeName);
        if currentEventType is error {
            string customError = "Error occurred while fetching event type!";
            log:printError(customError, currentEventType);
            return <http:InternalServerError>{
                body: {
                    message: customError
                }
            };
        }
        if currentEventType is () {
            return <http:NotFound>{
                body: {
                    message: "Event type not found"
                }
            };
        }

        if payload.category != currentEventType.category {
            return <http:BadRequest>{
                body: {
                    message: "Cannot change category of event types"
                }
            };
        }
        if payload.eventTypeName != typeName {
            return <http:BadRequest>{
                body: {
                    message: "Cannot change event type name"
                }
            };
        }

        error? updateError = database:updateConferenceEventType(typeName, payload);
        if updateError is error {
            string errorMessage = updateError.message();
            if errorMessage == "Event type not found" {
                return <http:NotFound>{
                    body: {
                        message: errorMessage
                    }
                };
            }
            string customError = "Error occurred while updating event type!";
            log:printError(customError, updateError);
            return <http:InternalServerError>{
                body: {
                    message: customError
                }
            };
        }

        return <http:Ok>{
            body: payload
        };
    }

    # Delete an event type.
    #
    # + ctx - Request context
    # + typeName - Event type name to delete
    # + return - Success or error
    resource function delete event\-types/[string typeName](http:RequestContext ctx)
        returns http:NoContent|http:InternalServerError|http:NotFound|http:Forbidden|http:BadRequest {

        authorization:CustomJwtPayload|error invokerInfo = ctx.getWithType(authorization:HEADER_USER_INFO);
        if invokerInfo is error {
            log:printError(USER_INFO_HEADER_NOT_FOUND_ERROR, invokerInfo);
            return <http:InternalServerError>{
                body: {
                    message: USER_INFO_HEADER_NOT_FOUND_ERROR
                }
            };
        }

        boolean isGeneralAdmin = authorization:checkPermissions([authorization:authorizedRoles.generalAdminRole], invokerInfo.groups);
        if !isGeneralAdmin {
            return <http:Forbidden>{
                body: {
                    message: "Only General Admins can delete event types!"
                }
            };
        }

        database:ConferenceEventType|error? eventType = database:fetchConferenceEventTypeByName(typeName);
        if eventType is error {
            string customError = "Error occurred while fetching event type!";
            log:printError(customError, eventType);
            return <http:InternalServerError>{
                body: {
                    message: customError
                }
            };
        }
        if eventType is () {
            return <http:NotFound>{
                body: {
                    message: "Event type not found"
                }
            };
        }

        boolean isSystem = eventType.category == database:SESSION || eventType.category == database:O2BAR;
        if isSystem {
            return <http:BadRequest>{
                body: {
                    message: "System event types (SESSION, O2BAR) cannot be deleted"
                }
            };
        }

        error? deleteError = database:deleteConferenceEventType(typeName);
        if deleteError is error {
            string errorMessage = deleteError.message();
            if errorMessage == "Event type not found" {
                return <http:NotFound>{
                    body: {
                        message: errorMessage
                    }
                };
            }
            string customError = "Error occurred while deleting event type!";
            log:printError(customError, deleteError);
            return <http:InternalServerError>{
                body: {
                    message: customError
                }
            };
        }

        return http:NO_CONTENT;
    }
}
