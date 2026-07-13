---
doc_type: handoff
project: small-giants-wp
generated: 2026-07-13
session: D315/D316/D317 — parity tool rebuilt (Spec 20 v1.1.0) + universal pill tick-gap fix + Task-2 dead-control finding + Spec 33 (draft global-styles extractor) designed→council→v0.2 (build-ready)
---

# Session Handoff — 2026-07-13 (D315/D316/D317)

## Completed This Session
1. **Task 1 — rebuilt `computed-parity.js` (Stage 11.6) to Spec 20 v1.1.0.** The tool now tracks VISIBLE fidelity: font-family primary-only, blocklist `interactivity`/`appearance`(non-control), sub-visible representational twins → unscored `sub_visible[]` bucket, tag scored separately (FR-20-9), class names context-only (FR-20-10), force-load lazy content (FR-20-11). Baseline 77% → **88% raw** on page 8.
2. **qc-council + code-review hardened it (trust instrument).** Council's load-bearing correction: sub-visible buckets must be gated by a per-pair INVISIBILITY PREDICATE, never a blanket label-exclude. `feature-dev:code-reviewer` caught **3 real bugs, all in the unsafe hide-a-gap direction** (inline `clientHeight===0`; native `<button>` UA-bg appearance; margin-absorbed direction) — all fixed + guarded.
3. **Validated vs the independent D314 ledger (never self-report).** 82% of the tool's 350 scored "misses" are exactly the ledger's dispositioned items (A pills + B shadow + D banner accepted; testimonials out-of-contract); applying the same dispositions → ~98% (ledger ~94–95%); tag divergences reproduced exactly; content 100%. The raw 88% is honest + lower only because it's page-agnostic (FR-20-2). **Bean signed off.**
4. **Fixtures + smoke test — 11/11 pass** (`scripts/parity/fixtures/` + `smoke-test.js`): FR-20-1 base-font, FR-20-9 tag, FR-20-10 class-agnostic 100%+static grep, FR-20-11 lazy, + 3 FR-20-3a guard cases for the code-review bugs. Draft-agnostic proven (4 non-page-8 pairs, zero edits).
5. **Pill tick-gap fix (D316) — universal + live-verified.** Bean-reported: the selected pill's ✓ tick had no gap and overlapped the value at some widths. Root cause: an absolutely-positioned `::before` overlay. Fix: in-flow tick + `margin-right:0.3em`, shown only on the selected pill (unselected stays draft-tight). Product-card pack pills render via `render_block('sgs/option-picker')` → one `style.css` change covers both blocks. Verified live at 1440 + 375 (`✓ 8-pack`, no overlap); screenshots + visual-diff report.
6. **Task 2 (D314 deferred C-type sweep) — all 7 attrs proven DEAD render paths.** mobile-nav focus/active/sublink + trust-bar shapeDivider* have null role, and nothing consumes them (vars emitted-but-unread / declared-only). Seeding role would route a draft value into a render no-op (STOP-44). **Seeded none;** parked as block-quality debt (`P-DEAD-NULL-ROLE-CONTROLS`).
7. **D317 — chose the next front + designed Part 1 to a build-ready spec.** Bean picked the header/footer setup pipeline (2 parts: Part 1 = draft→theme global-styles extractor; Part 2 = header/footer clone). Grounded in WP docs + a focused research pass + a full survey of ALL `sites/` drafts (3 real design systems + a token-less scrape). Wrote **Spec 33 v0.1**, ran a **6-persona `/adversarial-council`** (GO-conditional — caught that FR-33-1 "declared wins" would re-ship D303, the undefined role algorithm, Pass-B palette inversion, and the 6-live-snapshot blast radius), then reshaped to **v0.2** (`e77eec79`): COMPLETE spine (all declared value types, Bean's call) tiered by PROVENANCE (declared auto after computed-validation; derived advisory-gated) + every convergent fix + all 4 open questions resolved. NO code built — design only.

## Current State
- **Branch:** `main` at `e77eec79` (pushed: 331f9523 parity, b2c2db29 pill, ed772825 Task-2 parking, 5f2ec850 handoff, 2f4cd443 Spec 33 v0.1, e77eec79 Spec 33 v0.2). D-ceiling **D317**.
- **Tests:** parity smoke test 11/11. Converter suite NOT re-run (unaffected — no converter/walker code touched this session; changes = parity JS + option-picker CSS + docs).
- **Build:** `npm run build` green (prebuild gates passed); deployed to sandybrown; caches cleared (OPcache web-pool + LiteSpeed + CDN).
- **Live:** sandybrown page 8 — pill fix landed (`?ver=0.1.10`); parity tool reports 88% raw / TAG 79% / content 100%.
- **DB:** unchanged this session (Task 2 seeded nothing).

## Known Issues / Blockers
- None blocking. The parity tool's raw % is intentionally page-agnostic — it pairs with Bean's eye, never closes alone (FR-20-7 / R-31-13).

## Next Priorities (in order)
1. **BUILD Spec 33 v0.2 — the draft global-styles extractor (Part 1).** The spec is build-ready (council-gated). Build the complete-spine, provenance-tiered extractor; PROVE on Mama's only (D303 gone: brand quote 16px, heading lh 1.2). Full orchestration in next-session-prompt.md.
2. **(then) Part 2 — header/footer clone** (Spec 17), once Part 1 is proven. Part 1 reserved the `settings.custom.header/footer` namespace for it (FR-33-13).
3. **(smaller, parallel) Block-quality** — `P-DEAD-NULL-ROLE-CONTROLS` (wire-or-remove 7 dead controls) + `P-PATTERNS-USE-CORE-BLOCKS`.

## Files Modified
| File | What changed |
|---|---|
| plugins/sgs-blocks/scripts/parity/computed-parity.js | Rebuilt to Spec 20 v1.1.0 (visible-fidelity, tag/class/lazy dims, predicate-gated sub_visible) |
| plugins/sgs-blocks/scripts/parity/fixtures/ (11 new files) | 5 fixture pairs + smoke-test.js (regression guards) |
| plugins/sgs-blocks/src/blocks/option-picker/{style,editor}.css + block.json | In-flow tick + gap (D316); version 0.1.9→0.1.10 (cache-bust) |
| .claude/specs/20-CLONE-FIDELITY-MEASUREMENT.md | last_verified / status_history — tool BUILT + validated |
| .claude/decisions.md | D315 (parity build) + D316 (pill fix + Task-2 finding) |
| .claude/parking.md | P-DEAD-NULL-ROLE-CONTROLS |
| reports/visual-diff/option-picker-2026-07-12.md (+2 PNGs, gitignored) | STOP-67 visual-diff report for the pill fix |
| .claude/specs/33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md | NEW — Spec 33 v0.1→v0.2 (draft global-styles extractor, Part 1; council-gated, build-ready) |
| .claude/decisions.md | + D317 (Spec 33 design + council + v0.2) |

## Notes for Next Session
- **The parity tool is now the trustworthy instrument — USE it, don't hand-roll.** Its raw % is honest-but-page-agnostic; to judge in-contract fidelity, read its full mismatch list + apply dispositions (or `--exclude` known out-of-contract text), then Bean's eye closes it (FR-20-7).
- **New lesson:** sub-visible parity buckets need an invisibility PREDICATE, not a label exclude (`feedback_sub_visible_parity_buckets_need_invisibility_predicate`).
- **The dead-control gate has a blind spot** — it treats `$attributes['x']` read-into-a-CSS-var as "consumed" even when the var is never used in CSS. That's how the 7 P-DEAD-NULL-ROLE-CONTROLS attrs pass it. Consider extending it to follow attr→var→CSS.

## Next Session Prompt
See `.claude/next-session-prompt.md` (orchestration plan + carried-forward STOP catalogue + reading gate).
