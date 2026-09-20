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
- STATUS: partial. DONE a, b, c, d, e, f (live/eye verification owed), g, h, j, k, l, n, q, r, s, t, u ·
  PARTIAL i · design written, awaiting the design gate: m, p · no host defined: o.
- DP7 harness self-tests pass FIRST (W2-i precedes Wave-4 evidence). Built: shared
  `nav-qa/lib/openness-guard.mjs` (exit 3 = VACUOUS), full-element contrast walk, `--self-test` in
  five scripts. Open: `--self-test` on `sweep-drawer-variants.mjs`, `shoot-drawer-pairs.mjs`,
  `elementfrompoint-sweep.mjs`; the content/label count-fidelity check (fails on count/label
  mismatch, right-site keyed) does not exist.
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

## Wave 4 — Proof gate (clones)
- STATUS: not started
- 12/12 references measured (Away, ButcherBox, rabbit.tech teardowns owed; 9/12 today); clone
  roster = 11 (10 if the W4-a teardown finds a resn effect that no Spec 38 tier can express) —
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
