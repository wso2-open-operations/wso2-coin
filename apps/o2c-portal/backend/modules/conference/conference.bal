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
import ballerina/lang.regexp;

# Fetch active sessions from the conference backend.
#
# + return - Array of active sessions or error
public isolated function fetchActiveSessions() returns Session[]|error {
    http:Response response = check conferenceClient->get("/sessions/current");
    
    if response.statusCode != http:STATUS_OK {
        return error(string `Conference backend returned status ${response.statusCode}`);
    }
    
    json payload = check response.getJsonPayload();
    
    json[] payloadArr = check payload.ensureType();
    Session[] sessions = from json s in payloadArr
        let map<json> sm = check s.ensureType()
        select {
            id: check sm.id.ensureType(),
            name: check sm.title.ensureType(),
            presenters: check sm.presenters.ensureType()
        };
    
    return sessions;
}

# Fetch partner domains from the conference backend's app_config.
#
# + return - Array of partner domains (strings) or error
public isolated function fetchPartnerDomains() returns string[]|error {
    http:Response response = check conferenceClient->get("/app-configs");
    
    if response.statusCode != http:STATUS_OK {
        return error(string `Conference backend returned status ${response.statusCode}`);
    }
    
    json payload = check response.getJsonPayload();
    AppConfig[] configs = check payload.cloneWithType();
    string[] domains = from AppConfig config in configs
        where config.key == PARTNER_DOMAINS_KEY
        from string part in regexp:split(re `,`, config.value)
        let string trimmed = part.trim()
        where trimmed.length() > 0
        select trimmed;
    return domains;
}

