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

package middleware

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/wso2/wso2-coin/apps/wso2-wallet/backend/internal/config"
)

func TestNewVerifierRequiresJWKS(t *testing.T) {
	// No JWKS URL and no explicit dev opt-in must fail (fail closed).
	if _, err := NewVerifier(context.Background(), config.JWTConfig{}); err == nil {
		t.Fatal("expected error when JWKS is unset and AllowInsecure is false")
	}
	// Explicit dev opt-in yields a decode-only verifier.
	v, err := NewVerifier(context.Background(), config.JWTConfig{AllowInsecure: true})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if v.Verified() {
		t.Fatal("decode-only verifier should report Verified() == false")
	}
}

func signToken(t *testing.T, key *rsa.PrivateKey, claims jwtClaims) string {
	t.Helper()
	tok := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	signed, err := tok.SignedString(key)
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}
	return signed
}

func baseClaims() jwtClaims {
	return jwtClaims{
		Email: "user@wso2.com",
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   "sub-123",
			Issuer:    "https://issuer.example",
			Audience:  jwt.ClaimStrings{"wallet"},
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
		},
	}
}

func TestVerifierParse(t *testing.T) {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	otherKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generate other key: %v", err)
	}
	kf := func(*jwt.Token) (interface{}, error) { return &key.PublicKey, nil }

	verifier := &Verifier{
		keyfunc:  kf,
		verified: true,
		issuer:   "https://issuer.example",
		audience: "wallet",
	}

	expired := baseClaims()
	expired.ExpiresAt = jwt.NewNumericDate(time.Now().Add(-time.Hour))
	wrongIssuer := baseClaims()
	wrongIssuer.Issuer = "https://evil.example"
	wrongAudience := baseClaims()
	wrongAudience.Audience = jwt.ClaimStrings{"other"}

	tests := []struct {
		name    string
		token   string
		wantErr bool
	}{
		{"valid", signToken(t, key, baseClaims()), false},
		{"wrong signing key", signToken(t, otherKey, baseClaims()), true},
		{"expired", signToken(t, key, expired), true},
		{"wrong issuer", signToken(t, key, wrongIssuer), true},
		{"wrong audience", signToken(t, key, wrongAudience), true},
		{"garbage", "not-a-jwt", true},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			claims, err := verifier.parse(tc.token)
			if tc.wantErr {
				if err == nil {
					t.Fatalf("expected error, got claims %+v", claims)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if claims.Email != "user@wso2.com" || claims.Subject != "sub-123" {
				t.Fatalf("unexpected claims: %+v", claims)
			}
		})
	}
}

func TestVerifierDecodeOnly(t *testing.T) {
	// With no keyfunc configured the verifier decodes without checking the signature.
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	v := &Verifier{}
	if v.Verified() {
		t.Fatal("decode-only verifier should report Verified() == false")
	}
	claims, err := v.parse(signToken(t, key, baseClaims()))
	if err != nil {
		t.Fatalf("decode-only parse failed: %v", err)
	}
	if claims.Email != "user@wso2.com" {
		t.Fatalf("unexpected email: %q", claims.Email)
	}
}
