// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
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

# Retrieve the employee data.
#
# + workEmail - Employee email
# + return - Employee object or Error if so
public isolated function fetchEmployee(string workEmail) returns Employee|error? {
    string document = string `
        query employeeQuery ($workEmail: String!) {
            employee(email: $workEmail) {
                employeeId
                workEmail
                firstName
                lastName
                jobRole
                employeeThumbnail
            }
        }
    `;

    SingleEmployeeResponse response = check hrClient->execute(document, {workEmail});
    Employee? employee = response.data.employee;
    
    return employee;
}

# Retrieve all employees with only email, firstName, and lastName.
#
# + return - Array of EmployeeBase objects or Error if so
public isolated function fetchAllEmployees() returns EmployeeBase[]|error {
    string document = string `
        query employeesQuery ($filter: EmployeeFilter, $limit: Int, $offset: Int) {
            employees(filter: $filter, limit: $limit, offset: $offset) {
                workEmail
                firstName
                lastName
            }
        }
    `;

    EmployeeBase[] employees = [];
    boolean fetchMore = true;
    int offset = 0;
    int defaultLimit = 500;

    while fetchMore {
        MultipleEmployeesResponse response = check hrClient->execute(
            document,
            {filter: {}, 'limit: defaultLimit, offset: offset}
        );
        EmployeeBase[] batch = response.data.employees;
        employees.push(...batch);
        fetchMore = batch.length() > 0;
        offset += defaultLimit;
    }
    
    return employees;
}
