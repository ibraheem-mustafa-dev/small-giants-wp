---
doc_type: state
project: small-giants-wp
last_updated: 2026-09-04 (session 8)
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary

Plain English, for Bean. The framework is a WordPress block system that clones any design draft
into native blocks a non-technical client can then edit. Multiple sessions share one `main`
concurrently, every session — treat this as the norm, not the exception.

**Session 8 (this one):** picked up a stale, 11-day-old "road-to-uniform" dispatch prompt
claiming 222+ open findings. Two-thirds of that was already closed by other sessions before
this one started — verified against live commands, not trusted from the doc. Real remaining
work: fixed a genuine blind spot in the tier-migration detector (3 blocks were silently
unmigrated because their base attribute used a non-standard name), migrated all 3, deployed
and live-verified each on the real canary. Then scoped three more small items (C4/C5/C10) via
parallel isolated-worktree agents — all three came back "don't build this blind," each with
solid evidence, which is itself the correct outcome (no forced/hollow work shipped). Two items
remain genuinely open (C6, C7) — a fresh next-session prompt is ready. A parallel session ran a
large text-gradient colour rollout throughout this session too (not this session's work — see
its own decisions.md entries). Canary: sandybrown-nightingale-600381.hostingersite.com; no
live client sites yet. **Everything reported fixed this session was deployed to the canary and
live-verified — nothing closed on a build check alone.**

**Session 7 (prior):** closed the hover-guard's 24 findings to zero and built the WCAG contrast
guard — see COLOUR TRACK below for detail (kept, not rewritten).

## State Snapshot

- **Branch:** `main`. 2-4 other sessions were committing concurrently throughout session 8 (a
  colour-gradient rollout, D948 Phase 3 work) — this is the project's stated norm, not an
  exception. Path-scope every commit; re-check `git status`/branch immediately before each
  commit and deploy; never `git stash`/`git checkout --` a shared file (D948).
- **Canary:** WP 7.1. Deploy via `build-deploy.py --target sandybrown --blocks-only --payload
  <path>` — scope `--payload` to what you actually changed on a shared tree.
- **Build:** green — `npm run build` 88/88 fast-tier gates; `gate:full` also green as of this
  session's last deploy.
- **Live fronts:** `31-golden-colour-control` (**241** open, re-verified this session — was 253
  at D754; actively worked by a parallel session, not this one) remains the largest untouched
  backlog. Hover-guard's 11 pre-existing UNRESOLVED cross-file cases (optional, from session 7).
- **Session 8 commits (all on `main`):** `9f6f6ceb3`, `0e3ef60e0` (tier-migration + hero
  dead-code), `8d5b2807f`, `1f4cd80dc` (plan reconciliation), `b9609f019` (C5 doc fix +
  scoping report), `ed413997a` (C4/C5/C10 outcomes).
- **Per-track detail:** each `## ▶ … TRACK` section below owns its own status. Read only yours.
  Closed-track narrative lives in `memory/session-2026-09-04-tracks-history-sweep.md`, not here.

# ▶ NEXT SESSION STARTS HERE

**Invoke `/autopilot` first.**

Two genuinely open items remain from the road-to-uniform backlog — everything else in that
11-day-old plan is now closed, descoped-with-evidence, or correctly still blocked. Full
closed/blocked/open breakdown: `.claude/plans/2026-08-25-road-to-uniform-then-spec-39.md`'s
"Session 2026-09-04 summary" — read that, do not re-derive from the plan's older prose.

Fresh dispatch prompt ready: `.claude/prompts/2026-09-04-road-to-uniform-c6-c7-prompt.md`.

