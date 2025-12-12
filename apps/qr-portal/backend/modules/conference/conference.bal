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

# Fetch active sessions from the conference backend.
#
# + return - Array of active sessions or error
public isolated function fetchActiveSessions() returns Session[]|error {
    http:Response response = check conferenceClient->get("/sessions/current");
    
    if response.statusCode != http:STATUS_OK {
        return error(string `Conference backend returned status ${response.statusCode}`);
    }
    
    json payload = check response.getJsonPayload();
    
    SessionPresenters[] sessionPresenters = check payload.fromJsonWithType();
    
    // Only take the first presenter for each session
    Session[] sessions = [];
    foreach SessionPresenters sessionWithPresenters in sessionPresenters {
        string presenter = "";
        if sessionWithPresenters.presenters.length() > 0 {
            presenter = sessionWithPresenters.presenters[0];
        }
        
        sessions.push({
            id: sessionWithPresenters.id,
            name: sessionWithPresenters.name,
            presenter
        });
    }
    
    return sessions;
}
