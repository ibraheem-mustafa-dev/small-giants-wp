---
doc_type: handoff
project: small-giants-wp
thread: cloning-pipeline / W3 keystone LANDED-in-engine + new-engine wired + Spec 22→31 merge
session_date: 2026-06-30
---

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
