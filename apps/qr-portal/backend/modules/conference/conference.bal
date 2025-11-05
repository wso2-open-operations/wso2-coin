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
import ballerina/http;
import ballerina/log;

# Fetch active sessions from the conference backend.
#
# + return - Array of active sessions or error
public isolated function fetchActiveSessions() returns Session[]|error {
    http:Response|http:ClientError response = conferenceClient->get("/sessions/active");
    
    if response is http:ClientError {
        string customError = "Error occurred while fetching active sessions from conference backend!";
        log:printError(customError, response);
        return error(customError);
    }
    
    if response.statusCode != http:STATUS_OK {
        string customError = string `Conference backend returned status ${response.statusCode}`;
        log:printError(customError);
        return error(customError);
    }
    
    json|error payload = response.getJsonPayload();
    if payload is error {
        string customError = "Error occurred while parsing conference backend response!";
        log:printError(customError, payload);
        return error(customError);
    }
    
    Session[]|error sessions = payload.fromJsonWithType();
    if sessions is error {
        string customError = "Error occurred while deserializing active sessions!";
        log:printError(customError, sessions);
        return error(customError);
    }
    
    return sessions;
}
