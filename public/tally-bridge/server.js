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

// Correct TDL Collection-based XML request for Sundry Debtors
const SUNDRY_DEBTORS_XML = `<ENVELOPE>
<HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>All Ledgers</ID></HEADER>
<BODY><DESC>
<STATICVARIABLES><SVCURRENTCOMPANY/></STATICVARIABLES>
<TDL><TDLMESSAGE>
<COLLECTION NAME="All Ledgers" ISMODIFY="No">
<TYPE>Ledger</TYPE>
<FILTER>SundryDebtorsOnly</FILTER>
<FETCH>NAME,ADDRESS,LEDGERPHONE,LEDGERMOBILE,LEDSTATENAME,PARTYGSTIN,COUNTRYNAME</FETCH>
</COLLECTION>
<SYSTEM TYPE="Formulae" NAME="SundryDebtorsOnly">$Parent="Sundry Debtors"</SYSTEM>
</TDLMESSAGE></TDL>
</DESC></BODY>
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
 * Parse Tally Collection XML response into customer objects
 */
function parseCustomers(xmlText) {
  return new Promise((resolve, reject) => {
    parseString(xmlText, { explicitArray: false, ignoreAttrs: false }, (err, result) => {
      if (err) return reject(err);

      const customers = [];

      try {
        let ledgers = [];

        // Collection response: ENVELOPE > COLLECTION > LEDGER
        const collection = result?.ENVELOPE?.COLLECTION;
        if (collection?.LEDGER) {
          const raw = collection.LEDGER;
          ledgers = Array.isArray(raw) ? raw : [raw];
        }

        // Fallback: ENVELOPE > BODY > DATA > COLLECTION > LEDGER
        if (ledgers.length === 0) {
          const col2 = result?.ENVELOPE?.BODY?.DATA?.COLLECTION;
          if (col2?.LEDGER) {
            const raw = col2.LEDGER;
            ledgers = Array.isArray(raw) ? raw : [raw];
          }
        }

        // Fallback: TALLYMESSAGE path
        if (ledgers.length === 0) {
          const body = result?.ENVELOPE?.BODY;
          if (body?.DATA?.TALLYMESSAGE?.LEDGER) {
            const raw = body.DATA.TALLYMESSAGE.LEDGER;
            ledgers = Array.isArray(raw) ? raw : [raw];
          }
        }

        console.log(`Found ${ledgers.length} ledger entries`);

        for (const ledger of ledgers) {
          // Name can be in NAME tag or in $ attribute
          const name = (ledger.NAME || ledger.$ && ledger.$.NAME || ledger._ || "").toString().trim();
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
 * Health check
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
    console.log("Raw Tally XML response (first 500 chars):", xmlResponse.substring(0, 500));
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

/**
 * Debug endpoint — returns raw XML from Tally
 */
app.get("/api/raw", async (req, res) => {
  try {
    const xmlResponse = await tallyRequest(SUNDRY_DEBTORS_XML);
    res.set("Content-Type", "text/xml");
    res.send(xmlResponse);
  } catch (err) {
    res.status(502).json({ error: err.message });
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
