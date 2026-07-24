---
doc_type: next-session-prompt
project: small-giants-wp
thread: "Track 1c — Build #3 (preset-absence auto-derive) SHIPPED + parked list cleared (2026-07-24). 5 blocks get correct cardStyle/effectHover on clone; a LIVE reconcile bug fixed; reduced-motion + product-card editor-preview parity shipped. Commits 5807205c..4fc45fe7, all pushed, suite green. Remaining: Task B (Spec 31 C2 LANDED = declare 100%)."
generated: 2026-07-24 (post Build #3 + parked-list clearance)
---

Invoke `/autopilot` before anything else.** Then read this end-to-end.

> ⚠ `main` is SHARED with a co-active **Track 2** (Spec 36/37 header/footer/nav). Track 2 owns
> `LEDGER.md`, `parking.md`, `decisions.md`, `STOP-CATALOGUE.md`, `.claude/next-session-prompt.md`,
> and the D-numbering cadence. **THIS is Track 1c's prompt** (`next-session-prompt-track1-converter.md`).
> Path-scope every commit; re-check `git branch --show-current` in the SAME command as the commit;
> NEVER `git add -A`. **VERIFY every commit landed via `git log -1`, NOT the hash the commit reported**
> — Track 2 commits between your commits. The path-scoped-commit hook FIRES on a bare `git commit`;
> always pass `-- <your paths>`. The SGS visual-diff pre-commit gate blocks a commit touching any
> block's source (incl. edit.js) unless `reports/visual-diff/<block>-<date>.md` exists with
> `verdict: PASS` + `first_paint_capture_passed: true` — for an editor-only change, write an honest
> report noting render.php is untouched (see this session's `product-card-2026-07-24.md`).

## Plain-English state (where we are)

The 2026-07-24 session shipped **Build #3 (preset-absence auto-derive)** + closed its whole parked
list. All Track 1c work is committed + pushed (`5807205c`→`4fc45fe7`; the suite stayed green).

**Shipped + pushed this session:**
- **`5807205c` — Build #3 (preset-absence transfer, Option B AUTO-DERIVE).** Cloned cards
  (info-box/team-member/card-grid/testimonial/google-reviews) no longer inherit a phantom
  `cardStyle=elevated`/`effectHover=lift` the draft never had. `/sgs-update` auto-derives each
  preset value's implied CSS (box-shadow/border/transform present/absent) by parsing the block's
  own style.css (class prefix read from render.php), keyed on a minimal `supports.sgs.presetSelectors`
  hint; seeds a new `preset_implications` table (23 rows, 5 blocks). New converter pass
  `resolvers/preset_absence.py` picks the correct preset value from the cloned element's collected
  CSS + reconciles with existing shadow/transform attr writes (defers, never double-writes). New
  scoped no-slug-literal gate + tests. qc-council-gated (2 reviewers): a fidelity-floor fix landed
  (a real shadow the token-snap can't match now → `elevated`, not the neutral).
  Memory: `[[manifest-is-authoritative-and-first-class-source]]`.
- **`4ff379f1` — reconcile scoping fix (a LIVE bug, not latent).** `attrs_for_css_property_state()`
  returned a per-child `imageZoomHover` alongside the card's `scaleHover`, so an image-zoom-only
  draft wrongly resolved `effectHover='zoom'`. Fix: ≤1 match unchanged, ≥2 narrow by the sibling
  `_BASE_ELEMENTS`∪OUTER+base-tier predicate, fallback to raw — can only get more correct.
- **`7b51af4b` — Task E** (gallery + team-member reduced-motion → `transform:none`); deployed +
  md5-verified live on sandybrown.
- **`71610c3a` + `4fc45fe7` — product-card typed-mode editor-preview parity.** The typed preview
  used non-existent `btn btn-*` classes + read NONE of the CTA/text styling attrs, so a client's
  padding/colour/border edits didn't show in the editor canvas (only the frontend did). Now mirrors
  `sgs_button_element_style_css()` + applies title/price/desc/price-note/tag colours. Editor-only.

**Deploy state:** the plugin was deployed to sandybrown (canary) this session, md5-confirmed. The
product-card CTA BoxControl was live-verified (renders + frontend honours it). Canary is current.

## First action (≤5 min, zero dependencies)
Confirm inherited state is green (from `plugins/sgs-blocks/scripts`):
`python -m pytest converter/ ledger/ oracle/ -q && python ledger/coverage_check.py --check && python db-consistency/run.py && python converter/gates/no_slug_literal.py && python converter/gates/check_preset_absence_no_slug_literal.py`
(expect ~1032 pass + `0 UNACCOUNTED` + F6 0 + both no-slug gates clear). Different → STOP + reconcile;
inherited state is a claim, not a fact (Track 2 may have committed since).

## Mandatory READING (gate — before any converter edit)
1. `/autopilot` (first).
2. `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — **IN FULL** (Bean-locked). §3.A step 4/4a +
   §13.4/§13.6 govern the converter surface.
3. `.claude/STOP-CATALOGUE.md` — the pre-flight ritual + STOP entries (Track 2's file; read, don't rewrite mid-race).
4. `.claude/plans/2026-07-22-spec31-completion-to-100.md` — Task B is the ONLY remaining leg (C2 LANDED).

## THE ONE REMAINING TASK — Task B: Spec 31 → 100% (the C2 LANDED leg)
**What:** deploy the phase-f fixture corpus as canary PAGES, wire `oracle/check_landed()` +
`oracle/fixture-canary-urls.json`, run the multi-shape LANDED batch, then live-verify + Bean's eye.
**Why:** A1–A6/B1/B3/C1a/C1b are DONE (UNACCOUNTED 14→0). C2 is the sole open item — a
live-verification, not more building. This is what lets you DECLARE Spec 31 = 100%.
**Estimated time:** ~30 min once the tree is clean + deploy works.
**Orchestration:** inline (Opus) for wiring + the verdict; delegate the token-heavy Playwright/deploy
legs to a `wp-sgs-developer` subagent (Bean: main thread reserved for orchestration, planning, QC,
simple fixes; subagents do the heavy reading/building/verifying).
**Deploy note:** the shared tree is usually dirty with Track 2's work — deploy from an ISOLATED
worktree at `origin/main` HEAD (build in the MAIN checkout, COPY `build/` in, `--skip-build`;
memory `[[never-junction-node-modules-into-a-worktree]]`). `md5sum` local↔server BEFORE measuring
(memory `[[verify-deploy-by-checksum-not-liveness]]`). Deploy ONLY via `build-deploy.py --target
sandybrown` — NEVER hand-roll tar/scp (D336), NEVER `--allow-dirty`/`--skip-verify`. (This session's
worktree deploy worked cleanly — same recipe.)
**Acceptance:** ledger reports zero UNACCOUNTED + zero WRITTEN-not-LANDED across the fixture set,
live-verified + Bean's eye → Spec 31 formally 100%. **/qc gate after any converter change:** yes.

## Skills / agents / tools
| When | Use |
|------|-----|
| Multi-rater before ANY converter/pipeline/SGS-block commit | `/qc-council` (blub.db 255) |
| Model routing per dispatch | `/delegate` (converter builds → Sonnet) |
| DB authoritative — never hardcode a count | `/sgs-db` + `python ~/.claude/hooks/wp-blocks.py dump` |
| Live-page verify (Bean's eye, R-31-13) | Playwright MCP + canary creds `.claude/secrets/sandybrown.env` |
| Root-cause gate | `/systematic-debugging` |
| Any converter/block build | `wp-sgs-developer` agent (constrain: EXECUTE yourself, no deploy/commit unless told) |

## Structural defences — STOP catalogue (carry forward, never subtract — D101)
Full text in `.claude/STOP-CATALOGUE.md` (Track 2's file). Load-bearing for THIS track, restated:
- **STOP-VERIFY-COMMIT-LANDED-ON-SHARED-CHECKOUT** — the hash a `git commit` REPORTS can be Track 2's
  racing commit. Verify via `git log -1` + `git status`, never the reported hash. (Hit twice this
  session — a commit "succeeded" per its output but HEAD was unchanged because a pre-commit gate
  blocked it; only `git log -1` caught it.)
- **STOP-PATH-SCOPE-EVERY-COMMIT** — the path-scoped-commit hook fires on a bare `git commit`; always
  pass `-- <your paths>`. NEVER `git add -A`. Track 2's files: `lucide-icons.php`, spec 36/37,
  LEDGER/parking/decisions/STOP-CATALOGUE, `next-session-prompt.md`, `reports/phase4-*.txt`, mega-menu.
- **STOP-VISUAL-GATE-EDITOR-ONLY** (NEW 2026-07-24) — the SGS visual-diff gate blocks a commit touching
  a block's source (incl. edit.js) without a `verdict: PASS` report for that block. For an editor-only
  change (render.php untouched), write an honest report noting the frontend is unchanged (this
  session's `product-card-2026-07-24.md` is the template) — do NOT `--no-verify` a genuine visual change.
- **STOP-VERIFY-SUBAGENT-FACTS** (NEW 2026-07-24) — re-derive a subagent's load-bearing claims from the
  tool. This session: a qc-council "blocker" was a stale DB-snapshot false alarm (disproved against
  live source); a fixer correctly found its OWN dispatch premise was wrong (a naive filter would have
  broken card-grid). Verify both directions — the claim AND the premise you gave it.
- **STOP-FIX-THE-SEED-SOURCE-NOT-A-PER-ATTR-OVERRIDE** — a mis-routed/dropped CSS value is usually the
  SOURCE dropping a class; make the manifest authoritative + a first-class source + add a structural
  guard. Overrides are code-vs-meaning ONLY.
- **STOP-DONT-FORCE-A-CARVE-OUT-TO-LOOK-PRODUCTIVE** — if the only path is a per-block hardcode (R-31-9)
  or a bigger new mechanism, STOP + report options for Bean's gate.
- **STOP-A-DISPATCHED-AGENT-MUST-EXECUTE-NOT-DELEGATE** — put "EXECUTE YOURSELF; do NOT delegate" in
  every implementer dispatch.
- **STOP-NEGATIVE-CONTROL-OR-THE-TEST-IS-VACUOUS** — before banking a PASS ask "would this still pass
  if the feature were absent?". The generic `build-deploy.py` HTTP-200 verify passes on ANY working
  page — md5 the changed file local↔server (memory `[[verify-deploy-by-checksum-not-liveness]]`).
- **STOP-AUDIT-BY-DECLARED-SEMANTIC-NOT-IDENTIFIER-NAME** — ≥2 signals before an "absent/wrong" verdict.

## Pre-flight ritual (answer before first Write/Edit)
1. On `main`? Next commit path-scoped away from Track 2's files (list above)?
2. Touching the converter? → Spec 31 read IN FULL, design-gated, `/qc-council` before commit.
3. About to accept a subagent claim OR a dispatch premise? → re-derive it from the tool.
4. After committing → does `git log -1` show MY message at HEAD + `git status` clean of MY work?
5. Banking a PASS? → would it still pass if the feature were absent? (deploy → md5, not HTTP-200.)
6. Committing a block-source change? → does the visual-diff gate need a report for that block?

## Open residuals — Track 1c (only genuinely-deferred, not-next-session work)
Everything this session raised is RESOLVED (Build #3, the reconcile bug, Task E, and every
product-card typed-preview defect — CTA padding, text colours, AND hover — all shipped). The ONE
genuinely-deferred item:
- **preset-implications convention dicts → DB** — a deliberate deferral: `_PRESET_STATE_BY_ATTR` /
  `_PRESET_NEUTRAL_FALLBACK_NAME` (sgs-update-v2.py) + `_PRESET_STATE` (preset_absence.py) are
  per-ATTR-NAME (universal, R-31-1-acceptable). Revisit ONLY when a 3rd preset-selector attr beyond
  cardStyle/effectHover is added — moving 2 working entries to a DB column now is premature. If it
  ever earns a `parking.md` entry it goes in as `DEFERRED`, not as done work.

(Pre-existing Track 2 parking — `P-INSPECTOR-CONTROL-TYPE-94-DISAGREEMENTS`, nav items — lives in
Track 2's `parking.md`; not Track 1c's to manage.)
