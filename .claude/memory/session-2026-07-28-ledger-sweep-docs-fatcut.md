# LEDGER sweep — 2026-07-28 (docs fat-cut session)

Swept out of `.claude/LEDGER.md` during the docs truth-sweep to bring it back under its own
24,576-byte cap (it stood at 38,799 bytes). Everything below is CLOSED narrative — the standing
constraints and current fronts stayed in the LEDGER. Verbatim; do not update.

---

## Track 2 mega/nav — GATE 3 CLOSED (2026-07-28, D401)

- **The mega menu is PROVEN, not theoretically built.** Fixture built (panel **1745** populated,
  menu **100** = Home · Brands[mega] · Recipes · Contact with the mega at **position 2**, page
  **1842** `/gate3-mega-nav/`). All **6 motion effects measured firing**; **axe 0 on the OPEN
  drawer AND the OPEN mega**; keyboard/ESC/focus-return; reduced-motion; JS-off crawl; **CF-1
  recursion run live**. Real visual-diff reports replaced the three `INCOMPLETE` ones.
- ⚠ **METHOD: a scoped axe run on a CLOSED surface passes vacuously** — `nav-qa/axe-run.mjs
  --scope .sgs-nav-drawer` returns "0 violations" with or without `--open`. **Any earlier
  drawer-axe claim from that harness proves nothing.** All runs here are openness-guarded. New
  STOP entry.
- **Two root-cause defects, invisible until something actually OPENED the panel on a real page:**
  the panel rendered a **101px sliver** (anchored to its `<li>`; the centring CSS could never work
  because every item is `position:relative` for the indicator), and the open panel was **painted
  UNDER the footer** (equal `z-index:1`, later DOM context wins) so hit-testing reached the footer
  and closed it — the "unhoverable mega". Both fixed + measured; the first fix hypothesis was
  REFUTED by injection before landing.
- **Bean's eye drove four more rounds, each finding something green gates hid:** off-centre panel ·
  "View all" rendering outside the panel · drawer menu capped at 95px · an *invisible* 12%-alpha
  border · a group-heading eyebrow **specified in BUILD-SPEC §3 but never built** · **panel padding
  0px from a scalar-vs-box shape mismatch** (STOP-D328 class) · aside background identical to the
  panel · nav had **zero container fill controls**.
- **Bean rulings applied:** nav border + item divider DROPPED same-day (those patterns are
  whole-HEADER treatments; `sgs/site-header` already has `color` + `__experimentalBorder`) ·
  "Collapse point" → **"Burger Menu"** with **Always / Tablet / Mobile / Custom**, no bare px in
  the UI · device-neutral wording throughout (burgers run on tablet + desktop) · `viewAllPlacement`
  (auto/none/bottom-left/bottom-right) replaces the hard-wired fallback.
- **SPEC 35 — nav inspector 13 panels → 8** (`43d3e2d2`; delegated to Sonnet, independently
  re-verified live). The universal extensions attach to every `sgs/*` block unconditionally; the
  opt-out `supports.sgs.hideExtensions` **already existed** and `sgs/brand-strip` already used it.
  **The Spacing panel was silently DEAD on nav-menu** — its fields wrote attrs that are never
  registered when a block declares native spacing. Negative control: `sgs/card-grid` still shows
  all four panels, so the shared mechanism is untouched. **Flagged not fixed:** the bespoke Custom
  CSS field is a Spec 35 Part F anti-pattern on all 81 blocks (framework-wide).
- **SECURITY (`ceac2c8d`):** an automated review's "stored XSS" label was WRONG (everything already
  `esc_attr()`s) but the CSS-**declaration** breakout was real — and in **two more places the
  review never looked at**. Fixed at the choke point (`sgs_css_value_has_breakout()`); 13-case unit
  run, 7 legitimate values byte-identical, 6 attacks rejected.

## Drawer desktop variants — design approved + built + council-fixed (2026-07-28 session 2, D403)

