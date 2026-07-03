---
doc_type: handoff
project: small-giants-wp
thread: cloning pipeline / D270 — feature-grid 4-col (delegate to shared grid engine); + parallel blocks thread D268-D269 (sgs/audio + sgs/media)
session_date: 2026-07-04
---

# Session Handoff — 2026-07-04 (D270 — feature-grid renders through the shared container grid engine)

## Completed This Session (CLONING PIPELINE thread — separate from the D268-D269 blocks thread below)
1. **D270 — feature-grid 4-col FIXED + LANDED (`9a437113`/`be8e721e`/`409a47fc`, pushed).** The ingredient grid rendered 3-across; the draft wants 4. **Bean corrected my first (code-inferred) premise and was right (STOP-43):** dumping the LIVE CSS proved the shared `SGS_Container_Wrapper` ALREADY emitted `.sgs-container-<uid>{grid-template-columns:repeat(4,1fr)}` + mobile `1fr 1fr` — the grid was transferred fine — but feature-grid's OWN render.php auto-flex `<style>` (`#uid.sgs-feature-grid`, specificity 1,1,0) overrode it (`.uid` = 0,1,0). A sibling `sgs/container` on the same page already rendered 4-col via the wrapper (proof the engine works; feature-grid was the sole composite-mirror divergence).
2. **Fix (NO converter change):** (a) `feature-grid/render.php` — when an explicit `gridTemplateColumns` is present, delegate to the wrapper (force `layout=grid`, no competing `<style>`, `--grid` class); auto-flex kept opt-in; default flipped auto-flex→fixed-columns. (b) `class-sgs-container-wrapper.php` — suppress the tablet/mobile `sgs-cols-{tier}-N !important` shorthand when a base `gridTemplateColumns` governs (a default `columnsTablet=2` was crushing the base template at tablet; D228 family). (c) editor follow-ups (review findings d/b): edit.js preview reads the explicit template; container inspector help text per-breakpoint accurate.
3. **LANDED sandybrown page 8:** 4/4/2 desktop(222×4)/tablet(160×4)/mobile(2×2), computed + Bean-eye screenshot; auto-flex override + `sgs-cols-tablet-2` both GONE. **All 6 page grids regression-scanned at desktop+tablet — zero regression.** Independent adversarial diff review: no blocking bug (one authored edge case unreachable by both converter engines + every pattern → parked). 374 tests + cheat-gate green; convert.py byte-identical; feature-grid v0.3.0. `reports/visual-diff/feature-grid-2026-07-04.md`.
4. **NEXT (last cloning-fidelity task in the main prompt):** product-card typed-mode Layer-B structure (price renders 18px Inter, draft is 28px Fraunces bold) — its own design-gate.
5. **Docs:** decisions.md D270; parking.md (P-FEATURE-GRID-AUTOFLEX-COLUMNS archived as resolved; 2 review edge-cases parked); state.md + next-session-prompt.md updated (Task 1 DONE, product-card is the lead); memory `block-own-render-can-override-shared-wrapper`.

---

# Session Handoff — 2026-07-04 (D268-D269 — dedicated sgs/audio block [7 player styles + Web Audio visualiser] + sgs/media audio-removal + branded video player)

## Completed This Session
1. **D268 — `sgs/audio` block SHIPPED + /qc PASS (`596b9943`, pushed).** A native `<audio>` player upgraded by `view.js` (viewScriptModule) to one of 7 styles — minimal / waveform / spectrum / radial / oscilloscope / gradient-pulse / hidden. Progressive enhancement (SSR native player = no-JS fallback; save.js null → no deprecation). The 4 reactive styles share one `AudioContext` + per-instance `AnalyserNode` (`createMediaElementSource`, guarded). Client controls: source (external/media-library), style picker, playback toggles, brand accent+spectrum via `DesignTokenPicker`. AudioObject JSON-LD schema. Perf: RAF gated on play AND `IntersectionObserver` visibility + reduced-motion freeze + first-play graph + no per-frame refit. Registered in DB (blocks + block_composition via `seed-composition-roles.py`). **/qc PASS on sandybrown** — all 7 variants LANDED (enhance + real-click playback + reactive analyser reads real same-origin data [freqMax 255] + canvas paints + a11y + zero block console errors). **QC bug found+fixed:** `crossorigin="anonymous"` blocked non-CORS external playback → removed.
2. **D269 — sgs/media audio-mode REMOVED + branded video player (`e8bebd39`, pushed).** Audio fully removed from sgs/media (moved to sgs/audio) — mediaType `audio` enum + 8 `audio*` attrs + render branch/emission/whitelist + editor UI + the `.sgs-media__audio` style; `replaces=[core/image,core/video]`, v1.5.0 (both raters confirmed zero dangling `audio` ref). Branded video player (new `view.js`) replaces the native `<video controls>` chrome for direct video — centre-play + hover-reveal bar (play/scrub/timecode/mute/volume/fullscreen), keyboard-operable, theme-tokened; YouTube/Vimeo iframes untouched; native player = no-JS fallback.
3. **/qc-council on the media changes: GO** (2 read-only raters). Sole blocker (both raters): the wrapper `keydown` stole arrow keys from the scrub/volume range inputs → FIXED (`e.target !== wrap` guard) + verified LIVE (ArrowRight on the scrubber = native +0.005s fine-step, not a +5s seek). Polish: 44px buttons + drop-shadow/text-shadow scrim. Security clean (innerHTML all static ICON constants).
4. **Docs:** decisions.md D268/D269; `reports/visual-diff/{audio-2026-07-03,media-2026-07-04}.md`; the one-time prompt `next-session-prompt-audio-video-blocks.md` marked Tasks 1-3 DONE.

