

## Customize PDF Pages to Brand Coloring

### Overview
Apply the app's olive green and golden amber brand palette to all four PDF generation locations, replacing the current plain gray/black styling with branded headers, table headers, dividers, and footers.

### Brand Colors (RGB for jsPDF)
- **Primary (olive green)**: `rgb(101, 143, 64)` — HSL 82 45% 38%
- **Accent (golden amber)**: `rgb(217, 175, 47)` — HSL 42 75% 55%
- **Dark sidebar green**: `rgb(30, 41, 21)` — HSL 85 25% 14%
- **Light background**: `rgb(243, 240, 233)` — HSL 45 20% 95%

### Changes per File

#### 1. `src/pages/Outstanding.tsx` — `handleExportPDF`
- **Header bar**: Draw a filled olive green rectangle behind the company name and title (white text on green)
- **Table headers**: Use olive green background with white text instead of gray `rgb(245,245,245)`
- **Divider lines**: Use accent golden amber color instead of `rgb(200,200,200)`
- **Grand total row**: Olive green text for the total amount
- **Footer**: Include company name in olive green text with a thin accent-colored line above
- **Page numbers**: Add "Page X of Y" on every page in muted olive

#### 2. `src/components/dashboard/DrillDownSheet.tsx` — `generatePDFBlob`
- Same branded header bar (green background, white text)
- Area-wise summary table header: olive green background
- Section area headers: light green tint background instead of gray
- Footer: branded with accent line

#### 3. `src/components/customers/CustomerLedgerSheet.tsx` — `generateLedgerPDFBlob`
- Branded header bar with company name + customer name
- Ledger table header row: olive green background, white text
- Closing balance row: olive green accent
- Footer: branded

#### 4. `src/lib/share-utils.ts` — `generateSummaryPDF`
- Branded header block (green background, white text for company name + title)
- Area breakdown header: olive green
- Dividers: accent color
- Footer: fix "MoneyMate" to "CollectWeb", apply brand color

### Shared Pattern (applied to all 4 files)
```text
┌─────────────────────────────────────┐
│  ██████ OLIVE GREEN HEADER BAR ████ │  ← Company name + title (white text)
│  Generated on DD-MMM-YYYY           │  ← Muted text below
├─────── amber divider ──────────────-┤
│  Summary KPIs                       │
├─────── amber divider ──────────────-┤
│  ██ Olive Green Table Header ██     │  ← Column labels (white text)
│  Row 1                              │
│  Row 2 (alternating light bg)       │
│  ...                                │
├─────── amber divider ──────────────-┤
│  Footer: Company Name · Page X of Y │  ← Olive green text, accent line above
└─────────────────────────────────────┘
```

### Technical Details
- Brand colors defined as constants at the top of each PDF function
- All four files get the same color constants for consistency
- Page numbers added via a post-generation loop: `for (let i = 1; i <= totalPages; i++) { doc.setPage(i); ... }`
- No new dependencies needed — all changes use existing jsPDF drawing methods (`setFillColor`, `rect`, `setTextColor`, `setDrawColor`)

### Files Changed
1. `src/pages/Outstanding.tsx` — Brand the outstanding PDF
2. `src/components/dashboard/DrillDownSheet.tsx` — Brand the drilldown PDF
3. `src/components/customers/CustomerLedgerSheet.tsx` — Brand the ledger PDF
4. `src/lib/share-utils.ts` — Brand the summary PDF + fix "MoneyMate" text

