# QR Portal Webapp

Web application for managing conference QR codes for sessions and O2 Bar events.

## Features

- Create QR codes for sessions or O2 Bar events
- View and manage QR codes in grid or list view
- Download QR codes as PNG images
- Search and filter QR codes
- Role-based access control (General Admin, Session Admin, O2 Bar Admin)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure the application:
   - Copy `public/config.js.local` to `public/config.js`
   - Update with your backend URL and Asgardeo credentials

## Development

```bash
npm run dev
```

The app will open at `http://localhost:3000`

## Build

```bash
npm run build
```

Builds the app for production to the `build` folder.
