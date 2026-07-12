---
doc_type: handoff
project: small-giants-wp
generated: 2026-07-12
session: D315/D316 — parity-tool BUILT to Spec 20 v1.1.0 (visible-fidelity, ledger-validated) + universal pill tick-gap fix + Task-2 dead-control finding
---

# Session Handoff — 2026-07-12 (D315/D316)

## Completed This Session
1. **Task 1 — rebuilt `computed-parity.js` (Stage 11.6) to Spec 20 v1.1.0.** The tool now tracks VISIBLE fidelity: font-family primary-only, blocklist `interactivity`/`appearance`(non-control), sub-visible representational twins → unscored `sub_visible[]` bucket, tag scored separately (FR-20-9), class names context-only (FR-20-10), force-load lazy content (FR-20-11). Baseline 77% → **88% raw** on page 8.
2. **qc-council + code-review hardened it (trust instrument).** Council's load-bearing correction: sub-visible buckets must be gated by a per-pair INVISIBILITY PREDICATE, never a blanket label-exclude. `feature-dev:code-reviewer` caught **3 real bugs, all in the unsafe hide-a-gap direction** (inline `clientHeight===0`; native `<button>` UA-bg appearance; margin-absorbed direction) — all fixed + guarded.
3. **Validated vs the independent D314 ledger (never self-report).** 82% of the tool's 350 scored "misses" are exactly the ledger's dispositioned items (A pills + B shadow + D banner accepted; testimonials out-of-contract); applying the same dispositions → ~98% (ledger ~94–95%); tag divergences reproduced exactly; content 100%. The raw 88% is honest + lower only because it's page-agnostic (FR-20-2). **Bean signed off.**
4. **Fixtures + smoke test — 11/11 pass** (`scripts/parity/fixtures/` + `smoke-test.js`): FR-20-1 base-font, FR-20-9 tag, FR-20-10 class-agnostic 100%+static grep, FR-20-11 lazy, + 3 FR-20-3a guard cases for the code-review bugs. Draft-agnostic proven (4 non-page-8 pairs, zero edits).
5. **Pill tick-gap fix (D316) — universal + live-verified.** Bean-reported: the selected pill's ✓ tick had no gap and overlapped the value at some widths. Root cause: an absolutely-positioned `::before` overlay. Fix: in-flow tick + `margin-right:0.3em`, shown only on the selected pill (unselected stays draft-tight). Product-card pack pills render via `render_block('sgs/option-picker')` → one `style.css` change covers both blocks. Verified live at 1440 + 375 (`✓ 8-pack`, no overlap); screenshots + visual-diff report.
6. **Task 2 (D314 deferred C-type sweep) — all 7 attrs proven DEAD render paths.** mobile-nav focus/active/sublink + trust-bar shapeDivider* have null role, and nothing consumes them (vars emitted-but-unread / declared-only). Seeding role would route a draft value into a render no-op (STOP-44). **Seeded none;** parked as block-quality debt (`P-DEAD-NULL-ROLE-CONTROLS`).

## Current State
- **Branch:** `main` at `ed772825` (all 4 commits pushed: 331f9523 parity, b2c2db29 pill, ed772825 Task-2 parking).
- **Tests:** parity smoke test 11/11. Converter suite NOT re-run (unaffected — no converter/walker code touched this session; changes = parity JS + option-picker CSS + docs).
- **Build:** `npm run build` green (prebuild gates passed); deployed to sandybrown; caches cleared (OPcache web-pool + LiteSpeed + CDN).
- **Live:** sandybrown page 8 — pill fix landed (`?ver=0.1.10`); parity tool reports 88% raw / TAG 79% / content 100%.
- **DB:** unchanged this session (Task 2 seeded nothing).

## Known Issues / Blockers
- None blocking. The parity tool's raw % is intentionally page-agnostic — it pairs with Bean's eye, never closes alone (FR-20-7 / R-31-13).

## Next Priorities (in order)
1. **Use the now-trustworthy parity tool + move to the next fidelity front** — either sweep more pages/clients for real gaps, or start the header/footer setup pipeline (`P-DRAFT-TOKEN-EXTRACTION-SETUP-PIPELINE`, the stated "next phase once block pipeline proven").
2. **(smaller) Block-quality passes** — `P-DEAD-NULL-ROLE-CONTROLS` (wire-or-remove the 7 dead controls) + `P-PATTERNS-USE-CORE-BLOCKS`.
3. **(optional) Remaining `P-PAGE8-DISCREPANCY-REGISTER` items** if any survive a re-clone + the trustworthy tool.

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

## Notes for Next Session
- **The parity tool is now the trustworthy instrument — USE it, don't hand-roll.** Its raw % is honest-but-page-agnostic; to judge in-contract fidelity, read its full mismatch list + apply dispositions (or `--exclude` known out-of-contract text), then Bean's eye closes it (FR-20-7).
- **New lesson:** sub-visible parity buckets need an invisibility PREDICATE, not a label exclude (`feedback_sub_visible_parity_buckets_need_invisibility_predicate`).
- **The dead-control gate has a blind spot** — it treats `$attributes['x']` read-into-a-CSS-var as "consumed" even when the var is never used in CSS. That's how the 7 P-DEAD-NULL-ROLE-CONTROLS attrs pass it. Consider extending it to follow attr→var→CSS.

## Next Session Prompt
See `.claude/next-session-prompt.md` (orchestration plan + carried-forward STOP catalogue + reading gate).
