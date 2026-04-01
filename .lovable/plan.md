

## Tally Prime Local Middleware (Windows Installer)

### Overview
Build a lightweight local HTTP API server that runs on the user's Windows PC alongside Tally Prime. It acts as a CORS-friendly bridge: the browser app calls the middleware on `localhost:3456`, which forwards requests to Tally's XML API on `localhost:9000` and returns parsed JSON. Distributed as a downloadable `.exe` installer.

### Architecture

```text
Browser (your web app)
   ↓ fetch("http://localhost:3456/api/customers")
Local Middleware (localhost:3456)
   ↓ POST XML to Tally (localhost:9000)
Tally Prime XML API
   ↓ XML response
Local Middleware
   ↓ Parse XML → JSON with CORS headers
Browser
   ↓ Import customers via useBulkImportCustomers
```

### What the Middleware Does
- Runs as a small HTTP server on `localhost:3456`
- Adds proper CORS headers so the browser can call it
- Exposes endpoints:
  - `GET /api/health` — check if middleware + Tally are running
  - `GET /api/customers` — fetch Sundry Debtors from Tally, return JSON
  - `GET /api/invoices` — (future) fetch sales vouchers
- Parses Tally XML responses into clean JSON
- Runs in system tray on Windows (start on boot optional)

### Technology
- **Node.js** standalone executable using `pkg` or `nexe` (compiles to single `.exe`)
- **Express** for HTTP server with CORS middleware
- **xml2js** for XML parsing
- Packaged with **Inno Setup** or **NSIS** for `.exe` installer

### Limitation: Cannot Build in Lovable
This middleware is a **standalone desktop application** — it cannot be built, compiled, or packaged within Lovable's browser-based environment. Lovable builds web apps, not native Windows executables.

### What We CAN Do in Lovable

#### 1. Generate the middleware source code as a downloadable package
- Create a complete Node.js project (server code, package.json, build scripts)
- Package it as a `.zip` the user downloads from the app
- Include README with build instructions (`npm install && npm run build` → produces `.exe`)

#### 2. Update `TallyImportDialog.tsx` to use the middleware
- Change fetch URL from `localhost:9000` (Tally direct) to `localhost:3456` (middleware)
- Remove CORS fallback logic since middleware handles CORS
- Add middleware download link in the dialog UI
- Health check endpoint to verify middleware is running

#### 3. Store middleware source in the project
- `public/tally-bridge/` folder with the Node.js middleware source
- Or generate it as a downloadable `.zip` from the dialog

### Changes in Lovable

| File | Change |
|------|--------|
| `public/tally-bridge/server.js` | Middleware source: Express server, Tally XML proxy, JSON parser |
| `public/tally-bridge/package.json` | Dependencies + build script using `pkg` |
| `public/tally-bridge/install.bat` | One-click install script: installs Node, deps, builds .exe |
| `public/tally-bridge/README.md` | Setup instructions |
| `src/components/forms/TallyImportDialog.tsx` | Point to middleware URL, add download/setup instructions, remove CORS fallback |

### User Flow
1. Open Customers → Import from Tally
2. Dialog shows "Download Tally Bridge" button if middleware not detected
3. User downloads `.zip`, extracts, runs `install.bat` on their Windows PC
4. Middleware starts on `localhost:3456`, connects to Tally on `localhost:9000`
5. User clicks "Connect" in dialog → middleware health check passes
6. User clicks "Fetch Customers" → middleware proxies Tally data as JSON
7. User selects and imports customers

### Technical Details (Middleware `server.js`)
- Express server on port 3456
- CORS: `Access-Control-Allow-Origin: *`
- `GET /api/health` → checks Tally connectivity, returns `{ tally: true/false }`
- `GET /api/customers` → sends Sundry Debtors XML to Tally, parses response, returns `[{ name, phone, address, area, gstin }]`
- Error handling with clear messages if Tally is not running

