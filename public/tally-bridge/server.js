const express = require("express");
const cors = require("cors");
const http = require("http");
const { parseString } = require("xml2js");

const app = express();
const PORT = 3456;
const TALLY_URL = process.env.TALLY_URL || "http://localhost:9000";

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// XML request templates
const SUNDRY_DEBTORS_XML = `<ENVELOPE>
<HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>List of Accounts</ID></HEADER>
<BODY><DESC><STATICVARIABLES><ACCOUNTTYPE>Sundry Debtors</ACCOUNTTYPE></STATICVARIABLES></DESC></BODY>
</ENVELOPE>`;

/**
 * Send XML request to Tally and get raw response
 */
function tallyRequest(xmlBody) {
  return new Promise((resolve, reject) => {
    const url = new URL(TALLY_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 9000,
      path: "/",
      method: "POST",
      headers: {
        "Content-Type": "text/xml",
        "Content-Length": Buffer.byteLength(xmlBody),
      },
      timeout: 15000,
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    });

    req.on("error", (err) => reject(err));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Tally connection timed out"));
    });

    req.write(xmlBody);
    req.end();
  });
}

/**
 * Parse Tally XML response into customer objects
 */
function parseCustomers(xmlText) {
  return new Promise((resolve, reject) => {
    parseString(xmlText, { explicitArray: false, ignoreAttrs: true }, (err, result) => {
      if (err) return reject(err);

      const customers = [];

      try {
        // Navigate to ledger entries
        let ledgers = [];
        const body = result?.ENVELOPE?.BODY;

        if (body?.DATA?.TALLYMESSAGE?.LEDGER) {
          const raw = body.DATA.TALLYMESSAGE.LEDGER;
          ledgers = Array.isArray(raw) ? raw : [raw];
        } else if (body?.TALLYMESSAGE?.LEDGER) {
          const raw = body.TALLYMESSAGE.LEDGER;
          ledgers = Array.isArray(raw) ? raw : [raw];
        }

        // Also check for DESC path
        if (ledgers.length === 0 && result?.ENVELOPE?.LEDGER) {
          const raw = result.ENVELOPE.LEDGER;
          ledgers = Array.isArray(raw) ? raw : [raw];
        }

        for (const ledger of ledgers) {
          const name = (ledger.NAME || ledger._ || "").toString().trim();
          if (!name) continue;

          // Address
          let address = "";
          if (ledger["ADDRESS.LIST"]) {
            const addrList = ledger["ADDRESS.LIST"];
            const addrEntries = addrList.ADDRESS;
            if (Array.isArray(addrEntries)) {
              address = addrEntries.map((a) => (a || "").toString().trim()).filter(Boolean).join(", ");
            } else if (addrEntries) {
              address = addrEntries.toString().trim();
            }
          }

          // Phone
          let phone = "";
          for (const tag of ["LEDGERPHONE", "LEDGERMOBILE", "PHONENUMBER"]) {
            if (ledger[tag]) {
              phone = ledger[tag].toString().trim();
              if (phone) break;
            }
          }

          // Area / State
          const area = (ledger.LEDSTATENAME || ledger.COUNTRYNAME || "").toString().trim();

          // GSTIN
          const gstin = (ledger.PARTYGSTIN || ledger.GSTIN || "").toString().trim();

          customers.push({ name, phone, address, area, gstin });
        }
      } catch (parseErr) {
        console.error("Error parsing ledger data:", parseErr);
      }

      resolve(customers);
    });
  });
}

// ==================== ROUTES ====================

/**
 * Health check — verifies middleware is running and Tally is reachable
 */
app.get("/api/health", async (req, res) => {
  try {
    await tallyRequest(`<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>Tally</ID></HEADER></ENVELOPE>`);
    res.json({ status: "ok", tally: true, tallyUrl: TALLY_URL });
  } catch (err) {
    res.json({ status: "ok", tally: false, tallyUrl: TALLY_URL, error: err.message });
  }
});

/**
 * Fetch all Sundry Debtor customers from Tally
 */
app.get("/api/customers", async (req, res) => {
  try {
    const xmlResponse = await tallyRequest(SUNDRY_DEBTORS_XML);
    const customers = await parseCustomers(xmlResponse);
    res.json({ success: true, count: customers.length, customers });
  } catch (err) {
    console.error("Error fetching customers:", err.message);
    res.status(502).json({
      success: false,
      error: "Cannot connect to Tally Prime",
      details: err.message,
      hint: "Make sure Tally Prime is running and HTTP server is enabled on port 9000",
    });
  }
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║     Tally Bridge is running!                 ║
║     http://localhost:${PORT}                    ║
║                                              ║
║     Tally URL: ${TALLY_URL.padEnd(28)} ║
║     Press Ctrl+C to stop                     ║
╚══════════════════════════════════════════════╝
  `);
});
