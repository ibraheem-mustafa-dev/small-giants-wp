# 6-Residual Fact-First Investigation — 2026-07-05 evening session (Bean-directed)

Method: every residual treated as a HYPOTHESIS. 7 parallel read-only tracers + 2-persona research (9 agents), every load-bearing claim fact-checked by main-session tracing against source/DB/live page (STOP-15). Live ground truth: page 8 fetched WITH the D2 block deleted (Bean's test) — deletion state confirmed, breakage enumerated at 375/650/1440.

**Verdict headline: 1 hypothesis REFUTED (H6), 2 partially wrong in mechanism (H3, H5), 3 confirmed (H1, H2, H4), 1 located precisely (H7). Redoing the debugging was justified — the recorded causes would have produced two wrong fixes (H6's "two-path" unification and H5's capability-only seed).**

---

## H1 — The D2 style block (STOP-52). CONFIRMED load-bearing + three new structural defects

**Problem.** The pipeline ships a 129-rule page-scoped CSS block inside the page content (`upload_and_patch.py:236-246` prepends it as a `wp:html` block). Bean deleted it live; the page visibly broke. Its header comment lies twice: "PIPELINE INTERMEDIATE ONLY — not a deploy artefact" (it IS deployed, verbatim) and "theme/sgs-theme/styles/ is intentionally empty" (`mamas-munches.css` exists there).

**Effect (measured on the live D2-less page).** Primary/secondary buttons lost their coral background (preset colour rules lived only in D2); the 600px-band grids collapsed (trust-bar + ingredients 2-across instead of 4 at 650px; gift cards 1-across instead of 2); hero grid-areas/order and h1 sizes at risk; section paddings/max-widths on the 6 container-converted section roots gone.

**Proven cause — rule-by-rule disposition (129 rules):**

| Bucket | Count | Meaning |
|---|---|---|
| SHOULD-BE-D1-LIFT | 50 | a block-settings destination EXISTS; the router failed to see it |
| GENUINE-GAP-NEEDS-ATTR | 42 | no destination exists (incl. 9 spec-sanctioned F-ii band rules) |
| CHROME (header/footer/skip-link) | 36 | dead selectors — theme templates own these |
| DRAFT-CONVENTION | 1 | `.container` utility |

Only ~20–25 rules actually bind and paint on the rendered DOM; ~80 are dead selectors (draft classes that don't survive conversion) — but the binding ~20–25 are exactly what broke.

**Why 50 lift-able rules stranded in D2 — four router blindnesses (all verified in `orchestrator/css_router.py`):**
1. **Channel blindness:** `_css_prop_maps_to_typed_attr` (:315-342) checks ONLY custom block attrs — never native `supports` (channel a), never the wrapper contract (c), never the theme snapshot (d). `feature-grid` margin-bottom stranded despite `supports.spacing.margin: true`.
2. **Shorthand blindness:** draft `background`/`padding`/`border` shorthands never match the suffix table (keyed `background-color`, `padding-top`…) → the whole button-preset family stranded.
3. **Hover blindness:** `:hover` is stripped (:221-222) and the values are never routed to the existing `*Hover` attrs (button has `colourBackgroundHover`/`colourBorderHover` in the DB).
4. **Attr-naming mismatches:** `colourBorder` doesn't `endswith` `BorderColour` etc.

**Structural defect (STOP-6 class): the D2-when-D1 cheat gate is a silent no-op.** `cheat-gate/check_d2_when_d1.py:36` points at `scripts/pipeline-state/` while runs are written to repo-root `pipeline-state/` — it has been returning 0 violations via its graceful-skip path. Pointed at the real run dir it flags 2 (both spec-sanctioned F-ii rules — the gate is also media-blind). Its slug regex also mangles element classes (`.sgs-trust-bar__inner` → `sgs/trust-bar__inner`), hiding element-class strandings.

**Spec-aligned end state (per STOP-52 + R-31-15c + FR-31-5):**
1. Fix the four router blindnesses (shorthand expansion before classification; consult native supports + wrapper channel; hover→`*Hover` routing) → the 50 SHOULD-BE-D1 rules lift.
2. The 9 F-ii band rules move to the `sgsResponsiveOverrides` block-attr channel (H8) — block-settings data, not pipeline CSS.
3. The 42 genuine gaps: seed attrs where the capability belongs on the block (hero per-element typography + grid-areas are the big cluster) or EXCLUDE-with-reason.
4. Chrome rules: EXCLUDED-with-reason (theme owns chrome).
5. D2 then becomes a drops/debug log only; an end-gate deletes/skips inserting it at 100% content+CSS parity; the header comment is corrected NOW.
6. Re-point `check_d2_when_d1.py` to the repo-root pipeline-state, make it F-ii-aware, fix the slug regex.

---

## H2 — Zero h1 on the page. CONFIRMED (+ family gap)

**Problem.** No converter path writes `sgs/heading.level`; the source tag is used to pick the slug then discarded on BOTH recognition paths (atomic `recognition.py:76-79` AND scalar `extraction.py:254`); `render.php:94` defaults `h2`. Verified: zero `"level"` keys in the stage-4 emit; live page 0×h1, 15×h2; draft has 1×h1, 5×h2, 4×h3, 4×h4.

**Effect.** SEO + WCAG heading-hierarchy defect on every clone; h3/h4 semantics lost.

**Solution (universal, R-31-9).** A tag-identity attr write in `services/assembly.py::build_block_markup` — the one point where the source node AND final attrs coexist for every recognition kind. DB-gated signal: the block declares an enum attr whose values contain the node's tag (no slug literal; precedent = the layout-trigger and inheritStyle steps already in assembly.py). The SAME mechanism covers the verified family: `sgs/media.mediaType` (a draft `<video>` currently emits an image-mode block) and heading `subTag`. Also a SPEC GAP: Spec 31 never mandates tag-identity preservation — write the rule in (Rule 7).
Note: `sgs/icon-list` has no ordered/listType attr at all (block capability gap, stale DB note) — separate small block task.

---

## H3 — maxWidth type bug. PARTIALLY CONFIRMED — two paths, not one

**Problem.** `value_serialise.py` is a documented stub (`return raw.strip()`) — but the real routing: text-leaf `max-width` goes `layer_detect` → CONTENT → `content_band.py:108`, which hardcodes `attr_type="string"` and has NO number check (validate.py checks kind/existence/enum — never attr_type). `outer_box.py` DOes handle numbers correctly (`_attr_is_number` → split + Unit companion) — the precedent exists in-repo. **Second independent path:** `root_supports.py:379-388` responsive tier writes `marginBottomMobile:"24px"` (string) into number attrs the same way.

**Effect (proven in emit).** `"420px"/"540px"/"620px"` strings into `sgs/text.maxWidth` (type number) → WP schema validation drops them → hero sub / ingredients intro / disclaimer run full width; hero sub also silently loses its mobile bottom-margin.

**Blast radius (DB-enumerated).** Only sgs/text maxWidth (3 live) + margin/padding tier attrs (1 live) are hit today; at-risk: sgs/button margin/padding/minHeight tiers, sgs/label paddings, sgs/decorative-image widths. All other maxWidth-family attrs are string-typed — a type-aware fix must NOT touch them (emit-diff must show only number-typed rows changing).

**Solution.** Implement Spec 31 §3 step 5 properly: thread the REAL `attr_type` through `value_serialise` (all 5 callers currently hardcode "string"), add the number branch in `content_band` (mirror `outer_box._attr_is_number` + Unit companion) and in `root_supports`' responsive tier. Risk to design around: blocks without per-tier Unit attrs — px safe via defaults; non-px tier values log a gap rather than guessing.

---

## H4 — Button padding channel. CONFIRMED with mechanism correction

**Problem.** Converter lifts base padding into WP-native `style.spacing.padding` (button declares `supports.spacing.padding`) → WP paints it on the WRAPPER div (`get_block_wrapper_attributes`, render.php:642/742) — the visible `<a>` keeps preset `padding:14px 24px` (style.css:19). The block's own flat `padding*` attrs (which DO paint the `<a>`) are only written for responsive tiers, never base. Typography confirmed gated on `inheritStyle==='custom'` (render.php:276) — inert on preset buttons though the converter emits it. Presets confirmed colour-only at the painted layer; the theme snapshot DEFINES per-preset geometry (`padding 14px 28px`, font-size, radius, min-height) but **zero code consumes those vars** — dead data.

**Effect.** Find-out-more renders 14/24 instead of the draft's 6/0; ghost buttons can't shrink; two padding controls exist in the editor painting different elements (client confusion).

**Solution menu (Bean decides the channel):**
- **(A — recommended)** Converter routes button box-CSS to the block's flat attrs (paints the `<a>`), reserving native `style.spacing` for blocks where the wrapper IS the visual box. DB signal: block declares flat `padding*` attrs → prefer them. Universal (any block with both channels), no slug literal.
- **(B)** render.php reads `style.spacing` onto the `<a>` instead of the wrapper — fights WP convention, touches render only.
- **Preset build-out (both worlds):** wire the snapshot's existing-but-dead geometry vars into the preset CSS var() chain → presets become full looks, per-client editable via the snapshot channel; preset-sync (design-gated plan) then keeps them draft-faithful.
- Bonus fixes found: `fontFamily` attr is a dead channel (emitted, never rendered, no control); ungate typography rendering or stop emitting it on preset buttons.

---

## H5 — Trust-bar label lift. PARTIALLY CONFIRMED — capability + a second blocker

**Problem.** B2 (`styling_content.py:115`) hard no-ops without the `scalar-styling-lift` capability — only testimonial has it. BUT seeding the capability alone lifts nothing: the DB selector is `.sgs-trust-bar__label` while the draft uses `.sgs-trust-bar__text` — B2 has no role-fallback bridge (the array CONTENT path has one, `array_content.py:191-197`). Third risk (unverified): the draft's `min-width:1024 → 14px` desktop value may drop under A-collapse (no `labelFontSizeDesktop` attr — base is written first, `setdefault` then skips).

**Effect.** Label renders the style.css clamp (13.9px at 375) instead of the draft's 13px, and no client-editable value is set.

**Solution.** (1) Declare `"scalarStylingLift": true` in block.json `supports.sgs` + `/sgs-update` reseed (the STOP-24 channel — testimonial precedent at its block.json:78). (2) Add the role-fallback element-resolution bridge to B2 (same FR-31-2.1a principle the array path already implements). (3) Empirically verify the desktop-tier mapping during the fix (STOP-43 before/after on the real node).
**Universality (R-31-9):** 12 composites declare lift-able `*FontSize` attrs with selectors and no capability row — trust-bar, product-card (5 attrs), card-grid, option-picker, counter, media, mobile-nav, notice-banner, post-grid, quote, testimonial-slider, whatsapp-cta. The fix is the roster, not one block. (Colour-role set is larger still — hero/cta-section 20+ attrs.)

---

## H6 — Multi-button responsive. **HYPOTHESIS REFUTED** (Bean-held; this is the corrected cause)

**The recorded "two-collection-path" cause is wrong.** `arrangement.layout_attrs` reads the SAME FR-31-5.2 cascade as everything else; FR-31-2.8.4 is not violated. And the "no gap tier" evidence was stale — the newest run emits `gap:"12px", gapMobile:"10px"` (fixed mid-D279 by the partition commit).

**The real, proven cause — an attr-vocabulary gap:** the cascade resolves `flex-direction` → `flexDirection` → tier attr `flexDirectionMobile`; multi-button declares `direction`/`directionTablet`/`directionMobile` instead (plus a base-only `flexDirection` its render never reads — render.php:20-22/78/88/97 reads only `direction*`). `flexDirectionMobile` exists on ZERO blocks framework-wide, so the mobile `column` value dies as an honest NO_DESTINATION gap. The live page stacks correctly on mobile ONLY because `directionMobile` DEFAULTS to `"column"` — coincidental correctness via a hardcoded default (the documented cheat class). Bonus defects: multi-button render bands are 769/1024/768 (vs the 767/1023 standard — at exactly 768px draft wants row, block renders column); block defaults inject `wrap:wrap`/`alignItems:center` diverging from the draft's initial values.

**Solution menu (Bean decides — this is a vocabulary/architecture call):**
- **(A — recommended, composite-mirror aligned)** ONE vocabulary: add `flexDirectionTablet/Mobile` to the container-roster attr set (wrapper renders the tiers), multi-button drops its parallel `direction*` system. 19 blocks already declare base `flexDirection` — `direction*` is the divergence. Fixes every block, kills the dual system.
- **(B — smallest)** Seed a mapping so the cascade lands on multi-button's existing `direction*` attrs. Fixes multi-button only; keeps two vocabularies (R-31-9 smell).
- Either way: normalise the render bands to 767/1023.
**Blast radius:** any per-tier flex-direction flip gaps identically on every block today (hero content band included). Grid `gapMobile` is fine roster-wide.

---

## H7 — Typography regression (Bean-reported). LOCATED

**Facts.** `sgs/container` did NOT lose anything — full `supports.typography` (fontSize, lineHeight, textAlign, letterSpacing, textTransform, fontWeight, fontStyle) verified in repo AND in the deployed build on sandybrown. The concrete regression: **`cd27dca8` (quote ONE-content-model rebuild) deleted the quote's 22 wrapper-level body typography attrs** (bodyFontSize/lineHeight families + panels) and added NO replacement — quote now has zero typography supports (verified deployed), so "set once on the wrapper, cascades to all paragraphs" is gone there; each child must be styled individually. This continues the HC2 trend (hero/cta-section/testimonial parent typography removed 2026-06-09; info-box in the CG-9 sweep).

**The honest doctrine tension.** HC2 ("parent owns LAYOUT, child owns TYPOGRAPHY") currently bans BOTH: (1) parent per-element typography controls (rightly removed — dead by specificity), and (2) parent INHERITABLE DEFAULTS (WP-native `supports.typography` on the wrapper, inherited by children via normal CSS cascade — exactly what Bean wants, and exactly what container already legitimately does). The rule conflates two different mechanisms.

**Solution.** Amend HC2 to explicitly permit mechanism (2); add `supports.typography` `{fontSize, lineHeight}` (root-selector, no per-element routing) to `sgs/quote` — its `sgs/text` children carry no default font-size so they inherit naturally; audit which other composites should carry the same inheritable-default surface. Two structural blockers to note: the dead-controls build guard (must not flag native supports — verify) and `sgs/heading`'s hardcoded 28/36px role defaults (headings ignore any wrapper default — the CG-9 expose-as-attr class).

---

## H8 — Custom breakpoints (research-buddies, 2 rounds + verification). CONVERGED

**Answer: a structured `sgsResponsiveOverrides` array attribute** — `[{v:1, media:{type:"min",px:600}, target:"root|inner|item", props:{"grid-template-columns":"repeat(4,1fr)"}}]` — registered UNIVERSALLY via the `register_block_type_args` filter (in-repo precedent: `extension-attrs-rest-register.php` already registers 9 extension attrs this way; beats a per-block flag — zero drift surface), rendered by the existing wrapper uid-`<style>` emission (which ALREADY emits per-instance @media at 1023/767 for ~15 properties — this is a generalisation of a proven pipe, not new API territory), written by the converter at the F-ii branch (grid.py + css_router flip from EXCLUDED/D2 to a Write). **This is the D2-emptying mechanism** — the same shape later carries pseudoRules/stateRules.

Verified: sanitisation is not a blocker (attr JSON lives in the block comment; trust-bar `items[]` is the live production precedent; WP's own safecss allowlist covers grid/flex anyway); a hard CSS constraint (variables can't appear in @media conditions — two independent sources) makes PHP render-time interpolation the ONLY shape that can reference stored values, validating the design; GB 2.0 Pro is the commercial precedent (they compile at save-time, we interpolate at render-time — both valid, ours matches the existing wrapper). **Container queries and clamp() REJECTED for cloning** (they change the draft's viewport semantics — F-ii violation). **Auto-fit conversion rejected** (same reason). Cascade policy: base → device tiers → custom thresholds LAST in draft source order; no `!important` on overrides.

Known accepted gap: editor preview of tablet/mobile tiers is ALREADY broken today (container edit.js mirrors base tier only — pre-existing, not new); flag for a separate decision.

**Phases:** A (cloning unblock — attr + wrapper render + converter flip + ledger/gate relabel + read-only Advanced panel + canary verify): ~2–3 h. B (editable panel + pseudoRules/stateRules + the D2 end-gate): 1–2 sessions.

**Research graded A- (4.5/5)** (gap-analysis, 2 personas — sceptical core dev + delivery PM). Two cheap pre-ship follow-ups: benchmark the render-time interpolation cost on a multi-instance page; verify old post_content missing the new attr defaults gracefully to `[]` (expected yes — schema default; and pre-production + no-deprecations policy makes it near-moot). Persisted: blub.db + `~/.openclaw/workspace/memory/research/2026-07-05-wp-custom-breakpoints-sgs.md`.

---

## POST-GATE ADDENDA (Bean's answers + follow-up research, same session)

**Bean's decisions:** H8 responsiveOverrides **A+B approved**. H6 **unify on flexDirection\*** approved. H4 challenged → resolved with evidence (below). H7 inheritance model approved in principle → research confirms it (below).

### H4 resolution (Bean's challenge answered with evidence)
Bean was right about the block: `sgs/button` HAS flat padding attrs (13 in DB) that paint the visible `<a>`, and colour/weight/text-decoration DO land inline on the `<a>` (verified live). The defect is converter channel selection only: the draft's `padding:6px 0` was emitted into WP-native `style.spacing.padding` (verified in the 135042 emit), which WP paints on the WRAPPER div (verified live: wrapper inline `padding:6px 0`; `<a>` computes 14px/24px from base CSS). Zero flat `paddingTop` writes in the run. **Bonus live find: `minHeight:"44px"` string→number attr→WP-dropped→style.css 48px paints (4th live instance of the H3 type bug).** Bean's underline-hover point CONFIRMED as a two-level gap: no `textDecorationHover` attr exists on button (only colour/shadow/scale hovers) AND the router strips `:hover` without routing to the hover attrs that do exist (H1 blindness #3). Fix-shape: (1) converter prefers flat box attrs when the block declares them (DB signal, universal); (2) block gains textDecorationHover; (3) hover routing lands with the H1 router work.

### H7/inheritance synthesis (research-check, 2 agents, key claims fact-checked)
Bean's model ("parent container values = inheritable defaults; explicit child settings = ultimate truth") **IS the WordPress-native design**: origin layers core→theme.json→user→block-instance; WP core wraps global-styles defaults in `:root :where(...)` to keep them beatable (verified in live WP 7.0 `class-wp-theme-json.php:1545/1569/1786`); container supports.typography → style engine → inline on wrapper → natural CSS inheritance; child explicit values win by cascade. No new machinery needed.
**The real gaps found:**
1. **Converter:** `_root_lift_rules()` (root_supports.py:84-100) has ZERO typography rows (verified) — a draft `.section{font-size:20px;line-height:1.6}` GAPs today (typography resolver validates against container's custom attrs, which don't exist; native supports unused). Fix: add the typography rows (font-size/line-height/letter-spacing/font-weight/font-style/text-transform → style.typography.*), gated on `block_supports_for()` — DB-driven, universal via the shared wrapper; generalise the FR-31-5.1a band-fold from textAlign-only to the same supports-gated set. ~1-2h.
2. **`:where()` correction:** inherited values lose to ANY author declaration — a `:where()` sweep would NOT fix child blocks defeating inheritance. Real per-block options: delete the default (sgs/text pattern — verified clean), custom-property indirection (sgs/label pattern), or keep as legitimate role styling (headings/buttons intentionally don't inherit body size — matches UA behaviour). No blanket sweep.
3. **Fluid trap:** base theme.json has global fluid typography (verified :95-98) — since WP 6.1 it rewrites lifted `style.typography.fontSize` into clamp() ≠ draft. Clone snapshots need fluid off (Mama's already flat, c283821c) or a clone-mode gate.
4. **Quote block restore:** wrapper-level supports.typography {fontSize, lineHeight} + HC2 amendment (inheritable defaults ≠ per-element parent controls).
5. **Draft-side:** the converter's effective-value computation must resolve the inherited-property list, `inherit`/`initial`/`unset` keywords, body/section cascade walking, and custom-property inheritance (already partially in the cascade sampler; audit against this list).
STOP-44 check owed at build time: live-verify the style engine actually emits inline font-size on the dynamic wrapper.

## Incidental defects found (tracked, not silently dropped)

1. D2-when-D1 cheat gate silent no-op (wrong pipeline-state root) + media-blind + slug-regex mangles element classes — repair with H1.
2. `theme/sgs-theme/styles/mamas-munches.css` contradicts the "styles/ intentionally empty" claims (header + CLAUDE.md) — reconcile docs or file.
3. Button `fontFamily`: dead channel (emitted, never rendered, no control).
4. Multi-button render bands 769/1024/768 non-standard.
5. `minHeight:"44px"` string into number attr (H3 family — in the blast-radius table).
6. Hero `__sub` draft class vs render.php `__subheadline` — dead D2 selector family (content class drift).
7. Editor preview: responsive tiers don't preview (pre-existing; noted under H8).
8. `sgs/icon-list`: no ordered/listType attr at all (stale DB note references deleted frozen code).

## Decisions Bean must make

1. **H1/H8 — approve the `sgsResponsiveOverrides` schema shape** (`v`/`media`/`target`/`props`) now vs after a canary prototype; Phase A alone vs A+B this cycle.
2. **H4 — button box-CSS channel:** flat attrs painting the `<a>` (recommended) vs render.php reading `style.spacing` onto the `<a>`; + approve wiring the snapshot's dead preset-geometry vars.
3. **H6 — vocabulary:** unify on `flexDirection*` roster-wide (recommended) vs map to multi-button's `direction*`; (Bean-held item — release or hold).
4. **H7 — HC2 amendment:** permit inheritable wrapper defaults (native supports) while keeping the per-element parent-control ban; restore quote's wrapper typography.
5. **Auto-fit doctrine:** confirm the drop (recommended NO conversion — F-ii violation).
6. **Fix order** — recommended bulk pass below.

## Recommended fix order (smallest-plausible estimates)

| # | Fix | Est | Why this order |
|---|---|---|---|
| 1 | H3 type-aware serialisation (both paths) | ~30–45 min | Small, proven, unblocks 3 visible defects + margins |
| 2 | H2 level write (universal tag-identity mechanism) | ~30 min | Small, restores h1 + h3/h4; spec amendment included |
| 3 | Gate repair (D2-when-D1 re-point + F-ii aware) | ~20 min | A no-op gate is protecting nothing right now (STOP-6) |
| 4 | H8 Phase A responsiveOverrides | ~2–3 h | Unblocks the 600/640 band + starts emptying D2 |
| 5 | H1 router fixes (shorthand/channels/hover) | ~1–2 h | The 50-rule lift-rate raise; biggest parity gain |
| 6 | H5 capability roster + B2 bridge | ~45 min | 12-block universality |
| 7 | H4 channel + preset geometry wiring | ~1 h | After Bean's channel decision |
| 8 | H7 quote typography + HC2 amendment | ~30 min | After Bean's doctrine call |
| 9 | H6 vocabulary unification | ~1 h | Bean-held; after release |

Every fix: STOP-43 before/after on the real node, emit-diff full draft, deploy-before-measure, LANDED on page 8 computed-by-content at 375/768/1440, tests + gates green, baselines non-regressing, qc-council pre-commit.
