# QR Portal API

## Version: 1.0.0

**Base URL:** `{server}:{port}/`  
**Default:** `http://localhost:9090/`

---

## Endpoints

### 1. Get User Information

**GET** `/user-info`

**Summary:** Fetch logged-in user's details with privileges.

**Responses:**

| Status | Description         | Schema                        |
| ------ | ------------------- | ----------------------------- |
| 200    | OK                  | [UserInfo](#userinfo)         |
| 500    | InternalServerError | -                             |

**Sample Response (200):**

```json
{
  "email": "user@example.com",
  "privileges": [101, 102]
}
```

**Privilege Codes:**
- `101` - O2 Bar Admin
- `102` - Session Admin

---

### 2. Get Active Sessions

**GET** `/sessions`

**Summary:** Fetch all active sessions from the conference backend.

**Responses:**

| Status | Description         | Schema              |
| ------ | ------------------- | ------------------- |
| 200    | OK                  | Array of [Session](#session) |
| 500    | InternalServerError | -                   |

**Sample Response (200):**

```json
[
  {
    "id": "1",
    "name": "Opening Keynote: The Future of Technology",
    "presenters": ["Dr. Jane Smith", "Dr. John Doe"]
  },
  {
    "id": "2",
    "name": "Workshop: Building Scalable Systems",
    "presenters": ["John Doe"]
  }
]
```

---

### 3. Create a New QR Code

**POST** `/qr-codes`

**Summary:** Create a new QR code with session or O2 bar information.

**Authorization:**
- **Session QR**: Requires Session Admin role
- **O2 Bar QR**: Requires O2 Bar Admin or Employee role (employees can only create for their own email)

**Request Body Example (Session):**

```json
{
  "info": {
    "eventType": "SESSION",
    "sessionId": "1"
  },
  "description": "Keynote Session QR"
}
```

**Request Body Example (O2 Bar):**

```json
{
  "info": {
    "eventType": "O2BAR",
    "email": "contact@example.com"
  },
  "description": "O2 Bar Networking QR"
}
```

**Responses:**

| Status | Description         | Schema                        |
| ------ | ------------------- | ----------------------------- |
| 201    | Created             | `{ "qrId": "uuid" }`          |
| 400    | BadRequest          | Duplicate QR or validation error |
| 403    | Forbidden           | Insufficient permissions      |
| 500    | InternalServerError | -                             |

**Sample Response (201):**

```json
{
  "qrId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

### 4. Get QR Code by ID

**GET** `/qr-codes/{id}`

**Summary:** Fetch a specific QR code by its UUID.

**Authorization:** None required (public endpoint)

**Parameters:**

| Name | In   | Description            | Required | Type   |
| ---- | ---- | ---------------------- | -------- | ------ |
| id   | path | UUID of the QR code    | true     | string |

**Responses:**

| Status | Description         | Schema                        |
| ------ | ------------------- | ----------------------------- |
| 200    | OK                  | [ConferenceQrCode](#conferenceqrcode) |
| 404    | NotFound            | -                             |
| 500    | InternalServerError | -                             |

**Sample Response (200):**

```json
{
  "qrId": "550e8400-e29b-41d4-a716-446655440000",
  "info": {
    "eventType": "SESSION",
    "sessionId": "1"
  },
  "description": "Keynote Session QR",
  "createdBy": "user@example.com",
  "createdOn": "2025-01-15T10:00:00"
}
```

---

### 5. Get All QR Codes

**GET** `/qr-codes?limit={n}&offset={n}`

**Summary:** Fetch QR codes based on user role with pagination.

**Authorization & Filtering:**
- **O2 Bar Admin**: Sees all O2 Bar QR codes
- **Session Admin**: Sees all Session QR codes
- **Employee**: Sees only their own O2 Bar QR code

**Query Parameters:**

| Name   | In    | Description                 | Required | Type |
| ------ | ----- | --------------------------- | -------- | ---- |
| limit  | query | Number of records to fetch  | false    | int  |
| offset | query | Offset for pagination       | false    | int  |

**Responses:**

| Status | Description         | Schema                              |
| ------ | ------------------- | ----------------------------------- |
| 200    | OK                  | [ConferenceQrCodesResponse](#conferenceqrcodesresponse) |
| 500    | InternalServerError | -                                   |

**Sample Response (200):**

```json
{
  "totalCount": 2,
  "qrs": [
    {
      "qrId": "550e8400-e29b-41d4-a716-446655440000",
      "info": {
        "eventType": "SESSION",
        "sessionId": "1"
      },
      "description": "Keynote Session QR",
      "createdBy": "admin@example.com",
      "createdOn": "2025-01-15T10:00:00"
    },
    {
      "qrId": "660e8400-e29b-41d4-a716-446655440001",
      "info": {
        "eventType": "O2BAR",
        "email": "contact@example.com"
      },
      "description": "O2 Bar Networking QR",
      "createdBy": "admin@example.com",
      "createdOn": "2025-01-15T11:00:00"
    }
  ]
}
```

---

### 6. Delete QR Code

**DELETE** `/qr-codes/{id}`

**Summary:** Delete a QR code by its UUID. Users can only delete QR codes they created.

**Parameters:**

| Name | In   | Description            | Required | Type   |
| ---- | ---- | ---------------------- | -------- | ------ |
| id   | path | UUID of the QR code    | true     | string |

**Responses:**

| Status | Description                           | Schema |
| ------ | ------------------------------------- | ------ |
| 204    | NoContent                             | -      |
| 403    | Forbidden (not the creator)           | -      |
| 404    | NotFound                              | -      |
| 500    | InternalServerError                   | -      |

**Sample Response (204):**

- Status: No Content
- Empty body

---

## Schemas

### Session

```json
{
  "id": "1",
  "name": "Opening Keynote: The Future of Technology",
  "presenter": "Dr. Jane Smith"
}
```

**Fields:**
- `id`: Session identifier (string)
- `name`: Session title/name (string)
- `presenter`: Name of the presenter(s) (string)

---

### UserInfo

```json
{
  "email": "user@example.com",
  "privileges": [101, 102]
}
```

**Fields:**
- `email`: User's email address (string)
- `privileges`: Array of privilege codes (integer array)
  - `101` = O2 Bar Admin privilege
  - `102` = Session Admin privilege

---

### CreateQrCodePayload

```json
{
  "info": {
    "eventType": "SESSION",
    "sessionId": "1"
  },
  "description": "Optional description of the QR code"
}
```

### QrCodeInfoSession

```json
{
  "eventType": "SESSION",
  "sessionId": "1"
}
```

### QrCodeInfoO2Bar

```json
{
  "eventType": "O2BAR",
  "email": "contact@example.com"
}
```

### ConferenceQrCode

```json
{
  "qrId": "550e8400-e29b-41d4-a716-446655440000",
  "info": {
    "eventType": "SESSION",
    "sessionId": "1"
  },
  "description": "Keynote Session QR",
  "createdBy": "user@example.com",
  "createdOn": "2025-01-15T10:00:00"
}
```

### ConferenceQrCodesResponse

```json
{
  "totalCount": 2,
  "qrs": [
    {
      "qrId": "550e8400-e29b-41d4-a716-446655440000",
      "info": {
        "eventType": "SESSION",
        "sessionId": "1"
      },
      "description": "Keynote Session QR",
      "createdBy": "user@example.com",
      "createdOn": "2025-01-15T10:00:00"
    }
  ]
}
```

### QrCodeInfo

The `info` field is a single object (not an array) that can be either `QrCodeInfoSession` or `QrCodeInfoO2Bar`:

**For Session Type:**
- `eventType`: Must be `"SESSION"`
- `sessionId`: String identifier for the session (required, non-empty)

**For O2 Bar Type:**
- `eventType`: Must be `"O2BAR"`
- `email`: Valid email address (required)

**Notes:**
- The `qrId` is a UUID v4 string generated automatically
- The `description` field is optional
- The `createdBy` field is automatically set from the authenticated user's email
- The `createdOn` field is automatically set by the database
- Duplicate QR codes are prevented (one QR per email for O2 Bar, one QR per session for Sessions)
