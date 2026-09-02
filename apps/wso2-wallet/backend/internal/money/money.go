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

// Package money handles fixed-point amounts as integer base units, avoiding floats.
package money

import (
	"fmt"
	"math/big"
	"strings"
)

// Decimals is the number of fractional digits an amount carries.
const Decimals = 9

var base = new(big.Int).Exp(big.NewInt(10), big.NewInt(Decimals), nil)

// ParseUnits converts a decimal string (e.g. "10.5") into base units.
func ParseUnits(s string) (*big.Int, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil, fmt.Errorf("empty amount")
	}
	neg := strings.HasPrefix(s, "-")
	s = strings.TrimPrefix(s, "-")

	whole, frac, _ := strings.Cut(s, ".")
	if len(frac) > Decimals {
		return nil, fmt.Errorf("amount has more than %d decimal places", Decimals)
	}
	frac += strings.Repeat("0", Decimals-len(frac))

	digits := whole + frac
	if digits == "" {
		return nil, fmt.Errorf("invalid amount %q", s)
	}
	n, ok := new(big.Int).SetString(digits, 10)
	if !ok {
		return nil, fmt.Errorf("invalid amount %q", s)
	}
	if neg {
		n.Neg(n)
	}
	return n, nil
}

// FormatUnits renders base units as a fixed-point decimal string with Decimals digits.
func FormatUnits(raw *big.Int) string {
	neg := raw.Sign() < 0
	abs := new(big.Int).Abs(raw)

	whole := new(big.Int).Quo(abs, base)
	frac := new(big.Int).Mod(abs, base)
	fracStr := fmt.Sprintf("%0*s", Decimals, frac.String())

	var b strings.Builder
	if neg {
		b.WriteByte('-')
	}
	b.WriteString(whole.String())
	b.WriteByte('.')
	b.WriteString(fracStr)
	return b.String()
}
