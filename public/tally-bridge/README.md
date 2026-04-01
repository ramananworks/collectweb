# Tally Bridge

A lightweight local middleware that connects your browser app with Tally Prime running on your Windows PC.

## Quick Start

### Option 1: Run the installer
1. Double-click `install.bat`
2. It will install dependencies and build `tally-bridge.exe`
3. Run `tally-bridge.exe` to start the bridge

### Option 2: Run directly with Node.js
1. Install [Node.js](https://nodejs.org/) (v18 or later)
2. Open a terminal in this folder
3. Run:
   ```
   npm install
   node server.js
   ```

## Prerequisites
- **Tally Prime** must be running on the same PC
- Tally's HTTP server must be enabled:
  1. Open Tally Prime
  2. Go to **Gateway → Configure → Connectivity**
  3. Set HTTP port to **9000** (default)

## How It Works
- Runs a local server on `http://localhost:3456`
- Your web app calls this server instead of Tally directly
- The bridge forwards requests to Tally (port 9000) and returns JSON
- Adds CORS headers so browsers can access it

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Check if bridge and Tally are running |
| `/api/customers` | GET | Fetch Sundry Debtors from Tally |

## Configuration
Set the `TALLY_URL` environment variable to change the Tally server address:
```
set TALLY_URL=http://localhost:9000
node server.js
```

## Troubleshooting
- **"Cannot connect to Tally"**: Make sure Tally Prime is running with HTTP enabled on port 9000
- **Port 3456 in use**: Close other instances of Tally Bridge
- **Node.js not found**: Install from https://nodejs.org/
