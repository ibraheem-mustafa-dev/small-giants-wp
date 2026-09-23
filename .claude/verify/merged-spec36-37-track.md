---
doc_type: verify
project: small-giants-wp
plan: plans/2026-07-29-merged-spec36-37-track-strategic-plan.md
---

# Verification criteria — merged Spec 36+37 track

Consumed by `/live-project-status` for phase-completion verification. A wave is DONE only when
every criterion below has machine evidence or a recorded Bean sign-off — never on assertion.

The nav blocks are `sgs/nav-bar-menu` (bar), `sgs/nav-drawer-menu` (drawer link list) and
`sgs/nav-drawer` (drawer panel), under `plugins/sgs-blocks/src/blocks/<slug>/`.
`sgs/nav-drawer-menu` has no visual-diff report yet.

## Wave 1 — Fixture & verification
- STATUS: CLOSED — all six units live-verified: the Gate 3 composed-nav fixture (page 1842, mega
  panel 1745 populated; opens on hover, tap and keyboard), mega motion, mini-cart (flyout + drawer
  modes, Store-API add/qty/remove, empty state), search (4 display modes), the social /
  business-info / notices controls, and the mega starters picker.
- Residuals:
  1. axe on the OPEN mega panel reports 6 primary-colour contrast violations on the Mama's palette,
     accepted by owner ruling. Guarded harness (`axe-run.mjs`), run NOT VACUOUS.
  2. Bean's eye (R-31-13) on the mega motion is not yet recorded.
  3. The cart/search screenshot set is not captured (numeric probes only).

## Wave 2 — Capability
- STATUS: partial. DONE a, b, c, d, e, f (live/eye verification owed), g, h, j, k, l, n, p, q, r, s, t, u ·
  i (labels for the three unmeasured refs follow W3B-3) · CLOSED with no framework feature: o.
- DP7 harness self-tests pass FIRST (W2-i precedes Wave-4 evidence). Built: shared
  `nav-qa/lib/openness-guard.mjs` (exit 3 = VACUOUS), full-element contrast walk, `--self-test` in
  all six sweep, capture and audit scripts, and `nav-qa/check-fixture-fidelity.py` (fails on count/label mismatch,
  right-site keyed). Proof: `node plugins/sgs-blocks/scripts/nav-qa/sweep-drawer-variants.mjs --self-test`
  (47/47), `shoot-drawer-pairs.mjs --self-test` (16/16), `elementfrompoint-sweep.mjs --self-test` (3/3),
  `python plugins/sgs-blocks/scripts/nav-qa/check-fixture-fidelity.py --self-test` (14/14) and `--check`
  (exit 0). Open: `labels-<site>.json` for Away, ButcherBox, rabbit.tech, generated in W3B-3.
- CPT parity (Gate 2): computed-parity JSON — default `sgs_drawer` post render vs the default drawer,
  **drawer OPEN** (a closed-vs-closed comparison is vacuous), property-identical, negative control
  run. Passed 2026-09-20 on the mechanism (`.claude/reports/2026-09-20-w2-gate2-rerun.md`), fidelity left to Bean's eye.
- No stored string `drawerRef` on any live site: `wp db query "SELECT COUNT(*) FROM wp_posts WHERE post_content LIKE '%\"drawerRef\":\"%'"` returns 0 on every site.
- Spec 36 + Spec 37 state the drawer-CPT model identically, same commit (Spec 37 §1.2). Met.
- `drawerRef` picker: dangling-post notice fires on deleted AND draft target (2 screenshots).
  Create-inline (create a new `sgs_drawer` post from the picker) live-verified in the editor
  (`reports/visual-diff/nav-bar-menu-2026-09-20.md`).
- 7 drawer starter patterns appear in the drawer surfacing mechanism; `variantPreset` +
  `registerBlockVariation` calls = 0 in src (`git grep -n variantPreset -- plugins/sgs-blocks/src`).
  Met: seven `featured` drawer patterns exist and are seeded as posts.
- Header patterns render with no embedded drawer (met); seeded default drawer opens from the burger.
- DP4: all six trigger attrs (`triggerMode`, `triggerLabel`, `triggerIcon`, `triggerMagnetEnabled`,
  `triggerMagnetRadius`, `triggerMagnetStrength`) drive visible change; open-state morph syncs via
  `store('sgs/nav')` (closed/open screenshot pair).
