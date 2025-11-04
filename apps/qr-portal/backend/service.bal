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
    # + return - authorization:JwtInterceptor, BadRequestInterceptor
    public function createInterceptors() returns http:Interceptor[] =>
        [new authorization:JwtInterceptor(), new BadRequestInterceptor()];

    # Create a new QR code.
    #
    # + payload - Payload containing the QR details
    # + return - Created QR or error
    resource function post qr(http:RequestContext ctx, CreateQRPayload payload)
        returns database:ConferenceQR|http:InternalServerError|http:BadRequest {

        authorization:CustomJwtPayload|error invokerInfo = ctx.getWithType(authorization:HEADER_USER_INFO);
        if invokerInfo is error {
            log:printError(USER_INFO_HEADER_NOT_FOUND_ERROR, invokerInfo);
            return <http:InternalServerError>{
                body: {
                    message: USER_INFO_HEADER_NOT_FOUND_ERROR
                }
            };
        }

        string qrId = uuid:createType4AsString();
        
        database:AddConferenceQRPayload dbPayload = {
            info: payload.info,
            description: payload.description,
            createdBy: invokerInfo.email
        };

        error? qrError = database:addConferenceQR(qrId, dbPayload, invokerInfo.email);
        if qrError is error {
            string customError = "Error occurred while creating QR code!";
            log:printError(customError, qrError);
            return <http:InternalServerError>{
                body: {
                    message: customError
                }
            };
        }

        database:ConferenceQR|error? createdQR = database:fetchConferenceQR(qrId);
        if createdQR is error {
            string customError = "QR created but error occurred while fetching it!";
            log:printError(customError, createdQR);
            return <http:InternalServerError>{
                body: {
                    message: customError
                }
            };
        }
        if createdQR is () {
            return <http:InternalServerError>{
                body: {
                    message: "QR created but not found!"
                }
            };
        }

        return createdQR;
    }

    # Fetch a specific QR by ID.
    #
    # + qrId - UUID of the QR code
    # + return - QR details or error
    resource function get qr/[string qrId](http:RequestContext ctx)
        returns database:ConferenceQR|http:InternalServerError|http:NotFound {

        authorization:CustomJwtPayload|error invokerInfo = ctx.getWithType(authorization:HEADER_USER_INFO);
        if invokerInfo is error {
            log:printError(USER_INFO_HEADER_NOT_FOUND_ERROR, invokerInfo);
            return <http:InternalServerError>{
                body: {
                    message: USER_INFO_HEADER_NOT_FOUND_ERROR
                }
            };
        }

        database:ConferenceQR|error? qr = database:fetchConferenceQR(qrId);
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

        // Any authorized user can view any QR by ID
        return qr;
    }

    # Fetch all QRs with optional filters.
    #
    # + ctx - Request context
    # + createdBy - Optional filter by creator email (must match user's email)
    # + 'limit - Optional limit for pagination
    # + offset - Optional offset for pagination
    # + return - List of QRs or error
    resource function get qrs(http:RequestContext ctx, string? createdBy = (), int? 'limit = (), int? offset = ())
        returns database:ConferenceQRsResponse|http:InternalServerError|http:Forbidden {

        authorization:CustomJwtPayload|error invokerInfo = ctx.getWithType(authorization:HEADER_USER_INFO);
        if invokerInfo is error {
            log:printError(USER_INFO_HEADER_NOT_FOUND_ERROR, invokerInfo);
            return <http:InternalServerError>{
                body: {
                    message: USER_INFO_HEADER_NOT_FOUND_ERROR
                }
            };
        }

        string? filterCreatedBy = createdBy;
        if filterCreatedBy is string && filterCreatedBy != invokerInfo.email {
            return <http:Forbidden>{
                body: {
                    message: "You can only view your own QR codes!"
                }
            };
        }
        if filterCreatedBy is () {
            filterCreatedBy = invokerInfo.email;
        }

        database:ConferenceQRFilters filters = {
            createdBy: filterCreatedBy,
            'limit: 'limit,
            offset: offset
        };

        database:ConferenceQRsResponse|error qrsResponse = database:fetchConferenceQRs(filters);
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
    # + qrId - UUID of the QR code to delete
    # + return - Success or error
    resource function delete qr/[string qrId](http:RequestContext ctx)
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

        database:ConferenceQR|error? qr = database:fetchConferenceQR(qrId);
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

        if qr.createdBy != invokerInfo.email {
            return <http:Forbidden>{
                body: {
                    message: "You don't have permission to delete this QR code!"
                }
            };
        }

        error? deleteError = database:deleteConferenceQR(qrId);
        if deleteError is error {
            string customError = "Error occurred while deleting QR code!";
            log:printError(customError, deleteError);
            return <http:InternalServerError>{
                body: {
                    message: customError
                }
            };
        }

        return <http:NoContent>{};
    }
}