Bean corrected the design axis TWICE (variant = the LOOK, a complete-clone preset of defaults —
never geometry buckets, never hardcoded values; geometry = per-device attrs, killing the
"full-screen below collapse point" toggle) and mandated a CODE EXTRACTION before finalising: 15/15
cells of computed styles + cross-site diff at `.claude/reports/2026-07-28-drawer-code-extraction/`
(4 structural archetypes; link font-size 16–160px is the defining variable; NO reference uses a
scrim element; resn = WebGL, reference-only). Approved shape:
`.claude/plans/2026-07-28-nav-drawer-variants-design-gate.md` — per-device `anchor`
(full-screen/header/trigger/**centred** — Bean's pause-menu addition) + `panelSize` + surface
opacity/blur + `closeStyle` + `variantPreset` discriminator (variantAttr, FR-31-20) + nav-menu
`listColumns`; `edge`/`width` retired; 7 `registerBlockVariation`s. Built (Sonnet),
council-reviewed (2 Opus + 1 Haiku — 9 confirmed findings incl. `surfaceOpacity:0` invisible
panels, editor/frontend translucency divergence, inert variant declaration, desktop-anchor
cascading to phones), ALL FIXED + probe-verified live. Default instances render property-identical
(verified on page 1648). **SHIPPED + PUSHED: `faa14924` (build, all gates incl. visual-diff report)
· `cab1b916` (docs + extraction data) · `69dfbaf9` (Task 4 backdrop-click-to-close in
`store('sgs/nav')` — live-verified: centred 420px panel closes on backdrop click / stays open on
inside click / ESC returns focus to the burger; full-screen unaffected by construction, × still
closes; QA page 1879 created via REST + deleted).** Deploy-gate note: 2 oldshape-audit HIGHs on
page 1849 (card-grid `sgsBlockLink*`) were traced to a FALSE-POSITIVE class — extension-registered
attrs (JS `blocks.registerBlockType` filter) are invisible to the block.json-only audit — and
baselined WITH the register reference. Structural fix parked (`P-OLDSHAPE-AUDIT-EXTENSION-ATTRS`).
**DB registration DONE (post-handoff sweep):** `/sgs-update --stage 1` run —
`blocks.variant_attr='variantPreset'` seeded; `variant_slots` is structurally weak for these
value-differentiated variants (1 row — see Spec 36 FR-36-6 note; draft-side detection = Spec 33
Part 2). Spec 36 FR-36-6 + §6a + goals.md amended to the shipped state in the same sweep.
**Cross-track note:** `8644f4a3` (co-active track, courtesy fix, verified) moved nav-drawer's base
height/max-height literals into `:where()` — the new `panelSize` attr had made them an F3 violation
failing main's prebuild; rendered output byte-identical when unset, design untouched.

## Track 1b — Spec 35 full close-out (2026-07-28) — BUILD SURFACE COMPLETE

The 2026-07-26 close (D385) covered FR-35-1..6 + Spec 32 no-inline only; a full ground-truthing on
2026-07-28 found the close-framing omitted the rest of Spec 35's Part M: the D4 cascade / canonical
`resolveTier()` (the Spec 37 Group-B blocker), the Wave-1 rollouts (SgsLinkControl 13 blocks,
ShadowControl 9 blocks), Wave 2/3 components, Part-K gate promotion, and two design gates Bean
ordered kept in scope. Approved plan: `~/.claude/plans/please-read-through-all-hashed-wreath.md`.

**Wave 1 LANDED** (`64999cd2` + `7f4f399a`, deployed to sandybrown, fully-gated build GREEN, D388
editor pass COMPLETE — all 6 changed blocks PASS on canary page 1849 with per-block reports at
`reports/visual-diff/*-2026-07-28-d388.md`): SgsLinkControl on icon/pricing-table/social-icons/
team-member (+2 extras: product-card MediaUploadCheck, process-steps reduced-motion); cta-section on
ShadowControl; icon-list no-inline fix; sgs-quote F2 goldens re-seeded. **D388 earned its keep: the
editor pass caught a universal SgsLinkControl bug** (WP LinkControl's `settings` prop REPLACES
defaults — the Open-in-new-tab toggle was missing from every consumer; fixed at the shared
component, redeployed, re-verified).

**Both gates APPROVED (D400) and the follow-through SHIPPED** (`fe20df4e` → `b9c5f6d1`, all
canary-deployed + D388-verified): T2.2b wrapper preset-or-raw shadows + container/hero/trust-bar on
ShadowControl · **T1.1 canonical `resolveTier()` BUILT — JS + PHP + shared 16-case golden fixtures,
16/16 both runtimes, independently re-run** (cascade approved for behaviours + values + §3.8 header
content; **Bean-carved exclusion: general block visibility does NOT inherit** — sgsHideOn* stay
independent) · form successRedirect → searchOnly page-picker · google-reviews/trustpilot config URLs
= registered audit exemptions · testimonial hover + trust-bar icon-circle/badge shadows → full
ShadowControl · editor-canvas shadow preview gap CLOSED on hero/trust-bar/cta-section. T2c also
closed same day: pricing-table £ mojibake (byte-level root fix) + 20 patterns re-authored (container
validation errors 14→0) + Icon Grid re-tokened readable (theme 1.5.51).

**CHAIN CLOSED** (`ac0c30eb` → `e4bd72ef` → `eb255f06` → T5.1): T1.2 ResponsiveTriStateControl +
T1.3 scoped emission (goldens 25/25 both runtimes) → T1.4a inventory → part-2 link batch (raw-url
WARNs 0) → **T1.4 FR-37-14 SHIPPED + QC-PROVEN LIVE** (tri-state cascade verified at 1440/900/375
via real UI; QC round 1 found 3 defects → fix round fact-checked: CSS same-selector !important
collision CONFIRMED and fixed via `sgs_merge_tri_state_declarations()`; panel-not-mounting DISPROVEN
— the QC probe never selected the block in the Site Editor iframe, a vacuous-check class) →
SgsLinkControl staged-settings root cause → **T5.1 GATE PROMOTED: `audit-inspector-conformance.js
--check` wired into prebuild FAIL-CLOSED, negative-control proven.** D402: Part G verdict table
(adopt duotone+aspectRatio in T3.5; keep-SGS shadow/minHeight/sticky/lightbox; templateLock
per-client only).

**T3/T4 shipped** (`07c67642` → `64f5080e`, ~18 delegate-routed packages across waves A+B):
MediaGalleryPicker · GradientOverlayControl (one shared BackgroundPanel covers container/cta/hero) ·
stretched-link overlay (nested-`<a>` impossible; team-member + info-box dead attrs deleted) ·
decorative-image toggle + button aria-label chain fix · imageControls (FocalPointPicker {x,y},
object-fit) · native duotone (media+gallery) + native aspectRatio on media · ToolsPanel: 23 panels
converted across 19 blocks, 8 skip-reasoned in-code. Bean-eye defects all fixed + live-PASSED:
pricing dual markers · inert billing toggle (author-origin display beats UA `[hidden]` BY CASCADE
ORIGIN) · post-grid squish (TWO layers: defensive auto-fit/minmax + the REAL cause, an attr-name
collision double-grid).

**THE INJECTION-CLASS ARC (the day's biggest structural find):** render_block injectors assuming
first-tag-is-root landed payloads inside the Spec-32 leading scoped `<style>`, which the p99 lift
then STRIPPED — erasing injection + evidence. Fixed across hover-effects/animation/parallax/
image-controls; that resurrection exposed that the D346 "inline-zero win" was partly VACUOUS (the
inline var writes had been silently deleted, features dead) — completed properly: injector vars now
route via `helpers-scoped-instance-vars.php` scoped rules; the last render-level writer
(team-member, block-private) migrated; live-proven. Two cross-track unbreaks shipped (nav-drawer
100dvh `:where()`; variantPreset enum + CONSCIOUS F6 baseline).

## Prior-session pointer blocks (2026-07-25 → 2026-07-27)

- **2026-07-27 Track 2 mega** — superseded by the Gate-3 close above. Shipped the 5 DEFERRED mega
  items (`db2b96d3`) + follow-on fixes (`9f8a6437`); its standing blocker ("motion not live-verified,
  panel 1745 EMPTY, R-31-13 sign-off not obtained") is CLOSED by D401. Full block archived verbatim
  in `memory/session-2026-07-27-4.md`; decisions D396 + D397 carry the detail. Parking
  `P-MEGA-GATE3-LIVE` can be archived. Canary-behind-main warning cleared (D394).
- **2026-07-27 Track 2b** — detail in `decisions.md` D393/D394/D395 + Spec 37 §3.3a / FR-37-41 / §5
  + `memory/session-2026-07-27*.md`. **D393** `ae9b1db4` — `templateLock:'all'` re-applies a
  container's own template on EVERY mount and matches rows by ARRAY POSITION (never `rowSlot`),
  which had silently corrupted **15 of 16** header/footer starters and DESTROYED content; fixed by
  passing the template only into a genuinely empty container, measured 15/16 → 0/16. **D394**
  `46749091` — a latent ORDER-DEPENDENT fatal in `sgs/responsive-logo` (2 shared helpers, no
  `require_once`; 1 of 81) returning HTTP 500 whenever it rendered alone. **D395** `20ec422c` —
  FR-37-41 preview-before-active, closing residual B2; 4 negative controls.
- **2026-07-25 / 2026-07-26** — detail in `decisions.md` **D381–D392** +
  `.claude/reports/2026-07-26-spec32-11-condition-done-audit.md` + `memory/session-2026-07-2*.md`.
  Covers: Spec 37 per-row/sticky (FR-37-40), Spec-32 no-inline CLOSED (the "2805-GAP Wave B" front
  was a PHANTOM — the GAP count is semantic noise, not work-remaining), the mega-menu CORE + Gate 2
  + the block.json style-handle sweep (D382), and the converter self-nest guard (D381).

## Setup-simplification track — CLOSED + archived (historical)

P0–P6 executed, archived 2026-07-17. Plan: `plans/archive/2026-07-16-setup-simplification-and-protocol.md`;
per-phase detail in `memory/session-2026-07-17-p5-skills-lean-ruler.md`.
**Two durability caveats STILL STANDING** (carried forward into the LEDGER): `~/.agents` is NOT a git
repo, so the skillscore script + 5 grafted skills + `nextjs-testing` are LIVE but UNVERSIONED
(recovery = per-file `.bak-2026-07-17-*`); and the `lifecycle-gate-stop.py` unwire is done locally
but NOT committed to the `~/.claude` repo.