- FR-37-42: picker writes `1fr auto 1fr` and it renders centred-logo (computed grid evidence).
- Drawer icon-list contrast ≥ 4.5:1 on BOTH dark variants, measured by the DP7 full-element sweep.
- Drawer `centred-statement` links visually centred at 3 tiers.
- DP7 harness: `--self-test`-style negative controls PASS (closed panel → VACUOUS; label
  mismatch → FAIL) before any Wave-4 capture is trusted.
- After every edit.js / shared-component change: real editor opened post-deploy, noted per unit.
- W2-u: the mega + drawer same-page integration probe (focus traps, ESC interplay, non-modal
  branch) re-run live on the CPT-rendered drawer. Met (`.claude/reports/2026-09-20-w2u-cpt-drawer-integration.md`).
- W2-l: a Site Info logo renders when the block has none and falls through to the Customiser logo when
  cleared, with an invalid attachment and a non-image attachment as controls
  (`reports/visual-diff/responsive-logo-2026-09-20.md`). Met.
- W2-n: with `shadowScrolled` set the header's computed `box-shadow` changes after scrolling and eases
  back, reduced motion removes the transition, an unmodified header never changes
  (`reports/visual-diff/site-header-2026-09-20.md`). Met.

## Wave 3 — Polish
- STATUS: partial.
- **FR-37-44 + FR-37-45 — VERIFIED**, evidence `reports/visual-diff/site-header-2026-08-19.md`
  (17 assertions, verdict PASS, live canary). Load-bearing ones: the contrast scrim paints at
  desktop AND cancels at 375px (`content: none`) — the per-device capability a `<body>` class could
  never express; the client-set scrolled background and text colour both land with `!important`
  intact; `headerTransparentDirection` genuinely inverts the pair; `force-solid` suppresses
  transparency (`position: relative`, never lifted out of flow). Regression control: the homepage
  header still paints the `surface` token with sticky, the `--sgs-header-height` publisher and the
  nav unaffected, 0 console errors. Caveats stated in the report: one computed-style reading is
  unreliable (`getComputedStyle` returns a LIVE declaration, read after the test mutated the
  element), and the scrolled state was forced by adding the class, not by scrolling.
- FR-37-27: SETTLED — ≤3 controls is a default, not a ceiling; nothing is hidden or reordered.
  `SgsColourPanel` is not counted (the standardised colour panel; its picker is a popover). Live
  figures come from `node plugins/sgs-blocks/scripts/check-simple-surface-cap.js` (advisory,
  warn-only) — quote its output, never a cached number.
- Simplicity finding 3 settled; finding 2 (canvas-click selection): before/after inspector
  screenshots — open.
- FR-37-6: every live site renders header + footer from its CPTs (view-source evidence): sandybrown
  canary + Indus test site. Both serve `sgs/site-header` + `sgs/site-footer` markup; CPT sourcing
  per site not yet evidenced.
- FR-37-26: Bean's screen-recorded blind-tester session exists; verdict recorded. Not done.
- FR-37-18 inspector conformance: partial; the conformance script's gap counts are raw upper
  bounds.

## Wave 3A — Independent fixes
- STATUS: not started.
- Every fix is first reproduced inside a real `sgs/site-header` (the loose-block QA pages prove
  nothing about a header). A defect that does not reproduce there is closed with no change.
- W3A-1: a real pointer path from a parent item to its dropdown and to its mega panel keeps the panel
  open at 1440px; negative control: a deliberately widened gap closes it.
- W3A-2: a default dropdown computes `list-style-type: none`, no link `text-decoration`, no
  `padding-left` on the list, and a non-transparent `background-color` with a border or shadow; its
  items centre on the parent item.
- W3A-3: computed hover style of a bar item that owns a panel equals that of a sibling that does not,
  with the cause proven before the fix.
