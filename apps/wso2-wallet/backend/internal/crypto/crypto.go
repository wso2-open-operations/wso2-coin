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

// Package crypto provides authenticated field-level encryption for stored values.
//
// Each value is encrypted with AES-256-GCM under a fresh random nonce and an
// additional-authenticated-data (AAD) string that binds the ciphertext to its row.
// The stored representation is base64 of nonce || ciphertext || tag. A reader must
// supply the same AAD to decrypt; a ciphertext moved to a different row fails.
package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"fmt"
)

// KeySize is the required AES-256 key length in bytes.
const KeySize = 32

// Encryptor performs AES-256-GCM authenticated encryption.
type Encryptor struct {
	aead cipher.AEAD
}

// New returns an Encryptor for a 32-byte key.
func New(key []byte) (*Encryptor, error) {
	if len(key) != KeySize {
		return nil, fmt.Errorf("encryption key must be %d bytes, got %d", KeySize, len(key))
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("create cipher: %w", err)
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("create gcm: %w", err)
	}
	return &Encryptor{aead: aead}, nil
}

// Encrypt returns the base64 ciphertext of plaintext bound to aad.
func (e *Encryptor) Encrypt(plaintext, aad string) (string, error) {
	nonce := make([]byte, e.aead.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return "", fmt.Errorf("generate nonce: %w", err)
	}
	sealed := e.aead.Seal(nonce, nonce, []byte(plaintext), []byte(aad))
	return base64.StdEncoding.EncodeToString(sealed), nil
}

// Decrypt reverses Encrypt. It fails if the ciphertext was tampered with or if aad
// does not match the value used at encryption time.
func (e *Encryptor) Decrypt(encoded, aad string) (string, error) {
	sealed, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return "", fmt.Errorf("decode ciphertext: %w", err)
	}
	nonceSize := e.aead.NonceSize()
	if len(sealed) < nonceSize {
		return "", fmt.Errorf("ciphertext too short")
	}
	nonce, ct := sealed[:nonceSize], sealed[nonceSize:]
	plaintext, err := e.aead.Open(nil, nonce, ct, []byte(aad))
	if err != nil {
		return "", fmt.Errorf("authenticate ciphertext: %w", err)
	}
	return string(plaintext), nil
}
