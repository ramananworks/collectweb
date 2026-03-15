

## Plan: Add Visible Vertical Scrollbar to Record Collection Form

Replace the default browser scrollbar (`overflow-y-auto`) with the Radix `ScrollArea` component to show a styled, always-visible vertical scrollbar.

### Changes in `src/components/forms/RecordPaymentDialog.tsx`

1. **Import** `ScrollArea` from `@/components/ui/scroll-area`.

2. **Wrap the form content** with `<ScrollArea>` instead of relying on `overflow-y-auto` on the `<form>`:
   - Remove `overflow-y-auto pr-1 max-h-[calc(85vh-8rem)]` from the `<form>`.
   - Wrap `<Form>` content in `<ScrollArea className="max-h-[calc(85vh-8rem)] pr-2">`.

