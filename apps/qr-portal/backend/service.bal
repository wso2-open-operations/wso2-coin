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
import qr_portal.database;
import qr_portal.conference;

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
    public function createInterceptors() returns http:Interceptor[] =>
        [new authorization:JwtInterceptor()];

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
        if authorization:checkPermissions([authorization:authorizedRoles.O2_BAR_ADMIN_ROLE], invokerInfo.groups) {
            privileges.push(authorization:O2_BAR_ADMIN_PRIVILEGE);
        }
        if authorization:checkPermissions([authorization:authorizedRoles.SESSION_ADMIN_ROLE], invokerInfo.groups) {
            privileges.push(authorization:SESSION_ADMIN_PRIVILEGE);
        }
        if authorization:checkPermissions([authorization:authorizedRoles.EMPLOYEE_ROLE], invokerInfo.groups) {
            privileges.push(authorization:EMPLOYEE_PRIVILEGE);
        }

        return {
            email: invokerInfo.email,
            privileges: privileges
        };
    }

    # Fetch all active sessions from the conference backend.
    #
    # + return - Array of active sessions or error
    resource function get sessions(http:RequestContext ctx)
        returns conference:Session[]|http:InternalServerError {
        
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
    resource function post qr\-code(http:RequestContext ctx, CreateQrCodePayload payload)
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

        if payload.info is database:QrCodeInfoSession && payload.info.eventType != database:SESSION {
            return <http:BadRequest>{
                body: {
                    message: "Invalid event type. Use 'SESSION' when providing session id."
                }
            };
        }
        if payload.info is database:QrCodeInfoO2Bar && payload.info.eventType != database:O2BAR {
            return <http:BadRequest>{
                body: {
                    message: "Invalid event type. Use 'O2BAR' when providing email."
                }
            };
        }

        boolean isO2BarAdmin = authorization:checkPermissions([authorization:authorizedRoles.O2_BAR_ADMIN_ROLE], invokerInfo.groups);
        boolean isSessionAdmin = authorization:checkPermissions([authorization:authorizedRoles.SESSION_ADMIN_ROLE], invokerInfo.groups);
        boolean isEmployee = authorization:checkPermissions([authorization:authorizedRoles.EMPLOYEE_ROLE], invokerInfo.groups);

        // Handle O2 Bar QR creation
        if payload.info is database:QrCodeInfoO2Bar {
            database:QrCodeInfoO2Bar o2BarInfo = <database:QrCodeInfoO2Bar>payload.info;
            
            if !isO2BarAdmin && !isEmployee {
                return <http:Forbidden>{
                    body: {
                        message: "You don't have permission to create O2 Bar QR codes!"
                    }
                };
            }

            if isEmployee && !isO2BarAdmin && o2BarInfo.email != invokerInfo.email {
                return <http:Forbidden>{
                    body: {
                        message: "Employees can only create QR codes for their own email!"
                    }
                };
            }
        }

        // Handle Session QR creation
        if payload.info is database:QrCodeInfoSession {
            if !isSessionAdmin {
                return <http:Forbidden>{
                    body: {
                        message: "You don't have permission to create Session QR codes!"
                    }
                };
            }
        }

        // Check if QR already exists
        boolean|error qrExists = database:qrCodeExists(payload.info);
        if qrExists is error {
            string customError = "Error occurred while checking for existing QR code!";
            log:printError(customError, qrExists);
            return <http:InternalServerError>{
                body: {
                    message: customError
                }
            };
        }
        if qrExists {
            string identifier = payload.info is database:QrCodeInfoO2Bar 
                ? (<database:QrCodeInfoO2Bar>payload.info).email 
                : (<database:QrCodeInfoSession>payload.info).sessionId;
            return <http:BadRequest>{
                body: {
                    message: string `QR code already exists for: ${identifier}`
                }
            };
        }

        string qrId = uuid:createType4AsString();
        
        database:AddConferenceQrCodePayload dbPayload = {
            info: payload.info,
            description: payload.description,
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
                qrId: qrId
            }
        };
    }

    # Fetch a specific QR by ID.
    #
    # + id - UUID of the QR code
    # + return - QR details or error
    resource function get qr\-code/[string id](http:RequestContext ctx)
        returns database:ConferenceQrCode|http:InternalServerError|http:NotFound {

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
            return <http:NotFound>{
                body: {
                    message: "QR code not found!"
                }
            };
        }

        // All authorized users can view any QR by ID
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

        if authorization:checkPermissions([authorization:authorizedRoles.O2_BAR_ADMIN_ROLE], userInfo.groups) {
            filters.eventType = database:O2BAR;
        }
        else if authorization:checkPermissions([authorization:authorizedRoles.SESSION_ADMIN_ROLE], userInfo.groups) {
            filters.eventType = database:SESSION;
        }
        else if authorization:checkPermissions([authorization:authorizedRoles.EMPLOYEE_ROLE], userInfo.groups) {
            filters.createdBy = userInfo.email;
            filters.eventType = database:O2BAR;
        }
        else {
            filters.createdBy = userInfo.email;
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
    resource function delete qr\-code/[string id](http:RequestContext ctx)
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

        error? deleteError = database:deleteConferenceQrCode(qr.qrId);
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
}
