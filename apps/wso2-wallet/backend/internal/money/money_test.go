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

package money

import "testing"

func TestParseAndFormatUnits(t *testing.T) {
	tests := []struct {
		name      string
		in        string
		wantFmt   string
		wantError bool
	}{
		{name: "whole", in: "10", wantFmt: "10.000000000"},
		{name: "fractional", in: "10.5", wantFmt: "10.500000000"},
		{name: "smallest unit", in: "0.000000001", wantFmt: "0.000000001"},
		{name: "zero", in: "0", wantFmt: "0.000000000"},
		{name: "large", in: "1000000", wantFmt: "1000000.000000000"},
		{name: "too many decimals", in: "1.0000000001", wantError: true},
		{name: "not a number", in: "abc", wantError: true},
		{name: "empty", in: "", wantError: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			units, err := ParseUnits(tt.in)
			if tt.wantError {
				if err == nil {
					t.Fatalf("ParseUnits(%q) = nil error, want error", tt.in)
				}
				return
			}
			if err != nil {
				t.Fatalf("ParseUnits(%q) error: %v", tt.in, err)
			}
			if got := FormatUnits(units); got != tt.wantFmt {
				t.Errorf("FormatUnits = %q, want %q", got, tt.wantFmt)
			}
		})
	}
}
