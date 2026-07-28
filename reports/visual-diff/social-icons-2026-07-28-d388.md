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

## Re-verify after 7f4f399a (2026-07-28, same session, later pass)

Fix commit 7f4f399a deployed to sandybrown canary.

1. Hard-reloaded draft page 1849 — 0 console errors.
2. Selected the block, expanded "Social Links", clicked "Edit link" on the existing `example.com/social-test` item, expanded "Advanced" — **"Open in new tab" now renders**.
3. **Honest note:** the checkbox was already checked (`checked: true`) at this point — its stored value read `opensInNewTab: true` from the data store even before any toggle action in this re-verify pass. To prove the control is genuinely interactive (not just displaying a frozen `true`), I toggled it OFF (confirmed `checked: false`) then back ON (confirmed `checked: true`) — both toggles fired with 0 console errors, demonstrating the checkbox is live and controllable, ending in the required ON state.
4. Clicked "Apply" — 0 console errors.
5. Read the item's attributes from the `core/block-editor` data store: `{ platform: "website", url: "https://example.com/social-test", opensInNewTab: true, rel: "noopener" }`.
6. Saved draft, hard-reloaded the editor — 0 console errors.
7. Re-read the data store post-reload: **identical values persisted**, confirmed both via the data store and a screenshot showing the checked "Open in new tab" box in the live UI.
8. Screenshot captured: `reports/visual-diff/social-icons-reverify-newtab-2026-07-28.png`.

Console errors observed during re-verify: **none**.

## Verdict

verdict: PASS

- Block renders, no crash: PASS
- "Link behaviour" panel absence confirmed: PASS
- URL set + persisted: PASS
- No console errors: PASS
- New-tab toggle: PASS (control renders, demonstrated interactive via off→on toggle, persists with `opensInNewTab=true` + `rel=noopener`, re-verified after 7f4f399a)

first_paint_capture_passed: true
