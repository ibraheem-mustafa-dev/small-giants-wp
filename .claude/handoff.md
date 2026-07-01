---
doc_type: handoff
project: small-giants-wp
thread: cloning-pipeline / FR-31-4 container-default BUILT + LANDED + Bean-review fixes
session_date: 2026-07-01
---

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
