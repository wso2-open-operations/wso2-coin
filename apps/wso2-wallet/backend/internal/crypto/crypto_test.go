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

package crypto

import "testing"

func testKey() []byte {
	key := make([]byte, KeySize)
	for i := range key {
		key[i] = byte(i)
	}
	return key
}

func TestEncryptDecryptRoundTrip(t *testing.T) {
	enc, err := New(testKey())
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	ciphertext, err := enc.Encrypt("100.5", "o2c:balance:0xabc")
	if err != nil {
		t.Fatalf("Encrypt: %v", err)
	}
	if ciphertext == "100.5" {
		t.Fatal("ciphertext equals plaintext")
	}
	got, err := enc.Decrypt(ciphertext, "o2c:balance:0xabc")
	if err != nil {
		t.Fatalf("Decrypt: %v", err)
	}
	if got != "100.5" {
		t.Errorf("decrypted = %q, want %q", got, "100.5")
	}
}

func TestDecryptWrongAADFails(t *testing.T) {
	enc, _ := New(testKey())
	ciphertext, _ := enc.Encrypt("100.5", "o2c:balance:0xabc")
	if _, err := enc.Decrypt(ciphertext, "o2c:balance:0xdef"); err == nil {
		t.Error("Decrypt under wrong AAD succeeded, want authentication failure")
	}
}

func TestNewRejectsWrongKeySize(t *testing.T) {
	if _, err := New(make([]byte, 16)); err == nil {
		t.Error("New with 16-byte key succeeded, want error")
	}
}