- W3A-4: hover colour met: the hovered nav item's computed text colour equals its resting colour and the
  hover pill is `rgb(245, 194, 200)` (the draft's `--surface-pink`), read with `getComputedStyle` on
  `header .sgs-nav-bar-menu__link` and its `::before` while hovered. Centring met: the gaps left and
  right of the nav (logo to nav, nav to cart) are 225 and 224px on the live homepage, and no SGS surface's
  logo moved (`reports/visual-diff/responsive-logo-2026-09-20.md`, addendum).
- W3A-5: met. The nav QA fixtures render inside `sgs/site-header` (`document.querySelector('.entry-content header.sgs-site-header .sgs-nav-bar-menu')`
  is non-null on pages 3723, 3733, 3734 and 3735), and the drawer fixtures show submenus and a mega item
  (`python plugins/sgs-blocks/scripts/nav-qa/build-header-fixtures.py --list`).
- W3A-1: closed with no change (the plain dropdown works on a real header; the pill mega's gap is part of W3C-1).
- W3A-3: closed, not reproduced inside a real header (page 3763); the content-link rule in
  `plugins/sgs-blocks/assets/css/extensions.css` is the proven cause of the loose-fixture behaviour.
- W3A-2: closed, not reproduced inside a real header (Shop dropdown on page 3734: no list markers, no
  underline, no indent, a background and border).

## Wave 3B — Reference deconstruction
- STATUS: done; Bean signed the family list on 2026-09-21.
- W3B-1: the 14 columns are signed off (completeness review against the measured data, adversarial
  review of the table design).
- W3B-2, W3B-3, W3B-3a: all 13 roster references captured at 375, 768 and 1440px (the two Claude Design
  drafts by rendering each locally with its own runtime files, one row set per variant); every static cell is
  taken from the rendered DOM by computed style, every behaviour cell by event-driven capture or
  marked `source-only`; every surface cell is present, absent or not-applicable; `labels-<site>.json`
  exists for the eleven third-party references. Captured headed, or spot-checked headed with the
  differences recorded (`.claude/reports/reference-requirements/HEADED-SPOTCHECK.md`).
- W3B-4: every table row belongs to one capability family, and every family states the block
  attribute that covers it or "none".
- W3B-5: Bean has signed the family list.
- W3B-4 evidence: `reports/reference-requirements/FAMILIES-MASTER.md` (46 families, 11 covered, 21 partial, 8 gap, 6 conflict), `families-master.json`, and the independent review `FAMILIES-REVIEW.md` (23 findings, applied); 33 coverage checks re-run against the code.

## Wave 3C — Header and nav architecture harmonised
- STATUS: under way (`plans/2026-09-21-wave-3c-implementation-plan.md`); U-1 closed, U-2 next.

**U-1 exit criteria (closed):**
- Mega close-grace reads `submenuCloseGrace` (the bug where the mega context passed a literal 170
  instead of the attribute is fixed); `submenuIntentDelay` and `submenuOpenOn` (hover or click) give an
  operator-set intent delay and open mode on both the dropdown and the mega panel. Live-verified.
- `sgs/site-header` carries a per-tier `zIndex` object (ENG-01); drawer stacking derives from it.
  Live-verified. buck's `auto` z-index is an accepted divergence (Bean).
- Force-solid (`contrastSafe` = `force-solid`) paints the header's own resting background (its colour, or
  the theme surface token when it has none) instead of suppressing transparency with no paint. Live-verified.
- The surface-ground trio (`surfaceBlur`, `surfaceSaturate`, `surfaceOpacity`) is aligned across
  `site-header`, `mega-panel`, `nav-drawer`, `container`, `cta-section`, `hero`, `multi-button`,
  `physics-canvas`, `site-footer` and `trust-bar`, one `Surface` panel
  (`container/components/BackgroundPanel.js`) and one editor preview (`src/utils/surface-preview.js`).
  `sgs/site-header` also carries `surfaceFadeEdge` (none/top/bottom, off in forced-colours mode);
  `mega-panel` and `nav-drawer` each gain a `shadow`/`shadowColour` writer. Live-verified:
  `reports/visual-diff/container-2026-09-23.md`, `nav-drawer-2026-09-23.md`, `nav-bar-menu-2026-09-23.md`,
  `container-2026-09-21.md`, `mega-panel-2026-09-21.md`. The mega-panel `borderRadius` stays a single value
  (Bean); the edge-fade's own live check is owed.
- Item hover paint: `itemOpacity`/`itemOpacityHover` and `submenuOpacity`/`submenuOpacityHover` on
  `sgs/nav-bar-menu` and `sgs/nav-drawer-menu`; `itemPaddingShiftHover`; mega-panel `panelCardLift`.
  Attributes built and PHP-tested; live verification of the card lift and the submenu opacity pair on a
  `qa-hdr-*` fixture is owed.
- Family coverage in `families-master.json`: M-43 and M-21 covered (M-21 pending the live check above);
  M-09 covered; M-13 partial until the edge-fade live check.
- Shipped alongside U-1, not itself a U-1 family: the universal shadow-tone check (design
  `.claude/reports/2026-09-23-shadow-tone-design.md`, Bean-approved GO WITH FIXES) — a surface is judged
  dark when white text would be chosen for it (`helpers-colour-wcag.php::sgs_wcag_white_wins_for_luminance`),
  `helpers-surface-tone.php::sgs_surface_tone` judges overlay/image/gradient/colour layers, the wrapper,
  nav-drawer and mega-panel mark `sgs-on-dark`/`sgs-on-light`, and `helpers-shadow-dark.php` gives a dark
  surface a black shadow at 2.2x plus a 1px light ring, gated by `scripts/check-shadow-sources.py`. Owed:
  Bean's eye on the dark-surface screenshot and the ring strength.
- Also owed, not gating U-1's own closure: the sandybrown deploy of everything since theme 1.5.91 (waits on
  another session committing `sgs/google-reviews`); theme gradient presets read as unknown in the canvas
  until callers pass `useSettings('color.gradients')`.

