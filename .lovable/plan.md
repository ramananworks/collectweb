

## Fix: Tally Bridge Not Fetching Sundry Debtors

### Root Cause
The XML request template uses a non-standard format. Tally Prime's XML API expects a specific request structure for fetching ledger data. The current XML uses `<ACCOUNTTYPE>Sundry Debtors</ACCOUNTTYPE>` which is not the correct Tally XML API format for exporting ledger masters.

### Correct Tally XML Request
Tally Prime uses a `Collection`-based export with `STATICVARIABLES` to filter by group. The proper XML for fetching Sundry Debtors ledgers is:

```xml
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>All Ledgers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY/>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="All Ledgers" ISMODIFY="No">
            <TYPE>Ledger</TYPE>
            <FILTER>SundryDebtorsOnly</FILTER>
            <FETCH>NAME,ADDRESS,LEDGERPHONE,LEDGERMOBILE,LEDSTATENAME,PARTYGSTIN,COUNTRYNAME</FETCH>
          </COLLECTION>
          <SYSTEM TYPE="Formulae" NAME="SundryDebtorsOnly">$Parent="Sundry Debtors"</SYSTEM>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>
```

### Changes

#### `public/tally-bridge/server.js`

1. **Replace the XML request template** with the correct Tally TDL Collection-based export that filters ledgers where `$Parent="Sundry Debtors"`
2. **Update the XML parser** (`parseCustomers`) to handle the Collection response format, which returns `COLLECTION > LEDGER` elements instead of `TALLYMESSAGE > LEDGER`
3. **Add debug logging** to print the raw XML response so the user can see what Tally returns (helps troubleshoot further)
4. **Add a `/api/raw` endpoint** (optional) that returns the raw XML from Tally for debugging

#### `public/tally-bridge.zip`
Regenerate the zip with the updated `server.js`

### Files Changed
1. `public/tally-bridge/server.js` — Fix XML request template and parser for Tally's actual API format
2. `public/tally-bridge.zip` — Rebuild with updated source

