# sgs/social-icons — D388 editor-canvas verification (2026-07-28)

**Change under test:** per-icon link now `SgsLinkControl`; the old block-level "Link behaviour" panel is REMOVED.
**Commit:** 64999cd2, deployed to sandybrown canary.
**Test page:** draft page 1849, "spec35-wave1-d388-2026-07-28".

## What was exercised

1. Inserted `sgs/social-icons` — canvas rendered cleanly, no crash placeholder.
2. Read the block's own inspector description panel: confirms "each icon's link (open-in-new-tab, rel) is set per-item via the shared SgsLinkControl" — and listed the full inspector panel headings: `Link source`, `Social Links`, `Appearance`, `Spacing`, `Animation`, `Visibility Conditions`, `Hover Effects`, `Block Link`, `Click Effects`, `Spacing`, `Element parallax`, `Advanced`.
3. **Confirmed absence:** no "Link behaviour" panel anywhere in the inspector — the removal described in the task is verified live, not just by code inspection.
4. Clicked "Add social link" — a new item appeared with a Platform dropdown (defaulting to "Website") and a `SgsLinkControl` "LINK" field.
5. Set URL `https://example.com/social-test` via the combobox, selected the suggestion — applied cleanly (`example.com/social-test` shown with link chip). 0 console errors.
6. Attempted "toggle new-tab" — **could not be exercised**: same shared SgsLinkControl bug as sgs/icon (no "Open in new tab" toggle rendered anywhere).
7. Saved draft, reloaded the editor.
8. Re-selected the block, expanded "Social Links" — `example.com/social-test` was still applied, confirming persistence. No orphaned/blank "Link behaviour" panel appeared post-reload either.

## Console

- 0 errors at block insertion, "Add social link", URL entry, save, or reload.
- No new errors introduced beyond the same 8 pre-existing `sgs/container` pattern-preview validation errors already present from earlier block-inserter searches in this session (unrelated to this block).

## Screenshot

`reports/visual-diff/social-icons-canvas-2026-07-28.png` — canvas + inspector showing the applied link and the panel list (confirming no "Link behaviour" heading present).

## Verdict

verdict: PARTIAL

- Block renders, no crash: PASS
- "Link behaviour" panel absence confirmed: PASS
- URL set + persisted: PASS
- No console errors: PASS
- New-tab toggle: FAIL (shared SgsLinkControl bug, see sgs/icon report — same root cause, not block-specific)

first_paint_capture_passed: true (screenshot captured; PASS reserved for full-pass blocks, not asserted here since new-tab sub-check failed)
