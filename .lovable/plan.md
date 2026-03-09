
## Plan: Remove Green Online Indicator from Mobile Header

### Current Behavior
The mobile header (lines 264-280 in `AppLayout.tsx`) shows a status indicator in the top-right corner:
- **Offline**: Red dot + "Offline" text
- **Pending sync**: Yellow dot + pending count
- **Online**: Green dot only

### Proposed Change
Remove the entire status indicator `<div>` block from the mobile header (lines 264-280). This removes:
- The green "online" indicator
- The yellow "pending" indicator  
- The red "offline" indicator (from the header only)

**Note**: The offline banner below the header (lines 283-288) will remain, providing offline feedback when needed. The sidebar sync status will also remain unchanged.

### Files to Modify
- `src/components/layout/AppLayout.tsx` — Delete lines 264-280 (the status indicator div)
