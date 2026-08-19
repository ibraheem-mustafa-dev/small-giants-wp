---
doc_type: verify
project: small-giants-wp
plan: plans/2026-07-29-merged-spec36-37-track-strategic-plan.md
date: 2026-07-29
---

# Verification criteria — merged Spec 36+37 track

Consumed by `/live-project-status` for phase-completion verification. A wave is DONE only when
every criterion below has machine evidence or a recorded Bean sign-off — never on assertion.

## Wave 1 — Fixture & verification
- STATUS: pending
- Gate 3: panel 1745 populated; menu 100 attached; nav-menu on a live canary page; opens on
  hover, tap, AND keyboard (Playwright evidence per mode).
- Axe on the OPEN panel via the guarded harness (`axe-run.mjs`): 0 violations, run NOT VACUOUS
  (exit 0, openness assertion logged).
- Mega motion (D396 set): live-verified + R-31-13 Bean's eye recorded.
- 36-19 cart: flyout + drawer modes exercised; Store-API add/qty/remove + empty state screenshots.
- 36-20 search: 3 display modes live; price-data limitation logged as its own dispatch entry.
- 36-21/23/12: editor-session evidence per control set.
- FR-37-7 mega arm: picker screenshot showing the 3 starters on a new mega post.

## Wave 2 — Capability
- STATUS: pending
- DP7 harness self-tests pass FIRST (W2-i precedes the CPT build — Gate 2's evidence depends on it).
- CPT parity (Gate 2): computed-parity JSON — default `sgs_drawer` post render vs pre-CPT default
  block render, **drawer OPEN** (a closed-vs-closed comparison is vacuous), property-identical
  (D403 bar), negative control run. Passes BEFORE any destructive step (attr cuts, migrations).
- Stored-instance sweep: WP-CLI re-type of `drawerRef` across header CPT posts + fixture pages +
  BOTH live sites, count-verified before/after; a pre-existing live-site burger still opens its drawer.
- Spec 36+37 amended in the SAME commit as the CPT cutover (W2-r; Spec 37 §1.2).
- `drawerRef` picker: dangling-post notice fires on deleted AND draft target (2 screenshots).
- 7 starter patterns appear in the native CPT picker; `variantPreset` + registerBlockVariation
  calls = 0 in src (grep evidence).
- 8 header patterns render with no embedded drawer; seeded default drawer opens from the burger.
- DP4: all 5 trigger attrs drive visible change; open-state morph syncs via `store('sgs/nav')`
  (live video/screenshot pair closed vs open).
- FR-37-42: picker writes `1fr auto 1fr` and it renders centred-logo (computed grid evidence).
- `P-ICON-LIST-INVISIBLE-ON-DARK-DRAWER`: contrast ≥ 4.5:1 on BOTH dark variants, measured by the
  DP7 full-element sweep.
- `P-NAV-DRAWER-ALIGN-DOES-NOT-CENTRE-MENU`: `centred-statement` links visually centred at 3 tiers.
- DP7 harness: `--self-test`-style negative controls PASS (closed panel → VACUOUS; label
  mismatch → FAIL) before any Wave-4 capture is trusted.
- After every edit.js / shared-component change: real editor opened post-deploy (D388), noted per unit.

## Wave 3 — Polish
- STATUS: pending (FR-37-44 + FR-37-45 VERIFIED 2026-08-19; the rest still pending)
- **FR-37-44 + FR-37-45 — VERIFIED 2026-08-19**, evidence
  `reports/visual-diff/site-header-2026-08-19.md` (17 assertions, verdict PASS, live canary).
  Load-bearing ones: the contrast scrim paints at desktop AND cancels at 375px (`content: none`) —
  the per-device capability a `<body>` class could never express; the client-set scrolled background
  and text colour both land with `!important` intact; `headerTransparentDirection` genuinely inverts
  the pair; `force-solid` suppresses transparency (`position: relative`, never lifted out of flow)
  rather than fighting it. Regression control: the homepage header still paints the `surface` token
  after 7 patterns migrated `backgroundColor` → `backgroundColour`, with sticky, the
  `--sgs-header-height` publisher (144px) and the nav all unaffected, 0 console errors.
  ⚠ Two caveats recorded in the report rather than smoothed over: one computed-style reading is
  unreliable (`getComputedStyle` returns a LIVE declaration, read after the test mutated the
  element), and the scrolled state was forced by adding the class, not by scrolling.
- FR-37-27/simplicity 2+3: before/after inspector screenshots; nothing hidden.
  **Figures re-measured 2026-08-19 on the merged tree and these ARE the ruling now, superseding the
  2026-08-13 numbers:** `sgs/site-header` 4, `sgs/site-footer` 2 (WITHIN), `sgs/site-header-row` 8,
  `sgs/site-footer-row` 8. The ≤3 is a DEFAULT, not a ceiling (P2 §5, Bean-confirmed); the detector
  is advisory. `SgsColourPanel` is correctly NOT counted (Bean-ruled): it is the standardised colour
  panel and its picker is a popover, not a settings control the cap governs.
- FR-37-6: BOTH live sites render header+footer from CPTs (view-source evidence; generic proof
  headers #1570/#1571/#360 retired).
- FR-37-26: Bean's screen-recorded blind-tester session exists; verdict recorded.

## Wave 4 — Proof gate (clones)
- STATUS: pending
- 12/12 references measured (3 owed teardowns done); clone roster = 10 (resn + Warm excluded by
  name — Gate 5 counts 10/10).
- Substitution policy (fonts/imagery) signed by Bean BEFORE the first clone (W4-a2).
- studionamma: DP5 per-property homes table reviewed; DP7-clean evidence pack (computed-parity +
  open-state captures + labels fidelity PASS); **Bean's eye acceptance recorded** BEFORE any of
  the other 9 start.
- Each subsequent clone: same evidence pack + Bean's eye; capability gaps filed as wave-1–3
  defects, zero trimmed references; Tier-G/WebGL gaps route to Spec 38 or a Bean trim decision
  (the termination rule), never a silent loop-back.
- Presets extracted per accepted clone; contrast pass on all 8 client palettes; Q3 retirement done
  (`centred/minimal/full` gone; `scratch` + 3 search variants remain).

## Wave 5 — Clone walker
- STATUS: pending
- FR-37-22 walker clones a reference header/footer end-to-end through the pipeline (run artefacts).
- The 12 accepted clones green as regression fixtures.
- FR-37-23: live FRs + never-overflow on both sites + no inline styling + Bean's eye = track CLOSED.