**Next: U-2**, surface scrim colour, alpha and blur per tier (M-14) — design-gated, not started.

Gate 3C passes when (the one definition; the same words are in the implementation plan §7 and the
strategic plan's Gate 3C entry):

1. Every family in the signed list is covered: its exit cells reachable and at least one reproduced
   live. Twelve families (M-01, M-02, M-05, M-06, M-12, M-23, M-26, M-29, M-41, M-42, M-50, M-51) are
   already covered, are in no unit, and close the gate as covered. No family closes the gate as parked.
2. Each unit row cites its live report with `verdict: PASS`.
3. `node plugins/sgs-blocks/scripts/audit-inline-styling.js --check` exits 0 and
   `python plugins/sgs-blocks/scripts/no-inline/check-no-inline.py` passes against a reachable canary.
4. Two composed real headers match their reference rows: the pill on fixture page 3734 (lamalama) and
   the capped-width header on page 3733 against the reference Bean names, with equal left and right
   gaps at 1440px, a mega panel whose width equals the header's and a dropdown centred on its parent
   item. Bean's eye is co-authoritative (R-31-13).
5. Spec 36, Spec 37, this verify doc and LEDGER state the model.

## Wave 4 — Proof gate (clones)
- STATUS: not started
- All 13 roster references measured in the requirements table (W3B-3 owes the Away, ButcherBox and
  rabbit.tech captures; 8 of 11 third-party references have drawer data only today; the two Claude Design drafts are captured in W3B-3a); the header and nav architecture (Wave 3C) is complete; clone
  roster = 13 (12 if the W3B-3 teardown finds a resn effect that no Spec 38 tier can express) —
  Gate 5 counts the roster.
- Substitution policy (fonts/imagery) signed by Bean BEFORE the first clone (W4-a2).
- studionamma: DP5 per-property homes table reviewed; DP7-clean evidence pack (computed-parity +
  open-state captures + labels fidelity PASS); **Bean's eye acceptance recorded** BEFORE any other
  clone starts.
- Each subsequent clone: same evidence pack + Bean's eye; capability gaps filed as wave-1–3
  defects, zero trimmed references; effects use the built Spec 38 tiers, a mismatch is a defect
  against that FR, and an effect no tier can express is a Bean trim decision (the termination
  rule), never a silent loop-back.
- Presets extracted per accepted clone; contrast pass on all 8 client palettes; starter set
  narrowed to `scratch` + 3 search variants.

## Wave 5 — Clone walker
- STATUS: not started
- FR-37-22 walker clones a reference header/footer end-to-end through the pipeline (run artefacts).
- The roster clones green as regression fixtures.
- FR-37-23: live FRs + never-overflow on every live site + no inline styling + Bean's eye = track
  CLOSED.
