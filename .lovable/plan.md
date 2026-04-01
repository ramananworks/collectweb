

## Tally Prime Local Bridge for Customer Import

### Overview
Build a local bridge that connects to Tally Prime's XML API running on the user's PC (default `http://localhost:9000`) and pushes extracted customer data into the app's cloud database.

### How Tally Prime XML API Works
Tally Prime exposes an HTTP XML API on port 9000 (configurable). You send XML requests to fetch data like ledgers (customers/parties). The response is XML containing master data.

### Architecture

```text
Browser (your app)
   ↓ User clicks "Import from Tally"
   ↓ Sends XML request to localhost:9000
   ↓ Tally responds with customer XML
   ↓ Parse XML → map to customer objects
   ↓ Call existing bulk import logic (useBulkImportCustomers)
   ↓ Customers + areas saved to cloud DB
```

**Key constraint**: The browser must directly call `http://localhost:9000` since Tally runs on the user's local machine. This works because:
- Tally's HTTP server doesn't enforce CORS headers (most local servers don't)
- We'll use `fetch` with `mode: 'no-cors'` or handle CORS errors gracefully
- **Fallback**: If CORS blocks direct browser access, we'll provide a downloadable Python/Node script the user runs locally that exports Tally data to CSV, then they use the existing CSV bulk import

### Changes

#### 1. New Component: `src/components/forms/TallyImportDialog.tsx`
- Dialog with:
  - Tally server URL input (default: `http://localhost:9000`)
  - "Test Connection" button to verify Tally is running
  - "Fetch Customers" button that sends Tally XML request for Sundry Debtors
  - Preview table showing fetched customers (name, phone, address, area)
  - "Import" button that calls `useBulkImportCustomers`
- XML request to fetch customer ledgers:
  ```xml
  <ENVELOPE>
    <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
    <BODY><EXPORTDATA><REQUESTDESC>
      <REPORTNAME>List of Accounts</REPORTNAME>
      <STATICVARIABLES>
        <ACCOUNTTYPE>Sundry Debtors</ACCOUNTTYPE>
      </STATICVARIABLES>
    </REQUESTDESC></EXPORTDATA></BODY>
  </ENVELOPE>
  ```
- Parse XML response using `DOMParser` to extract: Name, Address, Phone/Mobile, Area/State, GSTIN

#### 2. Update `src/pages/Customers.tsx`
- Add "Import from Tally" button next to existing "Bulk Import" button (permission-gated same as bulk import)

#### 3. Fallback: Export Script
- If browser CORS blocks localhost access, show a message with instructions:
  - "Tally must be running with Allow CORS or use our export script"
  - Provide a downloadable Python script that connects to Tally locally, exports to CSV
  - User then uses existing CSV bulk import

### Important Notes
- Tally must be running and its HTTP server enabled (Gateway → Configure → HTTP port 9000)
- Only works when the user is on the same PC as Tally (localhost)
- Auto-creates missing areas (reuses existing bulk import logic)
- Maps Tally "Sundry Debtors" group to customers

### Files Changed
1. `src/components/forms/TallyImportDialog.tsx` — New dialog for Tally connection + import
2. `src/pages/Customers.tsx` — Add "Import from Tally" button