## Current State
- **Branch:** `main` at `57d86217`. D-ceiling **D269**. All pushed (0 ahead of origin).
- **Tests:** 374 converter+conformance pass; cheat-gate 0 NEW; npm build clean (dead-control + F5/F6 green); WPCS 0 errors; convert.py byte-identical.
- This was a BLOCK-DEV workstream, SEPARATE from the cloning pipeline (untouched — its next work is feature-grid/product-card per the main `next-session-prompt.md`, the D267 parallel session's thread).

## Known Issues / Blockers
- **One-time prompt Task 4 remains:** finish the deferred core→sgs replacement-table judgment rows (audit report §C) + run `/sgs-update` to regenerate `specs/02-SGS-BLOCKS-REFERENCE.md` (reflect the new sgs/audio block + media v1.5.0 + divider gap). Then DELETE `next-session-prompt-audio-video-blocks.md`.
- Minor: sgs/audio reactive visualisers idle for cross-origin external audio (analyser tainted) — playback works; same-origin (media-library) drives them. Documented, acceptable.

## Next Priorities (in order)
1. **Cloning pipeline (main thread):** feature-grid 4-col (investigate the premise — the "auto-flex" claim is probably wrong) + product-card structure. See `next-session-prompt.md`.
2. **Audio/video follow-up (one-time):** core→sgs table Task 4 + `/sgs-update` reseed, then delete the one-time prompt. See `next-session-prompt-audio-video-blocks.md`.

## Files Modified
| File path | What changed |
|-----------|--------------|
| `plugins/sgs-blocks/src/blocks/audio/*` | NEW block — block.json/index.js/edit.js/save.js/render.php/view.js/style.css/editor.css |
| `plugins/sgs-blocks/src/blocks/media/{block.json,render.php,edit.js,style.css}` | audio mode removed; block.json v1.5.0 + viewScriptModule + video chrome CSS |
| `plugins/sgs-blocks/src/blocks/media/view.js` | NEW — branded video player |
| `plugins/sgs-blocks/scripts/seed-composition-roles.py` | +sgs/audio block_composition row (content-block) |
| `.claude/decisions.md` · `reports/visual-diff/*` | D268/D269 + visual-diff reports |

## Notes for Next Session
- **QC caught two smoke-test-invisible bugs** the LANDED-on-one-instance test missed: the `crossorigin` non-CORS playback break (audio) + the wrapper-keydown key-steal from range sliders (video). Only a real end-to-end + adversarial-review pass surfaces these.
- **DB was materialised directly this session** (media replaces, sgs/audio rows) — durable channels (block.json / seed-composition-roles.py) are the source, so a `/sgs-update` reseed reproduces them.

## Next Session Prompt
Both prompts are already written: `next-session-prompt.md` (cloning: feature-grid/product-card) + `next-session-prompt-audio-video-blocks.md` (one-time: core→sgs table Task 4 + reseed).

# Session Handoff — 2026-07-03 EVEN-EVEN-LATER (D267 — universal L2 interior band-CSS fold: contentWidth + textAlign LANDED; ran in PARALLEL with the D264-266 session)

> Coordination: this session ran CONCURRENTLY with the D264-266 session. My D267 work COMPLETES that session's "Task 1 — L2 content-width" (the RIGHT way — its stated premise was disproved, STOP-43). Remaining = its Task 2 (feature-grid + product-card).

## Completed This Session
1. **D267 — universal L2 interior band-CSS fold. LANDED + pushed (`a438bb41`, `516a5790`).** The `__inner`/`__card-inner` content-band CSS was dropping. Proven on the REAL draft (STOP-43): the handoff premise ("4 composites lack `contentWidth` — run the container-mirror sync") was WRONG — the 4 default-container sections (featured/ingredients/gift/social) ALREADY fold contentWidth; only **trust-bar** (a composite, `has_inner_blocks=0`/array) dropped it, because NO path folds a composite's sole pass-through inner. Fix (ONE mechanism, R-31-9, Spec 31 §2.4/§13.4 FR-31-5.3): shared `_sole_passthrough_child` detector + `build_block_markup` step-3c composite fold via `route_interior_css_to_parent_slot`; default fold switched to the SAME router (BEM-less fallback on BOTH paths). `route_interior` gained co-declared `var()` resolution + inheritable base-tier `text-align` → the block's WP-native `textAlign` support.
2. **D267 render-side — `SGS_Container_Wrapper` emits `has-text-align-*` explicitly (`5205f170`).** LANDED caught the textAlign fold was WRITTEN-not-LANDED (STOP-21): WP core does NOT merge `has-text-align-*` into `get_block_wrapper_attributes()` for this dynamic composite wrapper (WP 7.0). Wrapper now emits it → the ingredients band + all its content render centred live.
3. **`containerKind` DECLARED in `info-box` (content) + `feature-grid` (layout) block.json** — the §13.6 declaration gap (kind previously only in DB + render.php).
4. **LANDED on page 8 (anonymous computed-style):** trust-bar band `max-width`=1100px, featured=1040px, ingredients/gift/social=960px; ingredients heading+intro+cards+disclaimer all centred. Bean eye-confirmed (R-31-13).
5. **Pre-commit qc-council (3 read-only raters vs file:line+DB+real draft): unanimous GO** — Rater B found the BEM-less composite-path asymmetry → mirrored the fallback (`516a5790`). 374 tests (+4 `test_band_fold.py` regression locks) + cheat-gate 0 NEW; convert.py byte-identical (D-MODULAR).

## Current State
- **Branch:** `main` at `516a5790`. D-ceiling **D267**. **Tests:** 374 pass, 1 skip, 2 xfail. **Build:** n/a (Python + PHP). All D267 pushed.
- **Uncommitted (NOT mine — co-active session):** spec-20/21 staged deletions, `lucide-icons.php`, Bean's `current-clone-*.html` snapshots.

## Known Issues / Blockers
- **feature-grid renders 3-across, draft wants 4** — NEXT, BUT the prompt's "`layoutMode=auto-flex` ignores columns" premise is probably WRONG (Bean) → investigate the real cause + discuss the user-friendly fix with Bean BEFORE building.
- **product-card typed-mode structure** (price 28px Fraunces bold → 18px Inter) — still open.

## Next Priorities (in order)
1. **feature-grid 4-column** — investigate the REAL premise first (not the stale prompt claim), then discuss the fix with Bean.
2. **product-card Layer-B structure** (its own design-gate).

## Files Modified
| File path | What changed |
|-----------|--------------|
| `plugins/sgs-blocks/scripts/converter/services/extraction.py` | `_sole_passthrough_child` + `_bem_element_of` helpers; default fold → route_interior (BEM-less fallback); build_block_markup step-3c composite band-fold |
| `plugins/sgs-blocks/scripts/converter/services/fold_helpers.py` | `route_interior_css_to_parent_slot` — co-declared var() resolution + text-align → native textAlign gate |
| `plugins/sgs-blocks/includes/class-sgs-container-wrapper.php` | emit `has-text-align-{textAlign}` explicitly (WP core doesn't for the dynamic wrapper) |
| `plugins/sgs-blocks/src/blocks/{info-box,feature-grid}/block.json` | declare `supports.sgs.containerKind` |
| `plugins/sgs-blocks/scripts/converter/tests/test_band_fold.py` | NEW — 4 regression locks |
| `.claude/decisions.md` | D267 |

## Notes for Next Session
- **A schema-valid, emitted converter attr can still be a RENDER no-op** if the block's dynamic wrapper doesn't apply the WP-native support (has-text-align was NOT auto-added by `get_block_wrapper_attributes()` for the dynamic composite — WP 7.0). LANDED (live computed-style) caught it; the emit-proof + a code-reading rater did not. STOP-44 (new).
- **Do NOT "run the container-mirror sync" for L2 content-width** — that premise was disproved this session. The fold is a converter fix (done). The sync is optional declaration hygiene only.
- **Prove the premise on the real node (STOP-43)** paid off AGAIN — the written diagnosis was wrong twice this session (the sync premise + my own grep-based table).

# Session Handoff — 2026-07-03 EVEN LATER (Task-4 re-clone LANDED + icon-source correction D264 + core→sgs mapping D265 + block features D266 + audio-player design)

## Completed This Session
1. **Task 4 re-clone → LANDED-verified all 4 held fixes on page 8** (the real homepage). `SGS_NEW_ENGINE=1` clone → overwrite sandybrown page 8; anonymous Playwright at 375/768/1440 confirmed: ingredients emoji 🌾🍺🌿🌱 render (0 empty icons); trust-bar star FILLED (pink `rgb(197,106,122)`, others outline); body 16px; trust-bar grid 2/4/4 (exact draft). computed-parity (rule 4a): CSS 51% / content 77% overall. Held commit `31358f84` no longer held — see D264.
2. **D264 — icon-source lift CORRECTED + DB role-dispatch (`a22c7fcb`, pushed).** A pre-push `/qc-council` (2 read-only raters) + Bean's review found D263's resolver emitted a raw-`svg` kind to a NON-EXISTENT `iconSvg` attr (dead branch; sgs/icon's real sources = lucide/wp-icon/dashicon/emoji), and a linked raw-svg icon leaf fell to a silent default-star. Fixed: `resolve_icon_kind` returns the 4 REAL sources (dashicon via `dashicons-<name>`, wp-icon via `data-wp-icon`/`wp-icon-<name>`; raw svg → loud gap). Bean flagged the leaf arm's hardcoded kind→attr-name map as an R-31-1 smell → refactored to **DB role-dispatch**: 4 new `icon-<kind>` roles (migration `2026-07-03-register-icon-source-roles.py`) tagged reseed-durably via `ATTR_CLASSIFICATION_OVERRIDES`; the arm finds the attr BY ROLE like the sibling text/image/link arms (verified clean). LANDED-verified page 8. 370 tests, cheat-gate 0 NEW, convert.py byte-identical.
3. **D265 — core→sgs replacement mapping completed, many-core→one-sgs (`302880d0`, pushed --no-verify [metadata-only, Bean-approved]).** Root-cause: recognition NEVER emits a core block (resolves to SGS or a loud gap), and the bare-tag path already reverse-walks `blocks.replaces` — so NO recogniser change, just DATA. `replaces` is now a JSON list in block.json (seeder normalises to comma-string; `_blocks_replaces_reverse` splits). 17 declarations added → **25 core→sgs mappings, 0 dup core claims**. Full audit + Bean's rulings: `reports/2026-07-03-core-to-sgs-replacement-audit.md`.
4. **D266 — 2 block features activating D265 replacements (`38c27ca2`, pushed).** **sgs/divider** `variant=gap` (invisible spacer, gapHeight/gapHeightUnit; no deprecation; v0.3.0). **sgs/media** `mediaType=audio` (native `<audio>` player, full audio* attr set, MIME auto-detect; v1.4.0). Tag hooks `<audio>`→core/audio, `<details>`→core/details. **LANDED-verified live on sandybrown** (deployed build, rendered real instances). Visual-diff reports `reports/visual-diff/{divider,media}-2026-07-03.md` (satisfied the visual gate). npm build clean, WPCS 0 errors.
5. **Audio-player design — artifact published + architecture decided (NO code yet).** 6 audio-player styles (Minimal Pill / Waveform / Live Spectrum / Radial+Glow / Oscilloscope / Gradient Pulse) as an interactive preview (studio-console identity, Web Audio-driven reactive demos). Artifact: https://claude.ai/code/artifact/625ea278-d1a9-471a-98db-8bb8d9b8cc76 (source `scratchpad/audio-player-styles.html`). **Bean decided:** build a DEDICATED `sgs/audio` block (7 variants = the 6 + a "hidden/none") + a Web Audio visualiser view-module; re-point `core/audio`→sgs/audio (remove audio mode from sgs/media, port the logic); + re-skin the generic sgs/media VIDEO player with a branded control chrome; + finish the core→sgs table judgment rows. → **specialised one-time prompt `.claude/next-session-prompt-audio-video-blocks.md`** (delete after done).

## Current State
- **Branch:** `main` at `38c27ca2`. D-ceiling **D266**. All pushed (0 ahead of origin).
- **Tests:** 370 converter+conformance pass, cheat-gate 0 NEW (73 baselined), convert.py byte-identical. npm build clean (dead-control guard passed), WPCS 0 errors.
- **DB:** icon-source roles (4) + core→sgs replaces (25 mappings) + audio/details tag hooks materialised + verified. A routine `/sgs-update` reseed to regenerate the block reference is a clean follow-up (durable channels — block.json / migration / overrides — already verified).

## Known Issues / Follow-ups
- **Two separate workstreams remain, split across two prompts (Bean's instruction):** (a) the CLONING pipeline continues in the MAIN `next-session-prompt.md` — L2 content-width universal, feature-grid variant, product-card structure (Task-4 re-clone + icon/core→sgs/block-features removed as DONE); (b) the AUDIO/VIDEO block build lives in the one-time `next-session-prompt-audio-video-blocks.md`.
- **Minor polish nit (tracked):** sgs/media emits its shared `object-fit` style on the `<audio>` element too — harmless (audio ignores object-fit).
- **core→sgs table:** the 4 STRONG + Bean-ruled judgment rows are wired; deferred/unruled rows (cover, media-text, query, form-fields, columns→container `core/column` child) remain in the audit report §C for the one-time prompt to finish.

---

# Session Handoff — 2026-07-03 LATER (Tasks 0-3: Gate A unblock + D259 landed-commit + theme 16px + trust-bar star control + fingerprint migration + universal icon-content lift)

## Completed This Session
1. **Task 0 — D259 Gate A unblocked + committed.** Gate A was NOT blocked by D259 (its emit changed no golden); it was blocked by a long-standing `composition_role` misclassification — 5 typed-array blocks (pricing-table/icon-list/brand-strip/process-steps/timeline) tagged `leaf` not `content-block` (D150 fixed the analogous card-grid/gallery/post-grid, missed these). `leaf` triggers frozen convert.py's is_leaf text-fallback → dumped a pricing block's content into `popularBadgeText`. Fixed the classification in `seed-composition-roles.py` → Gate A 43/43 green, NO regen. D259 (min-width cascade) committed `b9f2ee55`. Both pushed (D260).
2. **Durability wiring.** `seed-composition-roles.py` was never run by `/sgs-update`, so a reseed would silently revert composition_role. Wired it as a Stage-1 tail (`f5e52365`); PROVEN by planting a `leaf` revert → the tail restored `content-block`. Pushed (D260).
3. **Task 1 — theme base font.** Clone rendered 18px body (live `wp_global_styles` set body to the `medium` preset, diverged from the snapshot); draft base = 16px. Pinned `theme-snapshot.json` fontSize 16px + line-height 1.6, deployed → body 18→16px LIVE. 18px font-size mismatches → 1 (computed-parity). `10b07b4a`, pushed.
4. **Task 2 — trust-bar per-icon fill control.** The blanket `fill:none` forced the star badge to an outline. Added per-item `fillStyle`(outline/filled)+`fillColour` (block.json/edit.js/render.php/style.css) + converter auto-set via `is_filled_glyph`. Built + deployed to canary; `--filled` CSS rule + render exemption verified live. `017bf900`, pushed (D262). Star renders filled on the next re-clone.
5. **qc-council (unanimous GO).** 3 cross-model raters validated the built Task-0/2 code pre-push: security clean (fillColour → `sgs_colour_value` → `esc_attr`), no regressions, convert.py byte-identical. Its one follow-up (composition_role reseed durability) → fixed by item 2.
6. **Task 3a — fingerprint migration (P-FINGERPRINT-MIGRATION).** Migrated the fingerprints.json selector overrides → `ATTR_CLASSIFICATION_OVERRIDES` (current-DB values = behaviour-preserving) + dropped the load from `assign-canonical.py`. VERIFIED zero regression via a fresh-reseed diff on a DB copy (null the 50 sgs/* fingerprint rows → re-derive w/o fingerprints → apply overrides → all 50 reproduced exactly). `1df0a9b4`, pushed (D261).
7. **Task 3b — universal icon-content lift (emoji/lucide/svg).** Premise verified EMPIRICALLY: the real ingredients info-box emitted an EMPTY `<!-- wp:sgs/icon /-->` — the draft emoji dropped (sgs/icon's `identity` role uncovered by `run_mechanism_leaf`; and it never reached the leaf arm → Case-4 gap). Universal fix (Spec 31 §3.B.0): shared `resolve_icon_kind` (slug/emoji/svg — emoji detection ONCE) + a leaf icon arm + route icon-bearing leaves through it on a DB `identity` signal. Real info-box now emits `sgs/icon {emojiChar,iconSource:emoji}`; a lucide leaf still emits `{iconName,iconSource:lucide}`. Spec 31 §3.B.0 updated (Rule 7). `31358f84`, committed LOCAL (LANDED-pending). (D263)

## Current State
- **Branch:** `main` at `31358f84`. D-ceiling **D263** (D260-D263 added this handoff).
- **Tests:** 367 converter+conformance pass (+3 icon regression), 1 skip, 2 xfail; cheat-gate 0 NEW (73 baselined); F6 0 violations; convert.py byte-identical (D-MODULAR).
- **Push status:** all pushed EXCEPT `31358f84` (info-box icon lift) — held for LANDED at the Task-4 re-clone. 1 commit ahead of origin.
- **Uncommitted (NOT mine):** co-active session's staged spec-20/21 deletions; lucide-icons.php (npm drift); current-clone-*.html snapshots (Bean's).

## Known Issues / Blockers
- **Task 3b (emoji) + Task 2 (star) NOT LANDED** — both unit-verified; the LANDED gate (rendered on page 8) is the Task-4 re-clone. `31358f84` held from push until then.
- Bigger Task-4 converter fixes (L2 content-width universal, feature-grid variant, product-card structure) NOT started — root-caused only.

## Next Priorities (in order)
1. **Task 4 re-clone** — `/sgs-clone SGS_NEW_ENGINE=1` → overwrite page 8 (the real homepage) → LANDED-verify info-box emoji + trust-bar star + 16px theme + min-width grids together; run `parity/computed-parity.js` for reliable scores. Then push `31358f84` after a qc-council pass.
2. **L2 content-width UNIVERSAL** — the `__inner` max-width drops; apply the container-mirror sync (Spec 29 `sync-container-wrapping-blocks.py --apply`) so all container-equivalents get `contentWidth` — ONE mirror-sync gap on a DB signal, NOT per-block (STOP-38).
3. **feature-grid variant** (`layoutMode=auto-flex` ignores transferred columns) + **product-card structure** (Layer-B).

## Files Modified
| File path | What changed |
|-----------|--------------|
| `plugins/sgs-blocks/scripts/seed-composition-roles.py` | +5 typed-array blocks leaf→content-block (completes D150) |
| `plugins/sgs-blocks/scripts/sgs-update-v2.py` | +58 fingerprint overrides + 2 team-member merges; +`_run_composition_role_seed` Stage-1 tail |
| `plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py` | dropped fingerprints.json load + dead FINGERPRINTS_PATH/load_fingerprint_overrides |
| `plugins/sgs-blocks/scripts/converter/services/field_extractors.py` | +`resolve_icon_kind` + emoji detection (shared §3.B.0) |
| `plugins/sgs-blocks/scripts/converter/services/extraction.py` | `run_mechanism_leaf` icon arm + icon-bearing-leaf dispatch |
| `plugins/sgs-blocks/src/blocks/trust-bar/{block.json,edit.js,render.php,style.css}` | per-icon fillStyle/fillColour control |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/icon_resolver.py` | +`is_filled_glyph` |
| `sites/mamas-munches/theme-snapshot.json` | base fontSize 16px + line-height 1.6 |
| `.claude/specs/31-...md` | §3.B.0 icon 3-kinds + leaf identity arm (Rule 7) |
| `converter/tests/{test_array_content,test_extraction}.py` | +regression tests (filled-star, icon-leaf) |

## Notes for Next Session
- **Prove the premise on the real node (STOP-42 extension):** running the real info-box (not inferring from code) caught TWO wrong assumptions on the icon fix (identity role uncovered; Case-4 gap not the leaf arm). Always reproduce a converter fix on the real draft node BEFORE + AFTER.
- **Fingerprint migration is behaviour-preserving BY CONSTRUCTION** (override = current DB value, final Stage-1 writer, all pairs covered) — proven by the copy-DB fresh-reseed diff. The stale staged file had 5 mismatches; do NOT use it — use current DB values.
- **composition_role has NO code populator** — home is `seed-composition-roles.py`, now wired into `/sgs-update` (the tail). Add corrections THERE.
- **Star + emoji LAND at the re-clone** — do that FIRST next session, then push `31358f84`.

# Session Handoff — 2026-07-03 (D259 min-width cross-device tier CASCADE built + LANDED; full clone-vs-draft audit → root-cause themes; reliable computed-parity method established)

## Completed This Session
1. **D259 — min-width/max-width cross-device tier CASCADE (FR-31-5.2), BUILT + LANDED + Bean-confirmed.** The live CSS-transfer `collect_css_decls_for_element` matched `@media` rules by SUBSTRING and silently dropped any non-marker threshold (`min-width:600` matched nothing) → trust-bar rendered 2-col not 4. Rebuilt as a device-tier cascade sampling the CSS cascade at interior widths (Desktop 1440 / Tablet 800 / Mobile 375; `db_lookup.device_tier_samples`), mapping Desktop→base, Tablet/Mobile→suffixed; min/max symmetric; inverts a mobile-first draft into SGS desktop-base. Non-device thresholds log a non-silent F-ii residual. **LANDED page 8: trust-bar 375=2 / 768=4 / 1440=4** (exact draft match). Bean confirmed products/gift/hero column wins by eye.
2. **Spec 31 FR-31-5.2 DEFINED** (was referenced at §3 line 260, never specified) + §3 F-fork implementation note. **D259 added to decisions.md.** 320 tests (+9 regression) + cheat-gate green; convert.py byte-identical (D-MODULAR).
3. **Pre-commit adversarial council on the built D259** — validated in-scope; FIXED one dead-code landmine (`fold_helpers.route_area_css_to_block_attrs` broke under the semantic change); TRACKED 2 verified-latent faithfulness gaps (not hit in-scope) with repros in parking (`P-FR3152-RESIDUAL-FAITHFULNESS`).
4. **Full clone-vs-draft parity audit (page 8, header/footer excluded)** → root-cause THEMES (Bean asked for causes not symptoms): **content ~96% present**; the real gaps cluster into (A) **base-font typography** — draft base 16px vs clone theme base 18px → the brand quote + all no-explicit-size body text render 2px large + inherited line-heights too tight; (B) **L2 content-width universal** — `__inner`/`__card-inner` content-band `max-width` drops (trust-bar full-width; gift/ingredients/social/featured have NO `contentWidth` attr because the container-mirror sync `sync-container-wrapping-blocks.py --apply` is report-only); (C) **grid variant defaults** — feature-grid `layoutMode=auto-flex` ignores the transferred columns (3 not 4); (D) **product-card structure broken** (price 28px Fraunces bold → 18px Inter regular).
5. **Reliable-parity METHOD established (Bean-locked, now CLAUDE.md rule 4a).** Two earlier passes gave undependable scores: source-declaration-diff is blind to INHERITED values (missed the brand quote); wrapper-class-keying misclassifies (wrapper-vs-raw noise). The dependable method: `getComputedStyle` on each rendered TEXT element, keyed by normalised TEXT CONTENT. Reliable typography parity = **62% exact** with an exact per-element mismatch list.
6. **D259 commit BLOCKED by Gate A** (golden-fixture regression gate) — expected, the fix intentionally changes the converter emit. Code is staged/committed-pending; needs a verified REGEN re-baseline. Held from push regardless (D257/D258 also held).

## Current State
- **Branch:** `main` at `66aabe3a` (HEAD unchanged — D259 code files staged but commit blocked by Gate A). D-ceiling **D259**.
- **Tests:** 320 pass (+9), 1 skip, 2 xfail; cheat-gate 0 new (73 baselined); convert.py byte-identical.
- **Uncommitted/staged:** D259 code (styling_helpers.py, db_lookup.py, fold_helpers.py, test_minwidth_cross_device_tier.py) + docs (spec 31, decisions, parking, CLAUDE.md). Also the 3 Bean-made snapshot files `sites/mamas-munches/mockups/homepage/current-clone-{desktop,mobile,tablet}.html` (his, not mine).
- **Live:** D259 clone deployed to sandybrown page 8 via `SGS_NEW_ENGINE=1`. Held from push.

## Known Issues / Blockers
- **D259 commit blocked by Gate A** — re-baseline the golden fixtures with `REGEN=1` after verifying the diff is ONLY the intended min-width tier change (not accidental drift). Then commit + (on Bean sign-off) push the held D257/D258/D259 set.
- **Log-accuracy DOUBT (Bean, unresolved):** the pipeline's drop-logs report 2,380 `attribute_gap_candidates` rows + 227KB `leftover-buckets.json` for a clone that is visually close to the draft — Bean rightly doubts these are per-clone-real. `attribute_gap_candidates` is a CUMULATIVE ledger (accumulated across all runs, not this clone); the logs measure converter INPUT-side non-routing, NOT rendered fidelity. Do not trust the counts as a per-clone drop signal — the rendered computed-parity is the dependable signal.
- The bigger converter fixes (L2 content-width universal, feature-grid variant, product-card structure) are NOT started — root-caused only.

## Next Priorities (in order — Bean-set 2026-07-03)
1. **FIRST: fix the Mama's Munches stylesheet/theme-snapshot to match the draft's DEFAULTS** — base font-size 16px (clone is 18px) + inherited line-heights. Theme-layer fix (`sites/mamas-munches/theme-snapshot.json` → `push-theme-snapshot.py`), fixes the brand-quote + all no-explicit-size text in one.
2. **Icon fill for trust-bar + icon block** — render a `filled` icon (the star) instead of the uniform `fill:none` outline, AND expose a client-facing per-icon fill control (outline/filled) + a custom fill-COLOUR override (Bean: every capability ships as a block control). (This is `P-RAWSVG-FILLED-VS-OUTLINE`.)
3. **All Task-3 residuals** — `P-FINGERPRINT-MIGRATION`, `P-ARRAY-RECOGNITION-SCORING`, `P-SINGLE-ITEM-ARRAYS`, push held commits, + the D101 carry-forward (product-card Layer-B, ingredient `__icon`, cog-complexity lint).
4. **THEN re-run `/sgs-clone` + use the reusable parity tool** (built this thread) for reliable detailed parity scores. Also the L2 content-width universal fix + feature-grid variant fix.

## Files Modified
| File path | What changed |
|-----------|--------------|
| `plugins/sgs-blocks/scripts/converter/services/styling_helpers.py` | device-tier cascade replaces substring-drop (`collect_css_decls_for_element`) + `_media_condition_applies_at` + `_LOG` F-ii residual |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py` | `device_tier_samples()`/`device_tier_thresholds()` + 768/1024 constants |
| `plugins/sgs-blocks/scripts/converter/services/fold_helpers.py` | dead `route_area_css_to_block_attrs` corrected to new base=desktop semantics |
| `plugins/sgs-blocks/scripts/converter/tests/test_minwidth_cross_device_tier.py` | NEW — 9 regression tests |
| `.claude/specs/31-...md` · `.claude/decisions.md` (D259) · `.claude/parking.md` · `CLAUDE.md` (rule 4a) | FR-31-5.2 defined; D259; parity rule |

## Notes for Next Session
- **The 3 `current-clone-*.html` snapshots are useful** — each carries 26 uid-scoped `<style>` blocks with the per-device @media rules (the DOM is viewport-independent; the CSS is in the style blocks). Good for source-level CSS diffing — BUT they do NOT contain the theme's GLOBAL base font (18px), so they can't catch inherited-value mismatches. For those, use the computed-parity method (CLAUDE.md rule 4a).
- **Typography is ~faithful for EXPLICIT sizes** (all draft px present); the real typography gaps are the INHERITED base (16→18) + inherited line-heights + product-card. That's why priority 1 is the theme-snapshot defaults.
- **D259 is proven** — do not re-litigate the min-width fix; just resolve the Gate A regen + push.

## Next Session Prompt
See `.claude/next-session-prompt.md`.

# Session Handoff — 2026-07-02 LATER (D258 — array-item content lift COMPLETED for the 5 gap-blocks + LANDED on page 8; name-heuristic seeder trialled + REJECTED; backlog re-preserved)

## Completed This Session
1. **Array-item content lift COMPLETED (D258, commit `8375debb`).** The 5 gap-blocks (pricing-table/icon-list/social-icons/card-grid/trust-bar) now lift every content field. Mechanism: each dropping field DECLARES its extraction `role` in `block.json items.properties.<field>.role` (seeded to a new `array_item_schema.role` column by the existing Stage-1 seeder — no parallel table); the resolver prefers the declared role.
2. **Resolver gained 3 matchers (`array_content.py`):** L1b **BEM-element-segment** (pricing-table's 5 same-role text fields each find their own element; one `<a>__cta` feeds both `ctaText`+`ctaUrl` by different roles), L1c **flat-item self-extraction** (social-icon `<a>` carries fields on itself), + a **root-inclusion fix** in `_find_item_nodes` (direct-child-of-root items — icon-list/card-grid/social-icons — were never detected; real pre-existing bug).
3. **Name-heuristic seeder trialled + REJECTED (Bean-led).** Tried auto-deriving attr→element in `assign-canonical.py` (peel suffix + last camelCase segment). REVERTED — it mis-guesses (`titleColour`→`__heading` when real is `__name`) + over-resolves booleans. Ownership comes from the block's code/declaration (render.php applies it, edit.js groups it), never name-parsing → **Spec 31 FR-31-2.1a** (+ FR-31-2.5a array recognition signature).
4. **LANDED on page 8 (STOP-21).** `SGS_NEW_ENGINE=1` clone deployed to sandybrown page 8 (the real homepage). Live-verified: trust-bar renders its 4 real draft badges (icon + label), no phantom row, no default cheat — the labels ARE the draft's actual captions (lifted, not defaulted).
5. **Wiring verified:** the resolver runs on the live `extract_content` dispatch (`extraction.py:1013-1049` → `run_mechanism_array`), not just present.
6. **Backlog re-preserved in `parking.md`** (Bean flagged tracking had narrowed to this session's cleanup) — 6 follow-ups + a D101 carry-forward reminder naming the earlier items.

## Current State
- **Branch:** `main` at `aba1d5a3` (code at `8375debb`). D-ceiling **D258**.
- **Tests:** 311 pass (+5 array regression), 1 skip, 2 xfail; cheat-gate 0 new (73 baselined); `convert.py` byte-identical (D-MODULAR).
- **Push status: NOT pushed.** `8375debb` (code) + `ceb4dc12`/`aba1d5a3` (parking) on `main`, held for Bean's page-8 eye sign-off.
- **Live:** clone on sandybrown page 8. New engine opt-in (STOP-28 intact).

## Known Issues / Blockers
- **`P-MINWIDTH-CROSSDEVICE-TIER` (TOP):** trust-bar renders 2-col not 4-across — `@media(min-width:600px){repeat(4,1fr)}` dropped. `min-width:X`="X and up" must emit every device tier ≥ X + §3 F-ii passthrough for 600/640. Same root cause as products/gift/ingredients (D256). Bean: "very important".
- **`P-RAWSVG-FILLED-VS-OUTLINE`:** the 4th-badge star should be FILLED; the block's icon CSS forces `fill:none;stroke` on every SVG uniformly → the raw star renders as outline. Fix = a **client-facing block control** (per-icon fill: outline/filled) per Bean's principle "every pipeline capability must ship as a customisable block feature for clients", then render exempts a `filled` icon from the uniform `fill:none`.

## Next Priorities (in order)
1. **`P-MINWIDTH-CROSSDEVICE-TIER`** — the highest-value fix (trust-bar 4-col + products/gift/ingredients in one).
2. **`P-RAWSVG-FILLED-VS-OUTLINE`** — star fill as a client block control.
3. **`P-FINGERPRINT-MIGRATION`** (62 entries in `.claude/scratch/fingerprint-migration-entries.txt`; core/* keep-skip + reseed-diff) · **`P-ARRAY-RECOGNITION-SCORING`** · **`P-SINGLE-ITEM-ARRAYS`** · push held commits.
4. **Carry-forward (D101):** product-card typed-mode Layer-B rebuild, ingredient `__icon` emoji lift, cognitive-complexity lint on `array_content.py`, P-CLONE-FIDELITY-FULL-ALIGNMENT families.

## Files Modified
| File path | What changed |
|-----------|--------------|
| `plugins/sgs-blocks/scripts/converter/resolvers/array_content.py` | declared-role + L1b BEM-segment + L1c flat-item + root-inclusion fix |
| `plugins/sgs-blocks/scripts/sgs-update-v2.py` | `array_item_schema` +`role` column, seeded from items.properties |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py` | `array_item_field_schema()` accessor (field + role) |
| `plugins/sgs-blocks/src/blocks/{icon-list,social-icons,card-grid,pricing-table,trust-bar}/block.json` | per-field `role` declared |
| `plugins/sgs-blocks/scripts/converter/tests/test_array_content.py` | +5 regression tests |
| `.claude/specs/31-...md` · `.claude/decisions.md` · `.claude/parking.md` | FR-31-2.1a/2.5a; D258; backlog |

## Notes for Next Session
- **`assign-canonical.py` name-heuristic is a dead end** — don't retry it. Ownership = block code/declaration (FR-31-2.1a). The stale `fingerprints.json`/`tools/recogniser` builder is NOT the go-forward channel; `ATTR_CLASSIFICATION_OVERRIDES` is.
- **Bean's principle (2026-07-02):** every pipeline capability must surface as a customisable theme/block control for clients — a converter fix without an editor control is half-done.
- **The 5 gap-blocks are absent from page 8** — their fix is verified at resolver level (§7b); only trust-bar LANDED on the live page.
- STOP-39 unchanged: coding subagents cascade-fail — build INLINE.

## Next Session Prompt
See `.claude/next-session-prompt.md`.

# Session Handoff — 2026-07-02 LATE (DB-recognition array field-lift + role-fallback BUILT + committed; hand-declared arrayItemSchema retired; client-copy cheats removed; LANDED + slot-vocabulary pending)

## Completed This Session
1. **DB-recognition array field-lift — Bean's design, BUILT + committed (`c7fda7db`).** `converter/resolvers/array_content.py` fully rewritten: structural item detection (largest repeating same-BEM-token sibling group, §2.4 — no hand-declared `item_selector`) + a **2-layer field match** — L1 canonical-slot NAME, L2 **role-fallback** (a draft `__text` child carries `text-content` role so it fills the `label` field which is also `text-content`). Proven on the real trust-bar draft: 4 badges, captions via role-fallback, no phantom row, no client-copy. Replaces the hand-declared `arrayItemSchema`/`array_item_fields` mechanism Spec 31 §3.B.0.1 named an R-31-9 violation.
2. **Item field NAMES now DB-driven (`f892d585`, Bean-requested).** New `array_item_schema` DB table seeded from each block's `block.json attributes.<attr>.items.properties` by `sgs-update-v2.py`; `db_lookup.array_item_field_names()` reads it; the resolver reads the DB, not `block.json` at convert-time.
3. **Polygon-star iconSvg fallback (`f0f0c8ac`, item 3).** An icon child that resolves to no lucide slug (filled `<polygon>` star) preserves its raw SVG into the block's `iconSvg` field (icon_resolver Rule 2), detected structurally (gate-clean).
4. **8 array blocks de-hardcoded (`45869bfa`).** Added JSON-Schema `items.properties` (field names = the block's data model) + removed `supports.sgs.arrayItemSchema` from brand-strip/card-grid/cta-section/hero/icon-list/pricing-table/process-steps/social-icons.
5. **Client-copy cheats removed (`25464698`).** trust-bar `items.default`/`example` (literal Mama's captions rendered on every fresh insert) → generic neutral; product-card example → generic; + trust-bar `arrayContentLift` capability.
6. **Old seeder retired (`4d500bf6`) + tests (`4538c5d6`).** `array_item_fields` seeder → prune; tests rewritten for the DB-recognition path (dropped the stale `_lift_field` tests).
7. **F5 `no_slug_literal` gate caught 3 per-slot/role literal carve-outs** (`slot=='icon'`, `slot=='link'`, `role=='identity'`, `role in tuple`) — all refactored to DB-derived or moved to the un-gated shared `field_extractors` (→ STOP-41).

## Current State
- **Branch:** `main` at `550b4b41` (docs) / code at `f892d585`. D-ceiling **D257** (added this session for the array rebuild).
- **Tests:** 306 pass, 1 skip, 2 xfail; cheat-gate exit 0; F5/F6 green; `convert.py` byte-identical (D-MODULAR).
- **Push status: NOT pushed.** 7 commits `c7fda7db`→`f892d585` (+ the earlier held D254/§2 set), pending Bean sign-off + LANDED.
- **Live:** NOT yet LANDED on page 8 (Task 1 next session). New engine opt-in (`SGS_NEW_ENGINE=1`); prod default = frozen convert.py (STOP-28).
- **Uncommitted (NOT mine):** lucide-icons.php (npm drift), the W3 plan, my design-brief/synthesis reports.

## Known Issues / Blockers
- **Slot-vocabulary gap (5 blocks):** `icon-list.iconName/iconSource`, `social-icons.platform`, `card-grid.badge`, `pricing-table.ctaText/ctaUrl/ribbonText/savingsBadgeText/priceYearly` drop — their field NAMES don't resolve to a canonical slot. Net improvement (was empty), but incomplete; needs slot-alias seeding (Task 2).
- **STOP-24 hole:** `slots.aliases` is written only by `uimax-tools/seed-slot-synonyms.py`, NOT wired to `/sgs-update` — the vocabulary additions won't survive a reseed until this is fixed.
- **Single-item arrays** won't lift (structural detection needs ≥2 repeating siblings).

## Next Priorities (in order)
1. **LANDED-verify the array field-lift on page 8** (Task 1) — deploy `SGS_NEW_ENGINE=1` clone, confirm trust-bar renders its 4 draft badges, no phantom row.
2. **Complete the slot vocabulary** (Task 2) — add the 5 blocks' missing field-name aliases, following Spec 31 §13.3 FR-31-2.1 exactly; fix the STOP-24 alias-reseed hole first.
3. **Push** the held commits + add D257 on Bean sign-off.

## Files Modified
| File path | What changed |
|-----------|--------------|
| `plugins/sgs-blocks/scripts/converter/resolvers/array_content.py` | REWRITTEN — DB-recognition item detection + 2-layer match + role-fallback + iconSvg fallback |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py` | `array_item_field_names()` accessor (reads array_item_schema) |
| `plugins/sgs-blocks/scripts/converter/services/field_extractors.py` | icon-slug branch handles the `identity` role |
| `plugins/sgs-blocks/scripts/sgs-update-v2.py` | array_item_schema seeder (from items.properties); retired array_item_fields seeder |
| `plugins/sgs-blocks/src/blocks/{8 array blocks}/block.json` | +items.properties, −arrayItemSchema |
| `plugins/sgs-blocks/src/blocks/trust-bar/block.json` · `product-card/block.json` | client-copy removed; trust-bar +arrayContentLift |
| `converter/tests/test_array_content.py` + test_extraction.py + test_field_extractors.py | DB-recognition tests; stale hand-declared tests dropped |

## Notes for Next Session
- **The role-fallback is the load-bearing idea** (Bean's): match a draft child to a field by ROLE when the element NAME doesn't match a field name. `__text` (text-content) → the `label` field (text-content). Verified on real data.
- **Bean fact-checked the council hard** — several council findings were wrong (the `circle` alias, "8 blocks have items.properties"). STOP-15: a council finding is a hypothesis; verify before acting.
- **No design-gate for pipeline tasks (Bean 2026-07-02)** — follow Spec 31 in every detail instead (Rule 7 rewritten).
- **LANDED is the only closing gate** — the earlier "trust-bar works" read was FAKED by the client-copy default; nothing was lifted.

## Next Session Prompt
See `.claude/next-session-prompt.md` (7 rules incl. the follow-spec Rule 7 + reading gate + ritual + STOP catalogue 1..41 + the cheats-dealt-with record + Task 1 LANDED / Task 2 vocabulary).



## Completed This Session
1. **WS-A — Spec 31 §2.4/§2.5 layer-extraction built (`87816090`).** `converter/services/arrangement.py` (NEW: `carries_arrangement`, `lift_uniform_grid_item_css` DB-resolved via `attr_for_layer_property`); `extraction.py` `_descend_container_children` rewritten to §2.4 sole-pass-through-fold vs grid-item / slug-None-wrapper→own-container + `_route_container_child`. DELETED the D254 blind-descend. Fixed the brand `__content` flatten (2 grid items, not 4).
2. **Layer A — bare content tags land two ways, §3.B.0 (`989565e5`).** Mechanism B atomic fallback (bare `<p>`/`<h4>` that G1+global-BEM miss → `recognise()` atomic child — lands the brand quote's 3 body paragraphs). Mechanism A bare-tag → built-in scalar element via DB chain (element token → `block_for_slot_token` → reverse `atomic_tag_map`), fallback-only + consume-once + opt-in-gated.
3. **§2.3 layout trigger + string image-object lift (`8573c3c6`).** `arrangement.layout_attrs` emits `layout:grid`/`flex` (wrapper renders `display:grid` ONLY when `'grid'===$layout`; gridTemplateColumns inert without it) — fixed ingredients grid + social-proof flex-row. `run_mechanism_leaf` lifts `role=image-object`+`type=string` (sgs/media.imageUrl) — was skipped → empty media.
4. **media-sideload determinism (`db501007`).** Skips already-hosted absolute URLs instead of joining them onto mockup_root (mangled path → 12 errors → 0). Answers Bean: media was never manual — a sideload path bug.
5. **LANDED on sandybrown page 8** (2 `/sgs-clone SGS_NEW_ENGINE=1` deploys). Live: quote body renders, brand 2-col grid, ingredients grid, social-proof flex-row, images resolve, 0 invalid blocks.
6. **qc-council audit (Bean-requested) — CLEAN + UNIVERSAL.** 2 cross-model raters re-ran gates fresh + read code file:line: all 5 fixes UNIVERSAL (no per-block/slug/section gating), cheat-free (§7a clean, cheat-gate 0 NEW), rule-compliant (R-31-1..15). PROVEN: ingredients 2-col-not-4 is a pre-existing dropped-non-device-breakpoint gap, NOT a cheat these fixes introduced.

## Current State
- **Branch:** `main` at `db501007`. D-ceiling **D255** (add D256 next).
- **Tests:** 326 pass (17 new), 1 skip, 2 xfail; cheat-gate exit 0; `convert.py` byte-identical (D-MODULAR).
- **Push status: NOT pushed.** 4 new commits (`87816090`→`db501007`) + earlier D254 commits, held pending Bean sign-off + remaining fixes.
- **Live:** clone on sandybrown page 8. New engine opt-in (`SGS_NEW_ENGINE=1`); prod default = frozen convert.py (STOP-28).
- **Uncommitted (NOT mine):** W3 plan (WIP), lucide-icons.php (npm drift).

## Known Issues / Blockers (Bean re-review — 2 of 5 fixed, rest diagnosed)
- ✅ **#1 ingredients grid** renders but 2×2, should be **4-in-a-row** (desktop `@media(min-width:600px){repeat(4,1fr)}` DROPPED — 600 not a device tier). ✅ **#5 trustpilot/social-proof** now flex-row.
- ❌ **#3 products** + **#4 gift** stack: `layout:grid` lands but the desktop multi-col is at `min-width:768`/`640`. **ONE root cause (Bean-confirmed): `min-width:X` must emit EVERY device tier ≥ X; non-device breakpoints (600/640) need §3 F-ii passthrough instead of gapping.**
- ❌ **#1b ingredient icon** — `__icon` emoji doesn't lift (draft `.sgs-info-box__icon` vs attr selector `.sgs-info-box__media`) + info-box is InnerBlocks (Layer-B).
- ❌ **trust-bar spurious 1st row** — inserted first grid item concatenating all 4 columns' text in all-caps.
- ❌ **product-card body = plain text** (typed mode) — the Layer-B rebuild Bean specced (next-session-prompt Task 1).

## Next Priorities (in order)
1. **Product-card typed-mode Layer-B rebuild** (Bean-specced, feature-parity with bound mode) — next-session-prompt Task 1.
2. **Unified `min-width` tier fix** (#1 4-col, #3 products, #4 gift).
3. **#1b ingredient icon + trust-bar spurious row.**
4. **Push** held commits on sign-off.

## Files Modified
| File path | What changed |
|-----------|--------------|
| `plugins/sgs-blocks/scripts/converter/services/arrangement.py` | NEW — carries_arrangement / lift_uniform_grid_item_css / layout_attrs |
| `plugins/sgs-blocks/scripts/converter/services/extraction.py` | §2.4 descent rewrite + _route_container_child + Mechanism-B atomic fallback + build_block_markup layout trigger + gridItem setdefault + run_mechanism_leaf string image-object |
| `plugins/sgs-blocks/scripts/converter/resolvers/scalar_content.py` | bare-tag built-in-element matching (fallback-only, opt-in-gated) |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py` | `layer_attr_prefix` accessor |
| `plugins/sgs-blocks/scripts/orchestrator/media-sideload.py` | skip already-hosted absolute URLs |
| `converter/tests/test_arrangement.py` + `test_bare_tag_lift.py` | NEW — 17 tests |

## Notes for Next Session
- **Stacking (#1/#3/#4) is ONE root cause, Bean-confirmed:** `min-width:X` = "X and up" → emit every device tier ≥ X (768→Tablet+Desktop) AND preserve non-device breakpoints (600/640) via §3 F-ii passthrough. Lives in the CSS tier-mapping (`styling_helpers`/`grid.py`/`context.py`), NOT this session's files.
- **LANDED caught what emit-green couldn't** — the layout trigger looked right in the emit; only the live page + Bean's eye showed the desktop column count wrong (R-31-13).
- **"#1 fixed" was a false-positive I called** — saw "grid + 4 items", declared victory without checking vs the draft's actual desktop layout. Corrected (assume-nothing-positive).

## Next Session Prompt
See `.claude/next-session-prompt.md` (product-card Layer-B spec + min-width tier fix + carried-forward 7 rules / reading gate / ritual / STOP catalogue 1..39).

# Session Handoff — 2026-07-01 LATE (Spec 31 → UNIVERSAL-CLONING-PIPELINE rewrite + rename + cheat-gate coverage; §2 build teed up)

## What this session actually established (diagnosis — supersedes the #3-7 framing below)
The Bean-review defects #3-7 are NOT five separate patches. Deep source-verified investigation (systematic-debugging + ~6 read-only Explore/council agents + live page-8 + block.json/save.js/render.php/DB ground truth) collapsed them into ONE root cause: **the new engine never got the name-free layer-extraction system.** Corrections proven along the way:
- **Media-map is already wired + working** (hero images remap to WP URLs); images vanish because the *containers holding them* are dropped, not the map.
- **DB capabilities are NOT the cause** — the converter DERIVES `has_inner_blocks` fresh from save.js+render.php (`has_inner.py:115`); product-card/trust-bar cloned fine in the frozen engine on the same DB.
- **The atomic element→block mappings already exist** (`blocks.replaces`: p→sgs/text, h4→sgs/heading, a→sgs/button, img→sgs/media, blockquote→sgs/quote).
- **The real gap:** `_descend_container_children` (extraction.py:302-345) blindly unwraps every wrapper; the CSS-fold "conductor" is unwired (TODO-only). §2 of the spec is the target.

## The canonical model (Bean-taught, clarity-verified) — now Spec 31 §2
- **One recursive stream**, section by section, content + CSS TOGETHER (not the frozen engine's separate routes).
- **Container-equivalent blocks** (DB `container_kind` + `wraps_block`) at BOTH section-class AND div-class levels, treated identically. No class-section/div-section carve-out.
- **Per node:** recognise BEM → **variant lookup at recognition** (can set grid-or-not/slots; hero `split`, product-card `featured`/`trial`) → layer decomposition → content, same pass.
- **Layers (name-free, CSS signature):** OUTER / CONTENT (`max-width`+`margin:auto`) / ARRANGEMENT (`display:grid`|`flex` on the direct parent of items) / PER-ITEM (`gridItem*`).
- **Recursive fold:** a SOLE pass-through child folds in (content-band and/or arrangement CSS); a SIBLING'D child or one with block identity recurses as its OWN container. **Grid-item test first:** direct children of a `display:grid`/`flex` element are grid items → InnerBlocks + per-property uniform box-CSS → `gridItem*` (NOT the fold/recurse test).

## Completed + COMMITTED this session
1. **Spec 31 renamed `31-UNIVERSAL-CONTAINER-CSS-TRANSFER` → `31-UNIVERSAL-CLONING-PIPELINE` + new canonical §2 core chapter** (`c28a0086`). Authored by me, VERIFIED across 2 adversarial clarity-council rounds (fresh-implementer / pedantic-literalist / deliberate-misreader / plain-English) — all misreads closed. Old §2 axes preserved as §2.9; §3/§13 defer to §2; 17 cross-refs swept; Spec 22 stub relinked. This is the "never-explain-again" durable blueprint.
2. **Cheat-gate coverage on `converter/`** (`ab947ea3`). Checks #1/#2 (slug-literal + hardcoded-dict) now scan the new `converter/` tree (was a blind spot); whole-file allowlist for db_lookup/icon_resolver; bare-`sgs/` namespace-guard exempt; plant-tested (fires on real cheats, silent on docstrings+guards); 304 tests, gate exit 0. Arms the gate BEFORE the §2 build lands in converter/.
3. **Build-design doc:** `.claude/reports/2026-07-01-build-design-layer-extraction-slice.md` (the build plan, port-refs, cheat-strip list).

## THE BUILD (next — TWO workstreams, done first/parallel so one combined page-8 review shows everything)
Bean-directed sequencing (2026-07-01 late): run **WS-B (block rebuilds) first or in parallel with WS-A (§2)** so that when we LANDED-verify after §2, the review shows BOTH the faithful content/CSS extraction AND the element-based blocks together — one comprehensive sign-off, not two.

**WS-B — rebuild composites to element-based (block-dev; doesn't need pipeline context; via `wp-sgs-developer` specialist agent per-block OR inline — NOT general-purpose coding subagents, STOP-39):**
- **info-box** — InnerBlocks → element. Its scalar attrs already exist in block.json (`heading`/`description`/`subtitle`/`icon`/`mediaType`/`mediaEmoji`, role:content); wire render.php to read them (drop `$content`), edit.js inspector controls, `save.js`→null, `deprecated.js` for the InnerBlocks shape, version bump, `npm run build`.
- **notice-banner** — element-based text + **add an optional button element** (toggle on/off + full button customisation via the shared button controls).
- **quote** — paragraphs → text elements (+ attribution element, already scalar); no InnerBlocks children.
- **product-card** — ALREADY element-based (Spec 27 FP-H); no rebuild — §2 scalar-lifts it.
Each: no dead controls (HC2 guard); existing posts migrate via deprecation with zero "invalid block". After rebuild, the converter's `derive_has_inner_blocks` returns 0 for these → §2 scalar-lifts them automatically.

**WS-A — wire §2 into the new engine's single stream, universal across the `container_kind` roster (highest-regression; INLINE).**
- **First vertical slice = LAND the BRAND section** (D242): `.sgs-brand` root grid → 2 grid items (`__content` w/ heading+quote-paragraphs+cta, `__image`). Build the GENERAL §2 mechanism, prove it by LANDING brand on page 8, then confirm gift/social-proof/ingredients/featured-product land too.
- **Port-refs (frozen convert.py, READ-TO-PORT the logic, adapt to single stream, STRIP cheats):** `_process_container_children` (fold gate), `_detect_content_layer`, `_grid_item_areas`, `_merge_grid_attrs_into_container`, `_lift_uniform_grid_item_css`, `_route_interior_css_to_parent_slot`. Cheats to strip: `'sgs/container'`/`'sgs/multi-button'` literals → `db_lookup`; hardcoded sets → DB; verify `breakpoint_suffix_rules()` tuple shape.
- **Target files:** `converter/services/extraction.py` (`_descend_container_children` → §2 recursive fold + grid-item test), new arrangement/CSS-lift + gridItem* helpers, `field_extractors.py`. DB-driven, no per-block branches.
- **Gates:** cheat-gate green (armed) + `/qc-council` on BUILT code (STOP-23) + LANDED verify page 8 (computed-style/innerText 375/768/1440 + draft-vs-clone + Bean eye — R-31-11/13) + hero/trust-bar regression diff. Design-gate: §2 IS the vetted blueprint → build + qc-council-on-built-code (no new pre-build council).

## Current State
- **Branch:** main. Commits this session: `c28a0086` (spec) + `ab947ea3` (cheat-gate). The 9 EARLIER D254 commits (`c2105981`→`4e35522d`) still on main, NOT pushed (pending Bean sign-off on #3-7 — now the §2 build). D-ceiling D254 (no new D-number added this session; the §2 rewrite could warrant a D255 in decisions.md next session).
- **Tests:** 304 pass + cheat-gate exit 0. convert.py byte-identical (D-MODULAR).
- **Uncommitted (NOT mine):** `phase-W3` plan (WIP), `lucide-icons.php` (npm drift), + my untracked `build-design` report.

## Known issues / notes for next session
- **A subagent reverted `sites/mamas-munches/theme-snapshot.json`** (a pre-existing not-mine dirty file) — its change is lost (not recoverable). Flagged to Bean.
- **CODING SUBAGENTS CASCADE-FAIL in this environment** (STOP-39, new): a write/coding Agent returns a placeholder "running in the background, I'll relay results", does no work, and spawns more of itself (~94K tokens each). Read-only analysis/council agents work fine. DO THE BUILD INLINE. If a coding subagent is unavoidable, brief it "do the work yourself; do NOT spawn agents" + foreground + verify its edits yourself (one DID eventually complete correctly with that instruction, but only after a chaotic cascade).
- The §2 build is teed up from a committed, clarity-verified blueprint — start clean.



## Completed This Session
1. **FR-31-4 sgs/container DEFAULT (`c2105981`) — the #1 engine unblock.** The new engine now defaults a slug-None class-section to `sgs/container` + recurse-descends its children (was: `unrecognised`, emitted nothing). New `db_lookup.container_default_slug()` (DB-derived, no slug literal), `recognition.recognise_section()` (only defaults a GENUINE no-match; ambiguous tie stays loud), `extraction.run_container_default()`/`_descend_container_children()` (recurse through `__inner` wrappers to grandchildren; text-leaf→text-capable block; conservation `raise` on empty). **New engine clones 2/9 -> 9/9 Mama's homepage sections.**
2. **6-persona `/adversarial-council` design-gate BEFORE build** — all findings fact-checked vs live code + the real draft (caught a wrong DB-predicate proposal). Bean approved scope A (content now, interior layout-CSS = Step-7).
3. **3-reviewer pre-commit QC on the BUILT code (STOP-23)** — rule-compliance A, regression B+ (none), correctness C → fixed 3 real edge-case holes (loose-text NavigableString drop, ungated core/* rung, empty-leaf phantom sgs/text). 10 new tests; 299 total + cheat-gate green.
4. **2 wired-pipeline LANDED bugs found ONLY by deploying (STOP-21):** (`e18b48df`) `emit_block_markup` one-lined blocks → the line-based `ensure_root_section_class` dropped every child (84 blocks → 9 empty shells); fixed by newline-separating inner. (`c51c161d`) empty dynamic blocks (save=null) as open+close → WP validation dropped 5 of 9 sections silently; fixed by self-closing empties.
5. **Full `/sgs-clone` pipeline LANDED** end-to-end with `SGS_NEW_ENGINE=1` (all stage-gates + anti-mirror + wp-blocks-validate + critical-fix 4/4 pass); deployed to sandybrown **page 8** (the real homepage).
6. **Bean page-8 eye-review (R-31-13) — fixed #1 + #2:** #1 full-width made **UNIVERSAL** across container + composites (`666aae26`; the first cut was a slug carve-out CHEAT, R-31-9; universal signal = `is_root`) + **gated on `block_supports.align` per Spec 31 §3 step 7** (`7d694a54`). #2 chrome-skip header/footer/nav (`466ca73b`, SKIP_TOP_LEVEL_TAGS, gated to SGS_NEW_ENGINE=1).

## Current State
- **Branch:** `main` at `7d694a54`. D-ceiling **D254**.
- **Tests:** 299 pass (converter + cheat-gate), 1 skip, 2 xfail; cheat-gate + F5/F6 + Gate A commit gates exit 0.
- **Build:** Python converter (no npm for this work). convert.py byte-identical (D-MODULAR).
- **Uncommitted (NOT mine):** `lucide-icons.php` (npm drift), the W3 plan (session-start), src `render.php` ×N (R-22 comments), + screenshot pngs at repo root (canary-*.png / homepage-*.png — gitignore or delete).
- **Push status: NOT pushed.** 6 local commits `c2105981`→`7d694a54` on main, held pending Bean sign-off (composite fidelity #4-7 not there yet).
- **Live:** clone is on sandybrown **page 8** (the homepage, `https://sandybrown-nightingale-600381.hostingersite.com/`). New engine still opt-in (STOP-28) — prod default = frozen convert.py.

## Known Issues / Blockers
- **Bean-review defects #3-7 OPEN** (next session's primary tasks — `next-session-prompt.md`): #3 A1 media-map not wired (only hero img + trust icons show — BIGGEST, Bean priority); #4 hero split variant not on desktop; #5 trust-bar extra grid item (col-1 = all 4 columns' text in caps); #6 product-card renders as text not sgs/product-card; #7 ingredient cards empty. Each is a root-cause investigation (walker/recognition/media-adjacent).
- `MEMORY.md` at the 24576-byte autoload cap — needs compaction (parking `P-MEMORY-MD-COMPACT`).

## Next Priorities (in order)
1. **#3 A1 media-map** — script + wire the media-map loader through the new engine so `<img src>` remaps to uploaded WP URLs (biggest content blocker; media-map at `sites/mamas-munches/research/sandybrown-media-map.json`).
2. **#5 + #6 composite fidelity** — trust-bar spurious all-caps column; product-card recognised as text not `sgs/product-card` (recognition-coverage gap).
3. **#4 + #7** — hero split variant on desktop; ingredient card content lift.
4. **Push decision** — once #3-7 land + Bean signs off, push the 6 commits to `main`.

## Files Modified
| File path | What changed |
|-----------|--------------|
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py` | `container_default_slug()` accessor (DB-derived) |
| `plugins/sgs-blocks/scripts/converter/recognition.py` | `recognise_section()` FR-31-4 default + ambiguous-tie guard |
| `plugins/sgs-blocks/scripts/converter/services/extraction.py` | `run_container_default`/`_descend_container_children`/`_emit_content_leaf` + universal `align:full` (block_supports.align gated) |
| `plugins/sgs-blocks/scripts/converter/orchestrator.py` | `emit_block_markup` newline-separate + self-close empty dynamic blocks |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/__init__.py` | wiring calls `recognise_section`; chrome-skip header/footer/nav |
| `plugins/sgs-blocks/scripts/converter/tests/test_container_default.py` | 13 new tests (recognition default, recurse, text-leaf, conservation, 9/9 real draft) |
| `plugins/sgs-blocks/scripts/converter/tests/test_outer_box.py` | emit self-close assertion update |
| `.claude/decisions.md` · `state.md` · `parking.md` · `handoff.md` · `next-session-prompt.md` | D254 + reconciliation |

## Notes for Next Session
- **STOP-21 earned its keep twice this session** — the 84-block markup string looked perfect; deploying caught two content-dropping bugs unit tests passed. LANDED (Bean's eye on a real page) is the only gate that counts.
- **Universal or it's a cheat** — Bean rejected the slug-scoped full-width fix as an R-31-9 carve-out. Section-outer fixes fire on `is_root` for ALL section-class blocks (they share `SGS_Container_Wrapper` + `supports.align`). Memory: `section-wrapper-fixes-must-be-universal-across-container-and-composites`.
- **"Deploy to homepage" = overwrite the real homepage page** (sandybrown page 8), not a new page + front-page repoint. I got this wrong twice. Memory: `deploy-to-homepage-means-overwrite-the-real-homepage-page`.
- **A1 media-map (#3) is the next big lever** — without it the clone is text-faithful but image-sparse, which dominates Bean's visual read.

## Next Session Prompt
See `.claude/next-session-prompt.md` (carried-forward 7 rules + reading gate + ritual + STOP catalogue 1..36 + the #3-7 defect orchestration).

# Session Handoff — 2026-06-30 (W3 keystone child-lift + /sgs-clone wiring + Spec 22→31 merge — D252/D253)

## Completed This Session
1. **W3 keystone — universal child-lift (D252, `df9798a9`):** collapsed the lossy `_child_content_for_node` bypass — every child now routes through `build_block_markup` (one unified content+CSS+variant dispatch). New `run_mechanism_leaf` arm lifts a capability-less leaf's OWN element content (primary text + one image + one url via the shared `field_extractors`) + the inheritStyle preset resolution + R6 background-strip. A 6-persona `/adversarial-council` design-gated it; a pre-commit 2-rater review caught + fixed an over-lift (phantom iconTitle + boolean/date attrs) via a tight one-per-shape gate.
2. **Recognition has_inner fix (same commit):** `recognition.py` scalar branch hardcoded `has_inner_blocks=0`, mis-typing an element-class-recognised InnerBlocks parent (`.sgs-hero__ctas`→`sgs/multi-button`) as a leaf → buttons silently dropped. Now derives from the DB. **Found by the FULL-HOMEPAGE run** — a synthetic multi-button test used the named-root-class path and masked it (STOP-34).
3. **New engine WIRED into `/sgs-clone` (`798febc7`):** `converter_v2/__init__.py:_convert_section_body` — when `SGS_NEW_ENGINE=1`, uses the new engine per section where it recognises + emits, else falls back to frozen `walk()`. Flag UNSET = 100% frozen. convert.py byte-identical (D-MODULAR).
4. **Full-homepage universality map:** ran the new engine on all 9 Mama's sections — 2/9 (hero with CTAs, trust-bar) clone via the new engine; 7/9 honestly GAP (no registered composite). Found the **DEFAULT-IS-CONTAINER deviation** (STOP-35): the new engine's recognition 4th branch FAILS LOUD for a slug-None section instead of defaulting to `sgs/container`+recurse (FR-31-4) — the #1 remaining engine fix.
5. **Spec 22 MERGED into Spec 31 (D253, `bb7b1e99`):** Spec 22 absorbed into Spec 31 §13 (binding rules R-31-1..15, 3-exception walker, content fork, variant detection, appendices) + archived behind a redirect stub. Renumbered R-22→R-31 / FR-22→FR-31 across 69 active files via script (frozen convert.py + archives keep the 22 series; ID mapping R-22-N ≡ R-31-N documented). 286 tests + cheat-gate green.
6. **QC-council on the merged Spec 31 (`1e41c1df`):** 4 raters (completeness/consistency/accuracy/formatting) — verdict SOUND (13 carry-forward items + 15 rules present, G1-G5 closed, zero overstated build-claims). Fixed 9 surfaced defects (rule-ID miscites, phantom FR-31-18, stale "~5 functions", contradictions, frontmatter rule-list) + backfilled 3 absorption gaps (FR-31-11 non-sgs pass-through, FR-31-12 stage-2.json, FR-31-6.1 parallel-session protocol).

## Current State
- **Branch:** main at `1e41c1df` (pushed). D-ceiling **D253**.
- **Tests:** 286 pass (converter + cheat-gate) + Gate A 43, 1 skip, 2 xfail; F5/F6 commit gates exit 0.
- **Build:** Python converter (no npm). convert.py byte-identical (D-MODULAR).
- **Uncommitted (NOT mine):** `lucide-icons.php` (npm drift), the W3 plan (session-start), src `render.php` ×18 (R-22 comments kept — reverted from renumber, visual-diff-gate; mapping note covers them).

## Known Issues / Blockers
- New engine still INERT in prod by default (frozen `convert.py` runs live clones; `SGS_NEW_ENGINE=1` is opt-in). NOT yet LANDED on a real canary page.
- **The DEFAULT-IS-CONTAINER deviation** (STOP-35): the new engine refuses to emit `sgs/container` for a slug-None section (recognition.py 4th branch = loud RED) — blocks 7/9 real homepage sections. This is the #1 engine fix.

## Next Priorities (in order)
1. **sgs/container DEFAULT for slug-None sections (FR-31-4 / §13.2)** — make the new engine default a no-name-match section to `sgs/container` + recurse children, instead of failing loud. Unblocks 7/9 real sections. Design-gate (walker-adjacent, STOP-19) then build.
2. **Canary LANDED test** — run `/sgs-clone` with `SGS_NEW_ENGINE=1` on the Mama's homepage, deploy to sandybrown, computed-style + page-source-vs-draft at 375/768/1440 + Bean eye (R-31-13, STOP-21). The real validation — keystone is WRITTEN+tested but not LANDED.
3. **W3 remainder:** A2 content-conservation ledger, §5 lift-path, base-selector !important sweep, dead-code (`content_attrs_with_selector`).

## Files Modified
| File path | What changed |
|-----------|--------------|
| `plugins/sgs-blocks/scripts/converter/services/extraction.py` | child-lift collapse + `run_mechanism_leaf` + inheritStyle/R6 + None guard (D252) |
| `plugins/sgs-blocks/scripts/converter/recognition.py` | scalar branch derives has_inner_blocks + `recognition_for_slug` (D252) |
| `plugins/sgs-blocks/scripts/converter/services/field_extractors.py` | `link-href` alias on url-href handler (D252) |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/__init__.py` | `SGS_NEW_ENGINE=1` hybrid wiring (798febc7) |
| `.claude/specs/31-...md` | §13 absorbed Spec 22 + DEFAULT-IS-CONTAINER + build-state + QC fixes (D253) |
| `.claude/specs/22-...md` → `specs/archive/` + stub | Spec 22 archived + redirect (D253) |
| 69 active files (renumber) | R-22→R-31 / FR-22→FR-31 |
| `.claude/decisions.md` | D252 + D253 |

## Notes for Next Session
- **DEFAULT-IS-CONTAINER is the unlock** — most class-sections have no block; they DEFAULT to sgs/container+children (FR-31-4); a name-match (hero/trust-bar) is the exception. The new engine has this backwards. Fix recognition/dispatch, not the walker (which already recurses).
- **The full-homepage run is the real universality test** — synthetic fixtures masked the recognition bug. Run the new engine across ALL 9 sections, not one synthetic node.
- **SGS_NEW_ENGINE=1 is the test switch** — the new engine is reachable in `/sgs-clone` now; default-off = zero risk.
- **Spec 31 is now THE pipeline spec** (Spec 22 archived). R-22-N ≡ R-31-N; frozen convert.py keeps R-22.

## Next Session Prompt
See `.claude/next-session-prompt.md` (carried-forward 7 rules + reading gate + ritual + STOP catalogue 1..36 + the container-default + canary-LANDED orchestration).
