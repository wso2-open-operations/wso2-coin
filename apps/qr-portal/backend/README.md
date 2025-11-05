# QR Portal API

## Version: 1.0.0

**Base URL:** `{server}:{port}/`  
**Default:** `http://localhost:9090/`

---

## Endpoints

### 1. Get Active Sessions

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
    "presenter": "Dr. Jane Smith"
  },
  {
    "id": "2",
    "name": "Workshop: Building Scalable Systems",
    "presenter": "John Doe"
  }
]
```

---

### 2. Create a New QR Code

**POST** `/qr`

**Summary:** Create a new QR code with session or O2 bar information.

**Request Body Example:**

```json
{
  "info": [
    {
      "eventType": "SESSION",
      "sessionId": "1"
    }
  ],
  "description": "Keynote Session QR"
}
```

**Responses:**

| Status | Description         | Schema                        |
| ------ | ------------------- | ----------------------------- |
| 200    | OK                  | [ConferenceQR](#conferenceqr) |
| 400    | BadRequest          | -                             |
| 500    | InternalServerError | -                             |

**Sample Response (200):**

```json
{
  "qrId": "550e8400-e29b-41d4-a716-446655440000",
  "info": [
    {
      "eventType": "SESSION",
      "sessionId": "1"
    }
  ],
  "description": "Keynote Session QR",
  "createdBy": "user@example.com",
  "createdOn": "2025-01-15T10:00:00"
}
```

**Alternative Request Body (O2 Bar):**

```json
{
  "info": [
    {
      "eventType": "O2BAR",
      "email": "contact@example.com"
    }
  ],
  "description": "O2 Bar Networking QR"
}
```

---

### 3. Get QR Code by ID

**GET** `/qr/{qrId}`

**Summary:** Fetch a specific QR code by its UUID.

**Parameters:**

| Name | In   | Description            | Required | Type   |
| ---- | ---- | ---------------------- | -------- | ------ |
| qrId | path | UUID of the QR code    | true     | string |

**Responses:**

| Status | Description         | Schema                        |
| ------ | ------------------- | ----------------------------- |
| 200    | OK                  | [ConferenceQR](#conferenceqr) |
| 404    | NotFound            | -                             |
| 500    | InternalServerError | -                             |

**Sample Response (200):**

```json
{
  "qrId": "550e8400-e29b-41d4-a716-446655440000",
  "info": [
    {
      "eventType": "SESSION",
      "sessionId": "1"
    }
  ],
  "description": "Keynote Session QR",
  "createdBy": "user@example.com",
  "createdOn": "2025-01-15T10:00:00"
}
```

---

### 4. Get All QR Codes

**GET** `/qrs?createdBy={email}&limit={n}&offset={n}`

**Summary:** Fetch all QR codes with optional filtering and pagination.

**Query Parameters:**

| Name      | In    | Description                  | Required | Type   |
| --------- | ----- | ---------------------------- | -------- | ------ |
| createdBy | query | Filter by creator email      | false    | string |
| limit     | query | Number of records to fetch    | false    | int    |
| offset    | query | Offset for pagination        | false    | int    |

**Responses:**

| Status | Description         | Schema                              |
| ------ | ------------------- | ----------------------------------- |
| 200    | OK                  | [ConferenceQRsResponse](#conferenceqrsresponse) |
| 500    | InternalServerError | -                                   |

**Sample Response (200):**

```json
{
  "totalCount": 2,
  "qrs": [
    {
      "qrId": "550e8400-e29b-41d4-a716-446655440000",
      "info": [
        {
          "eventType": "SESSION",
          "sessionId": "1"
        }
      ],
      "description": "Keynote Session QR",
      "createdBy": "user@example.com",
      "createdOn": "2025-01-15T10:00:00"
    },
    {
      "qrId": "660e8400-e29b-41d4-a716-446655440001",
      "info": [
        {
          "eventType": "O2BAR",
          "email": "contact@example.com"
        }
      ],
      "description": "O2 Bar Networking QR",
      "createdBy": "user@example.com",
      "createdOn": "2025-01-15T11:00:00"
    }
  ]
}
```

---

### 5. Delete QR Code

**DELETE** `/qr/{qrId}`

**Summary:** Delete a QR code by its UUID.

**Parameters:**

| Name | In   | Description            | Required | Type   |
| ---- | ---- | ---------------------- | -------- | ------ |
| qrId | path | UUID of the QR code    | true     | string |

**Responses:**

| Status | Description         | Schema |
| ------ | ------------------- | ------ |
| 204    | NoContent           | -      |
| 404    | NotFound            | -      |
| 500    | InternalServerError | -      |

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

### CreateQRPayload

```json
{
  "info": [
    {
      "eventType": "SESSION",
      "sessionId": "1"
    }
  ],
  "description": "Optional description of the QR code"
}
```

### QRInfoSession

```json
{
  "eventType": "SESSION",
  "sessionId": "1"
}
```

### QRInfoO2Bar

```json
{
  "eventType": "O2BAR",
  "email": "contact@example.com"
}
```

### ConferenceQR

```json
{
  "qrId": "550e8400-e29b-41d4-a716-446655440000",
  "info": [
    {
      "eventType": "SESSION",
      "sessionId": "1"
    }
  ],
  "description": "Keynote Session QR",
  "createdBy": "user@example.com",
  "createdOn": "2025-01-15T10:00:00"
}
```

### ConferenceQRsResponse

```json
{
  "totalCount": 2,
  "qrs": [
    {
      "qrId": "550e8400-e29b-41d4-a716-446655440000",
      "info": [
        {
          "eventType": "SESSION",
          "sessionId": "1"
        }
      ],
      "description": "Keynote Session QR",
      "createdBy": "user@example.com",
      "createdOn": "2025-01-15T10:00:00"
    }
  ]
}
```

### QRInfo

The `info` field is an array that can contain either `QRInfoSession` or `QRInfoO2Bar` objects:

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
