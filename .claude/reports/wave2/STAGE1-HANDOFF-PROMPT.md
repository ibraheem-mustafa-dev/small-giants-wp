# Fresh-session cold prompt — Wave-2 clone-fix STAGE 1 (universal converter core)

Paste everything below the line into a fresh Opus session. Self-contained.

---

**Invoke `/autopilot` before anything else** (live skill routing + ADHD support for the whole session).

## What this is (plain English)
You are building the **universal pipeline converter core** — the headline fix for the SGS cloning pipeline. The deliverable is the **universal converter**, NOT a high parity score on the Mama's Munches draft. A temporary score regression while you replace a carve-out with the real universal mechanism is **fine** — provided you verify the replacement is genuinely universal on the LIVE DOM across all blocks. (The +13pp XS-3 revert happened because the replacement was *broken/non-universal*, not because regression is bad.)

## ⛔ READ FIRST (mandatory, in order)
1. `.claude/reports/wave2/CLONE-FIX-BUILD-PLAN.md` — the plan. Stage 1 is your scope.
2. `.claude/reports/wave2/ROOT-CAUSE-FAMILY-MAP.md` — the 8-family diagnosis + council corrections.
3. `.claude/reports/wave2/SIGN-OFF-LEDGER.md` — the 55-issue close-out tracker; update rows to VERIFIED as you land fixes.
4. `.claude/reports/wave2/STAGE0-FRS-AND-GATE.md` — the ratified FRs + the conformance gate design.
5. Spec 22 §FR-22-2, §FR-22-5, **§FR-22-5.1** (inherited/absent), **§FR-22-5.2** (breakpoints), §FR-22-19 (retirement clause) — the canonical rules you're implementing.
6. `../CLAUDE.md` §7-rules + the root-cause methodology section; `.claude/reports/wave2/01-hero.md` + `02-trust-bar.md` (worked fact + solution).

