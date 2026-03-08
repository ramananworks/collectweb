

## Add PDF Share Button for Mobile

The Outstanding page already has a PDF export button that downloads the file. On mobile, users need to **share** the PDF (via WhatsApp, email, etc.) rather than just download it, since downloaded files are harder to find on phones.

### Approach

Modify `handleExportPDF` in `src/pages/Outstanding.tsx` to detect mobile and use the **Web Share API** (`navigator.share` with file support) to share the PDF blob directly. On desktop (or if share fails), fall back to the existing download behavior.

### Changes

**`src/pages/Outstanding.tsx`**:
- Update `handleExportPDF` to:
  1. Generate the PDF blob as before
  2. On mobile (or when `navigator.canShare` supports files), create a `File` from the blob and call `navigator.share({ files: [file] })`
  3. If share API is unavailable or fails, fall back to `downloadPDF()`
- Update the button label/icon: show `Share` with a `Share2` icon on mobile, keep `PDF` with `Download` icon on desktop
- Import `useIsMobile` from `@/hooks/use-mobile` and `Share2` from lucide

