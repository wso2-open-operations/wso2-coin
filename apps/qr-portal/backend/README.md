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
- `101` - General Admin
- `102` - Session Admin
- `103` - Employee

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

**Summary:** Create a new QR code with session, O2 bar, or general event information.

**Authorization:**
- **Session QR**: Requires Session Admin role
- **O2 Bar QR**: Requires General Admin or Employee role (employees can only create for their own email)
- **General QR**: Requires any authenticated role (General Admin, Session Admin, or Employee)

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
  "description": "O2 Bar Networking QR",
  "coins": 10.50
}
```

**Request Body Example (General):**

```json
{
  "info": {
    "eventType": "GENERAL",
    "eventTypeName": "interview"
  },
  "description": "Interview QR Code",
  "coins": 15.00
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
  "coins": 10.50,
  "createdBy": "user@example.com",
  "createdOn": "2025-01-15T10:00:00"
}
```

---

### 5. Get All QR Codes

**GET** `/qr-codes?limit={n}&offset={n}`

**Summary:** Fetch QR codes based on user role with pagination.

**Authorization & Filtering:**
- **General Admin + Session Admin**: Sees all QR codes (no filters)
- **General Admin only**: Sees all O2 Bar QR codes
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
      "coins": 10.50,
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
      "coins": 5.00,
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

### 7. Get All Event Types

**GET** `/event-types`

**Summary:** Fetch all available event types (SESSION, O2BAR, and GENERAL subtypes).

**Authorization:** Requires authentication (any role)

**Responses:**

| Status | Description         | Schema                              |
| ------ | ------------------- | ----------------------------------- |
| 200    | OK                  | Array of [ConferenceEventType](#conferenceeventtype) |
| 500    | InternalServerError | -                                   |

**Sample Response (200):**

```json
[
  {
    "eventTypeName": "SESSION",
    "category": "SESSION",
    "description": "Session QR code",
    "defaultCoins": 10.00
  },
  {
    "eventTypeName": "O2BAR",
    "category": "O2BAR",
    "description": "O2 Bar QR code",
    "defaultCoins": 5.00
  },
  {
    "eventTypeName": "interview",
    "category": "GENERAL",
    "description": "Interview event",
    "defaultCoins": 15.00
  }
]
```

---

### 8. Create Event Type

**POST** `/event-types`

**Summary:** Create a new event type (GENERAL category subtypes only). SESSION and O2BAR types are predefined.

**Authorization:** Requires General Admin role

**Request Body Example:**

```json
{
  "eventTypeName": "voice cut",
  "category": "GENERAL",
  "description": "Voice cut event type",
  "defaultCoins": 20.00
}
```

**Responses:**

| Status | Description         | Schema                        |
| ------ | ------------------- | ----------------------------- |
| 201    | Created             | [AddConferenceEventTypePayload](#addconferenceeventtypepayload) |
| 400    | BadRequest          | Validation error              |
| 403    | Forbidden           | Insufficient permissions      |
| 500    | InternalServerError | -                             |

**Sample Response (201):**

```json
{
  "eventTypeName": "voice cut",
  "category": "GENERAL",
  "description": "Voice cut event type",
  "defaultCoins": 20.00
}
```

---

### 9. Update Event Type

**PUT** `/event-types/{typeName}`

**Summary:** Update an existing event type (can update default coins for SESSION, O2BAR, or GENERAL types).

**Authorization:** Requires General Admin role

**Parameters:**

| Name     | In   | Description            | Required | Type   |
| -------- | ---- | ---------------------- | -------- | ------ |
| typeName | path | Event type name        | true     | string |

**Request Body Example:**

```json
{
  "eventTypeName": "SESSION",
  "category": "SESSION",
  "description": "Updated session description",
  "defaultCoins": 12.00
}
```

**Responses:**

| Status | Description         | Schema                        |
| ------ | ------------------- | ----------------------------- |
| 200    | OK                  | [AddConferenceEventTypePayload](#addconferenceeventtypepayload) |
| 403    | Forbidden           | Insufficient permissions      |
| 404    | NotFound            | Event type not found          |
| 500    | InternalServerError | -                             |

---

### 10. Delete Event Type

**DELETE** `/event-types/{typeName}`

**Summary:** Delete an event type (GENERAL category subtypes only). SESSION and O2BAR types cannot be deleted.

**Authorization:** Requires General Admin role

**Parameters:**

| Name     | In   | Description            | Required | Type   |
| -------- | ---- | ---------------------- | -------- | ------ |
| typeName | path | Event type name        | true     | string |

**Responses:**

| Status | Description         | Schema |
| ------ | ------------------- | ------ |
| 204    | NoContent           | -      |
| 403    | Forbidden           | -      |
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
  - `101` = General Admin privilege (formerly O2 Bar Admin)
  - `102` = Session Admin privilege
  - `103` = Employee privilege

---

### CreateQrCodePayload

```json
{
  "info": {
    "eventType": "SESSION",
    "sessionId": "1"
  },
  "description": "Optional description of the QR code",
  "coins": 10.50
}
```

**Fields:**
- `info`: QR code information (QrCodeInfoSession, QrCodeInfoO2Bar, or QrCodeInfoGeneral)
- `description`: Optional description (string, nullable)
- `coins`: Coin amount for this QR code (decimal, required)

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

### QrCodeInfoGeneral

```json
{
  "eventType": "GENERAL",
  "eventTypeName": "interview"
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
  "coins": 10.50,
  "createdBy": "user@example.com",
  "createdOn": "2025-01-15T10:00:00"
}
```

**Fields:**
- `qrId`: UUID of the QR code (string)
- `info`: QR code information (QrCodeInfoSession, QrCodeInfoO2Bar, or QrCodeInfoGeneral)
- `description`: Optional description (string, nullable)
- `coins`: Coin amount for this QR code (decimal)
- `createdBy`: Email of the creator (string)
- `createdOn`: Creation timestamp (string)

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
      "coins": 10.50,
      "createdBy": "user@example.com",
      "createdOn": "2025-01-15T10:00:00"
    }
  ]
}
```

