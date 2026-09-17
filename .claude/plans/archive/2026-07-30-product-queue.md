---
doc_type: strategy
project: small-giants-wp
last_updated: 2026-07-30
note: "ARCHIVED 2026-09-17 (D1098) — most items done, the rest superseded/planned elsewhere per LEDGER.md's current fronts. LEDGER.md no longer points at this file (had drifted un-referenced for ~7 weeks). Kept for residual-item history, not live status."
---

## Product queue (the website-builder work — reconcile before acting, some is already live)

**Indus "Our Brands" clone — DONE (D343).** Remaining Indus tasks (Bean-directed):

- **A — core→SGS migration.** (1) build `migrate-core-blocks/pairings/separator_pairing.py` (does
  NOT exist — follow `heading_pairing.py`); (2) **re-add** `sgs/separator`→`core/separator` to
  `block-replacements.json` + `/sgs-update` (reverted `49e6fc4f`: build-blocked with no pairing);
  (3) migrate the 4 theme patterns still on `core/separator` (`footer-centred`, `footer-columns`,
  `mega-menu-split-info-cta`, `pricing-columns`); (4) **page 13**: "Our Brands" band `core/group` →
  `sgs/container` (`verticalAlign:center`, drop the padding fudge) + audit for remaining core blocks.
- **B — wire `lint-theme-css-hardcodes.py` into prebuild** (runnable, not gated).
- **C — deferred:** Services 768 overflow (hardcoded `139/250/123/187=771px` columns →
  responsive `fr`); Services button-border decision; Task-2 detection-method brainstorm.

**Header/footer goals (sequenced):**
1. **Step 1 — SPLIT framework vs per-site header/footer.** `footer-indus-foods.php` DELETED
   (`94ab240f`). To do: decide the per-site channel (JSON snapshot vs REST); gitignore per-site
   files. Do this BEFORE goals 4/1 so they write to the per-site channel.
2. **Goal 4 — match the Mama's draft** (`sites/mamas-munches/mockups/homepage/TRUTH-SPEC.md`): fix
   its 2 liabilities first (cites non-existent `header/footer-mamas-munches` patterns; maps the
   hamburger to the deleted `sgs/mobile-nav-toggle` → re-point at `sgs/nav-menu` + `sgs/nav-drawer`;
   `sgs/adaptive-nav` also deleted, D362). Bean's heading eye pass (R-31-13) lands here.
3. **Goal 1 — replicate the Indus header/footer.** BASELINE = the preserved hand-built Astra site
   https://lightsalmon-tarsier-683012.hostingersite.com/ (NOT `mockups/*.html`). Capture AS A FILE
   FIRST (`reports/visual-diff/header-footer-baseline-indus.json`). Open defects: logo mobile-tier
   switch; buttons/rows/bg not preserved; sticky+shrinking header; mega-menu on mobile+desktop.
   NEW: `P-INDUS-BRANDSTRIP-OVERFLOW-9PX`.
4. **Goal 3 — de-hardcode base blocks — DONE (2026-09-17, D1098).** `site-header/edit.js` +
   `site-footer/edit.js` TEMPLATEs + row blocks had hardcoded content removed earlier; the
   `Quick Links`/`Contact` headings + the 5-item placeholder link list in
   `framework-footer-default.php` were the last piece, fixed this session. Register (archived,
   one item — A11, a font-size question — still deferred to Bean/Opus sign-off):
   `plans/archive/2026-07-15-header-footer-hardcoding-register.md`.

**Open reconciliation:** Track B (`feat/track-b-content-restore`, Indus page content) unmerged/
paused — check its branch state before touching its files.

**Standing programmes (closed — pointers only):** no-inline COMPLETE bar 5 block-fixes
(`reports/2026-07-26-spec32-11-condition-done-audit.md`) · Spec 30 COMPLETE (D220) · L1–L4 DONE
(D290). Parked, not ours: `P-CONFORMANCE-GOLDEN-DRIFT`, `P-ARCHIVE-PRODUCT-WC-VALIDATION`.

---