- **C6** — 10 blocks need `PanelBody` → `ToolsPanel` conversion (mechanical; build a shared
  helper once, then batch-adopt, per Bean's steer this session).
- **C7** — 4 blocks (`cta-section`, `decorative-image`, `nav-drawer`, `social-icons`) need a
  decorative-image/ARIA control each. Real per-block design work — WCAG 2.1 AA is a project
  non-negotiable, not optional polish. A shared control COMPONENT is still worth building once;
  the per-block "is this decorative" decision is not something a codemod can make.

Re-verify both counts before trusting them (`node plugins/sgs-blocks/scripts/inspector-scan/
run.js --json`, rules `03-dense-panel-candidate` / `18-decorative-image-aria`, FLAGGED only) —
they were 10 and 4 at session close, but the tree moves fast.

If C6/C7 are already done or a different priority is more urgent, `31-golden-colour-control`
(241 open) is the largest untouched backlog on the project generally.

⚠ **Concurrent occupancy on `main` is the norm, not the exception** — path-scope every commit,
re-check `git status`/branch and the decisions.md D-ceiling immediately before each write, and
message the other active session (check `ListAgents`) rather than guessing or forcing
`--allow-dirty`/`git stash` when a dirty-tree gate blocks you. See the new STOP entry
(`STOP-A-PEERS-CLAIM-ABOUT-WHO-CAUSED-A-CHANGE-IS-NOT-VERIFIED-BY-DEFAULT`) before trusting a
peer's account of who owns an uncommitted change — verify with `git diff` yourself.

## ▶ ROAD-TO-UNIFORM RECONCILIATION — CLOSED bar C6/C7 (session 8). Full detail: D957.

**Section A (tier-migration blind spot, D777's residual) — CLOSED.** `migrate-tier-object.py`'s
detector couldn't see an attribute whose base declares as `<prop>Desktop` instead of bare
`<prop>` — 3 families (`brand-strip.columns`, `hero.textAlign`, `whatsapp-cta.showOn`) were
silently unmigrated. Detector widened, all 3 migrated end-to-end and live-verified on the real
canary (a temporary probe page + Playwright computed-style read for brand-strip;
`wp_update_post()` + Playwright + byte-identical restore for hero — not build-checked only).
Also removed a genuinely dead code block in `hero/render.php`.

**Spec 32 B1-B3/B5, Spec 35 C2/C3/C8/C9/C11 — CLOSED, each confirmed via its own live gate
re-run**, not trusted from the stale plan. B4 (`mega-panel.borderRadius`) stays correctly
BLOCKED on Track 2 (Spec 36 mega-menu), which isn't currently active.

**C4/C5/C10 — all three DESCOPED with evidence, none built blind.** C4 (CO-2 gate) needs an AST
walk + a judgement call on ~35% ambiguous attributes — its own planned build. C5
(bespoke-vs-native-supports panel) isn't buildable as a general rule without reproducing a
documented ~600-false-positive failure from this exact codebase; found and fixed a real doc
contradiction (CO-15 vs Part L) along the way. C10 (brand-strip picker swap) is an
architectural mismatch, not a like-for-like swap.

**What's left:** C6, C7 (see NEXT SESSION START above).

## ▶ UNIFORMITY SWEEP TRACK — CLOSED bar one detector. Detail: D918/D919/D922/D924/D930/D933.

`01-tab-group` and `21-render-without-control` both closed to zero, session 4 (D933). Nothing
else open in this track — see COLOUR TRACK for `31-golden-colour-control`.

## ▶ COLOUR TRACK — session 7 closed hover-guard (24→0) + built the contrast guard. Detail: D948.

Session 8 did NOT touch this track — a parallel session ran the D636/D948-Phase-3 text-gradient
rollout across ~15 blocks throughout session 8 (commits `43c2c3d4b`, `16a7a7e0d`, `10e08548a`,
and others); read that session's own decisions.md entries for its detail, not duplicated here.

**Still open, carried forward from session 7:** hover-guard's 11 UNRESOLVED cross-file cases
(optional); `SgsBorderControl`'s 44-caller contrast wiring (plumbing built, no callers wired,
not parked); `nav-menu.burgerColour` (needs `sgs_svg_stroke_gradient()` + a new attr).

## ▶ MOTION TRACK (A closed+live; B closed) — nothing new session 8.

⛔ **TWO SEPARATE TRACKS. Never re-merge them.** Full account: `memory/session-2026-09-04-
tracks-history-sweep.md`. Session 7 closed both (Wave-D register, D949-D955; Generative
Background Engine, D939-D948). Nothing changed this session.

## ▶ CONSOLIDATION TRACK — CLOSED 2026-08-22 (D725/D726, D731-D733)

One item survives, PARKED, owned by nobody: sticky sidebar + band-replacement model
(`parking.md` P-CLIENT-CONTROLS-STICKY-SIDEBAR-AND-BAND-MODEL) — RE-MEASURE first, the accordion
may already have solved it.

## ▶ CLIENT-CONTROLS TRACK — CLOSED 2026-09-02, deployed + live-verified (D904-D913, D915/D916, PR #36)

All 16 media atoms adopted by all six in-scope blocks. Narrative:
`memory/session-2026-09-02-client-controls-track.md`. `trust-bar`/`brand-strip` nested media —
DONE, see SPEC-35 CAPABILITY-ROUTING TRACK below.

## ▶ EDITOR-ERRORS TRACK — CLOSED 2026-08-22 (D743)

Narrative: `memory/session-2026-08-22-editor-errors-track.md`. Nothing pending.

## ▶ SPEC-35 CAPABILITY-ROUTING TRACK — CLOSED 2026-09-04 (prior session), all four items, deployed + live-verified

Plan archived: `.claude/plans/archive/spec-35-capability-routing-doctrine.md` (its own status
line carries the full closure record). All four items closed: Part 6 gate (already a real
hard gate, doc was stale), `testimonial`/`image-sequence` crop decision (already resolved),
Part 7 native-supports census (ran, 0 findings), Part 4 multi-image item-schema extension
(the only real build — `gallery`/`card-grid`/`trust-bar`/`brand-strip` each gained a stable
per-item `_key` + per-item crop control, deployed and live-verified). Commits: `a314fdc47`/
`335a0885a`/`ef051e39c`/`0fbfb51d2`/`94485dad5`. Reports: `reports/visual-diff/{card-grid,
gallery,trust-bar,brand-strip}-2026-09-04.md`.