### QrCodeInfo

The `info` field is a single object (not an array) that can be `QrCodeInfoSession`, `QrCodeInfoO2Bar`, or `QrCodeInfoGeneral`:

**For Session Type:**
- `eventType`: Must be `"SESSION"`
- `sessionId`: String identifier for the session (required, non-empty)

**For O2 Bar Type:**
- `eventType`: Must be `"O2BAR"`
- `email`: Valid email address (required)

**For General Type:**
- `eventType`: Must be `"GENERAL"`
- `eventTypeName`: Event type name (required, non-empty, must match an existing event type)

### ConferenceEventType

```json
{
  "eventTypeName": "interview",
  "category": "GENERAL",
  "description": "Interview event type",
  "defaultCoins": 15.00
}
```

**Fields:**
- `eventTypeName`: Unique identifier for the event type (string)
- `category`: Category of the event type - `"SESSION"`, `"O2BAR"`, or `"GENERAL"` (string)
- `description`: Optional description (string, nullable)
- `defaultCoins`: Default coin amount for this event type (decimal)

### AddConferenceEventTypePayload

```json
{
  "eventTypeName": "voice cut",
  "category": "GENERAL",
  "description": "Voice cut event type",
  "defaultCoins": 20.00
}
```

**Fields:**
- `eventTypeName`: Unique identifier for the event type (string, required, non-empty)
- `category`: Category of the event type - `"SESSION"`, `"O2BAR"`, or `"GENERAL"` (string, required)
- `description`: Optional description (string, nullable)
- `defaultCoins`: Default coin amount for this event type (decimal, required)

**Notes:**
- The `qrId` is a UUID v4 string generated automatically
- The `description` field is optional
- The `coins` field is required when creating a QR code and can override the default coin amount for the selected event type
- The `createdBy` field is automatically set from the authenticated user's email
- The `createdOn` field is automatically set by the database
- Duplicate QR codes are prevented (one QR per email for O2 Bar, one QR per session for Sessions, one QR per eventTypeName for General)
- SESSION and O2BAR event types are predefined and cannot be deleted
- GENERAL category supports custom subtypes that can be created, updated, and deleted by General Admins