## Stage-1 scope (qc-council re-sized this into THREE pieces — keep them distinct)
1. **F1-consolidate (small).** Consolidate the 4 existing lift paths — `_lift_typography_to_block_attrs` (`convert.py:1400`), `_lift_wrapper_css_to_container_attrs` (`:981`), `_lift_root_supports_to_style`, the scalar-media path — into ONE DB-driven dispatch keyed on `role`/`canonical_slot`/`attr_type` (`equivalent_block_for`, `db_lookup.py:1995`). **Delete the dead `_lift_styling_attrs` (`:1687`) + `_slot_attr_prefix` (`:1665`)** (zero production call-sites — qc-council confirmed; fix the one test that imports them).
2. **F1-cross-node (NET-NEW code, the headline).** Route an interior element's CSS to its slot's destination: parent container attrs (`contentPadding`/`contentWidth`/gap) or child-block attrs. Today `_collect_css_decls_for_element(node)` (`:2872`) collects the node's OWN css only — nothing walks `__inner`/`__content` child CSS upward. This is real new code; size it as such.
3. **F6a inheritance/absence** (FR-22-5.1) — rides in the same `_collect_css_decls_for_element`: resolve inherited/ancestor values + make browser-defaults explicit (e.g. emit explicit `textAlign:left` so the heading block's `:where(){text-align:center}` default doesn't win).
4. **Remove the carve-outs** — replace BOTH per-composite branches: `_route_composite_interior` (def `:2404`, gated `db.has_scalar_media_attrs(slug)` `:2940`) + `_is_container_mirror_block(slug)` (`:2950`, def `:908`) → `_process_container_children` (`:3834`), AND the trust-bar atomic handler (`:2236`), with the universal dispatch (FR-22-19 retirement). **PRESERVE** the sole-element-child guard `fold_eligible = len(element_children) == 1` at `_process_container_children:3857` (it prevents the +13pp XS-3 regression). NB: `is_class_section_block` is NOT this gate (it's the voter helper, FR-22-16) — do not target it. **NOT in your scope:** the array per-item routing (FR-22-2.5 — TB-A badges/TB-B) is Stage 1b, a separate medium build; sequence it after this lands.

## Gates (non-negotiable, in order)
1. **DESIGN-GATE FIRST (Rule 7).** Before ANY converter code: write the design (how the one dispatch works, the cross-node walk, how the carve-outs map onto it), state the architectural primitive in plain English, and **get Bean's approval**. This is a shared-converter-core change — no code before the gate.
2. **`/qc-council` per fix-shape** (blub.db 255) — validate each sub-change against a measured baseline (predicted vs actual delta) before dispatching implementers.
3. **Build Gate A alongside** — the converter golden-fixture conformance test (`tests/test_converter_conformance.py` + `tests/fixtures/conformance/`): one fixture per section, + a regression-lock fixture each time a ledger issue moves to VERIFIED. This is the D178 cure; it locks every fix.
4. **VERIFY UNIVERSAL ON THE LIVE DOM (Rule 5, R-22-11/R-22-13).** Open the real homepage in Playwright; confirm the universal dispatch routes correctly for EVERY composite + the affected sections — not just that a score moved. Roll back only if genuinely non-universal.
5. **Phases never ship as single commits (R-22-5).** Split into commits (consolidate / cross-node / F6a / carve-out-removal), each with its own pre/post measurement in the message.

## STOP catalogue (this thread's hard-won lessons — do not repeat)
- **VERIFY against source; never assert from a doc/agent/your-own-prior.** This whole diagnosis cycle corrected wrong line numbers (hero grid was 293-294 not 278-279), a wrong converter claim (TB-A "render-side only" was wrong — the atomic handler bypasses the fold), and a rater's phantom-constant error. Open the file.
- **Distinguish render-artefact from converter-emission** — a visible defect ≠ a converter gap by default (memory `distinguish-render-artefact-from-converter-emission`).
- **Don't claim a guard is enforced unless it's wired to something that runs** (memory `dont-claim-a-guard-is-enforced-unless-wired`). Gate A/B aren't real until their scripts exist + are wired.
- **The deliverable is the universal converter, not the draft score** — verify universality, don't protect a number.
- **Don't `git commit` bare on shared `main`** — path-scope every commit (`git commit -- <paths>`); a hook enforces this. Co-active theme thread shares main. Never add `Co-Authored-By`. UK English.

## Tooling
| Skill / when | Purpose |
|---|---|
| `/autopilot` (first) | routing + ADHD support |
| `/brainstorming` or `/systematic-debugging` (design-gate) | shape the one-dispatch design before code |
| `/sgs-clone` + `/sgs-update` | run the pipeline + re-register the DB after changes |
| `/qc-council` (per fix-shape) | empirical validation pre-dispatch |
| `/verify-loop` | 2-attestation per load-bearing claim |
| `/handoff` (close) | session summary + update state/decisions/ledger |
| `wp-sgs-developer` agent | delegate heavy build slices |
| Playwright MCP | live-DOM universality verification on the real homepage |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "..."` | DB ground truth (role/canonical_slot/attr_type) |
| `python ~/.claude/hooks/wp-blocks.py dump` | block schema before any "missing attr" claim |

## Build / deploy / verify
- Build: `cd plugins/sgs-blocks && npm run build` (PowerShell, not Bash — broken node wrapper).
- Re-clone to measure: `/sgs-clone` to the Mama's canary; live-DOM verify per section.
- Canary creds: `.claude/secrets/sandybrown.env`. Cloning dev-site app passwords: `A:/.openclaw/.secrets/wp-app-passwords.env`.

## Done-when
F1-consolidate + F1-cross-node + F6a + carve-out-removal all landed, each commit measured; Gate A built + green; the affected ledger rows (the ~18 Stage-1 issues — H-B, FP-B/C/J/N/P, GF-B.1/B.2/C/G, SP-B/D.2, IN-B + F6a: H-C1, FP-A/K, IN-A/E/F, GF-A/E) moved to VERIFIED with live-DOM evidence; both per-composite branches (`has_scalar_media_attrs`-gated `_route_composite_interior` `:2940` + `_is_container_mirror_block` `:2950`) gone from the `walk()` emit chain — all composites route through the one universal dispatch; design-gate approved by Bean before build; `/handoff` written. Report the wire-vs-removed decisions + the per-commit pre/post measurements + any ledger rows you could NOT verify (with the blocker).
