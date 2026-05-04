# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a monorepo for the **WSO2 O2C Portal** — a conference QR code management system. It contains two apps under `apps/o2c-portal/`:
- **backend**: Ballerina REST microservice (port 9090)
- **webapp**: React/TypeScript frontend (port 3000)

## Commands

### Frontend (`apps/o2c-portal/webapp/`)
```bash
npm install          # Install dependencies
npm run dev          # Dev server on port 3000
npm run build        # Production build
npm run type-check   # TypeScript validation
npm run lint         # ESLint
npm run format       # Prettier
```

### Backend (`apps/o2c-portal/backend/`)
```bash
bal build            # Compile to JAR in target/
bal run              # Run the service
bal test             # Run tests
```

## Architecture

### Backend (Ballerina)

Entry point: `service.bal` — defines HTTP REST endpoints for user info, sessions, QR codes, and event types.

Modules under `modules/`:
- **authorization**: JWT interceptor and role-based privilege checking
- **database**: MySQL CRUD for QR codes and event types
- **conference**: Client for the external conference backend API
- **people**: GraphQL client for the WSO2 HR/people service (employee lookups)
- **gsheet**: Google Sheets integration

Runtime config in `Config.toml` (not committed — copied locally): database host, Asgardeo client credentials, conference API URL, and role privilege codes. The `Ballerina.toml` defines the package as org `wso2`, name `qr_portal`.

**Authorization model**: Three privilege codes enforced via JWT claims:
- `191` — General Admin (all QR codes, event types)
- `181` — Session Admin (session QR codes only)
- `171` — O2 Bar Admin (own O2 Bar QR codes only)

### Frontend (React/TypeScript)

Entry: `src/main.tsx`. State management via Redux Toolkit (`src/store/`). Routing via React Router DOM v7. Auth via Asgardeo React SDK.

Runtime config injected at `window.config` from `public/config.js` (copied locally from a template; not committed). Types defined in `src/config/config.ts`. Privilege codes mirrored in `src/config/constant.ts`.

UI built with MUI v7. Forms use Formik + Yup. HTTP calls via Axios. QR code generation via the `qrcode` package.

Path alias `@` maps to `src/` (configured in `vite.config.ts` and `tsconfig.json`).

## Key Config Files

| File | Purpose |
|------|---------|
| `apps/o2c-portal/backend/Config.toml` | Local runtime config (not committed) |
| `apps/o2c-portal/webapp/public/config.js` | Frontend runtime config (not committed) |
| `apps/o2c-portal/backend/README.md` | Full API reference with request/response examples |
| `apps/o2c-portal/webapp/README.md` | Frontend setup guide |
