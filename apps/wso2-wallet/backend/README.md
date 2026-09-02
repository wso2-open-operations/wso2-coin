# WSO2 Wallet Backend

REST service for the WSO2 Wallet microapp. It manages a user's wallets, balances and
transfers, backed by MySQL. Stored balances and transaction amounts are encrypted at the
application layer (AES-256-GCM). Deployed on Choreo; the caller's identity is taken from
the gateway-supplied `X-Jwt-Assertion` header.

## Requirements

- Go 1.25+
- MySQL 8.0+

## Setup

```bash
# 1. Apply the schema.
mysql -h <host> -u <user> -p <database> < resources/schema.sql

# 2. Configure.
cp .env.example .env   # fill in DB_*, ENCRYPTION_KEY, INITIAL_COINS_FUNDING_WALLET

# 3. Run.
go run ./cmd/server
```

## Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | no | `:8081` | Listen address |
| `CORS_ALLOWED_ORIGIN` | no | — | Allowed CORS origin; empty denies cross-origin requests |
| `JWT_JWKS_URL` | no | — | JWKS endpoint for token verification; empty decodes without verifying (local dev only) |
| `JWT_ISSUER` | no | — | Expected token issuer (`iss`), checked when set |
| `JWT_AUDIENCE` | no | — | Expected token audience (`aud`), checked when set |
| `DB_HOST` / `DB_PORT` | no | `localhost` / `3306` | MySQL host/port |
| `DB_USER` | yes | — | MySQL user |
| `DB_PASSWORD` | no | — | MySQL password |
| `DB_NAME` | yes | — | Database name |
| `ENCRYPTION_KEY` | yes | — | AES-256 key, 32 bytes base64 (`openssl rand -base64 32`) |
| `INITIAL_COINS_ENABLED` | no | `true` | Grant coins on a user's first wallet |
| `INITIAL_COINS_AMOUNT` | no | `10` | Amount to grant |
| `INITIAL_COINS_FUNDING_WALLET` | yes (if enabled) | — | Wallet the grant is debited from |
| `INITIAL_COINS_EMAIL_DOMAIN` | no | `wso2.com` | Domain eligible for the grant |
| `MAINTENANCE_MODE` | no | `false` | Show the client maintenance screen |
| `MAINTENANCE_MESSAGE` | no | — | Message shown when maintenance mode is on |

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Service liveness |
| `GET` | `/api/v1/wallets` | List the caller's wallets |
| `POST` | `/api/v1/wallets` | Create a wallet |
| `POST` | `/api/v1/wallets/{address}/set-primary` | Set the default wallet |
| `GET` | `/api/v1/wallets/{address}/balance` | Wallet balance |
| `GET` | `/api/v1/wallets/{address}/transactions` | Wallet history (paginated) |
| `GET` | `/api/v1/wallets/{address}/health` | Wallet integrity |
| `POST` | `/api/v1/transfers` | Transfer between wallets |

See `openapi.yaml` for the full contract.

## Layout

```
cmd/server         entrypoint + server wiring
internal/config    environment configuration
internal/crypto    AES-256-GCM field encryption
internal/money     fixed-point amount math
internal/middleware auth, CORS, correlation, logging, security headers
internal/model     API request/response types
internal/wallet    handler -> service -> repository
resources/         schema
```

## Test

```bash
go test -race ./...
```
