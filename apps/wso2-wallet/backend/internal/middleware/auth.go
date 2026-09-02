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

// Package middleware provides the HTTP middleware chain: auth, CORS, correlation,
// request logging and security headers.
package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"

	"github.com/wso2/wso2-coin/apps/wso2-wallet/backend/internal/response"
)

const (
	assertionHeader = "X-Jwt-Assertion"
	healthPath      = "/health"
)

// UserInfo is the authenticated caller identity.
type UserInfo struct {
	Email   string
	Subject string
}

type contextKey string

const userInfoKey contextKey = "user-info"

// UserInfoFromContext returns the caller identity, or nil when unauthenticated.
func UserInfoFromContext(ctx context.Context) *UserInfo {
	v, _ := ctx.Value(userInfoKey).(*UserInfo)
	return v
}

// WithUserInfo attaches a caller identity to the context.
func WithUserInfo(ctx context.Context, user *UserInfo) context.Context {
	return context.WithValue(ctx, userInfoKey, user)
}

type jwtClaims struct {
	Email string `json:"email"`
	jwt.RegisteredClaims
}

// Auth reads the gateway-supplied JWT, extracts the caller email, and attaches it
// to the request context. The token is decoded (not re-verified): the service runs
// behind the Choreo gateway, which validates the token before forwarding it.
func Auth(next http.Handler) http.Handler {
	parser := jwt.NewParser()
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == healthPath {
			next.ServeHTTP(w, r)
			return
		}

		token := extractToken(r)
		if token == "" {
			response.WriteError(w, http.StatusUnauthorized, response.ErrMsgUnauthorized)
			return
		}

		var claims jwtClaims
		if _, _, err := parser.ParseUnverified(token, &claims); err != nil {
			response.WriteError(w, http.StatusUnauthorized, response.ErrMsgUnauthorized)
			return
		}
		email := strings.TrimSpace(claims.Email)
		if email == "" {
			response.WriteError(w, http.StatusUnauthorized, response.ErrMsgUnauthorized)
			return
		}

		user := &UserInfo{Email: email, Subject: claims.Subject}
		next.ServeHTTP(w, r.WithContext(WithUserInfo(r.Context(), user)))
	})
}

func extractToken(r *http.Request) string {
	if t := r.Header.Get(assertionHeader); t != "" {
		return t
	}
	if auth := r.Header.Get("Authorization"); strings.HasPrefix(auth, "Bearer ") {
		return strings.TrimPrefix(auth, "Bearer ")
	}
	return ""
}
