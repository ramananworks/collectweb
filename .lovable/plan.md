

## Plan: Compress Theme Options into a "Display" Tab

Replace the three separate theme `DropdownMenuItem`s with a single "Display" row containing three compact icon buttons (Sun, Moon, Monitor) inside a segmented toggle.

### Changes: `src/components/layout/AppLayout.tsx`

Replace the three theme `DropdownMenuItem`s with:
- A single `DropdownMenuLabel` reading "Display"
- A row of three small icon-only buttons (Sun/Moon/Monitor) styled as a segmented control
- Active button gets `bg-accent` highlight
- All inside one compact row in the dropdown

One file, ~15 lines changed.

