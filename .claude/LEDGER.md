---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-10
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**Where 2026-08-10 (session 2) left things** *(prior narrative: `memory/session-2026-08-09*.md`)*:

- **The shared container is now responsive by design, not block by block.** You asked for the
  wrapper to be fixed once so no block needs "individual fixes that require forking". Six layout
  settings (including row-vs-column, the commonest mobile need) now work per device for every block
  that uses the wrapper. It took **six lines, not a rewrite** — the generic machinery already
  existed; nobody had fed it these properties.
- **The thing that made this possible was this morning's toggle.** Adding per-device options used
  to mean more controls on screen. With one global Desktop/Tablet/Mobile switch, it adds **zero** —
  so "make everything responsive" and "reduce clutter" turned out to be the same job, not opposites.
- **Two controls that were quietly lying to clients are gone.** A gallery panel with 16 spacing
  controls threw away everything typed into it (WordPress discards settings a block doesn't
  declare — no error, nothing). And a min-height panel no block could actually reach.
- **Two bits of styling had been dead on real pages.** Desktop image height and object-fit never
  worked — the CSS was waiting for something the code stopped producing months ago. Found and fixed.
  The identical fault in hover effects was found too.
- **A review panel checked the whole session and found three things**, all fixed: a hidden trap
  waiting to bite the next piece of work, a missing record of your approval, and three wrong numbers
  (now re-measured properly).

## CURRENT FRONTS

> **D-ceiling: RUN THE COMMAND (State Snapshot) — never cache it.** Latest: **D550**.

### ⭐ Track 1b (Spec 35) — inspector control standardisation

**Phase 1 is CLOSED.** 1.1/1.2/1.3 shipped in session 1; 1.4a/1.4b/1.4c/1.4d in session 2.

#### Shipped 2026-08-10 session 2

| What | Commit |
|---|---|
| `inspector-scan` **rule 26** — the detector, built BEFORE any edit | `629971c7` |
| 1.4d — folded the two "… by viewport" duplicates; live-verified BOTH editors | `a05194e3`, `ed41a748` |
| 1.4b — deleted the unreachable min-height panel | `2e48c3ff` |
| Un-gated image-control CSS that could never match | `8b07cdb9` |
| `sgs/gallery` → FR-37-16 object model; `ResponsiveSpacingPanel` retired | `0e6209e6` |
| 1.4c — hero's 3 mobile-only orphans → responsive triples | `0d7b32ec` |
| **Six wrapper layout properties tier-capable, generically** | `2056af6a` |
| `survey:responsive-shape` census + `gridAutoRows` guard + D548/D549 | `05f3ecad` |
| D550 — council falsifications, three numbers corrected | `f305cba8` |

#### ⛔ Do NOT start these

- **Re-deriving the canonical control set** — `plans/spec-35-control-type-contract.md` is
  AUTHORITATIVE. Read it before designing anything.
- **Stripping native `color`/`__experimentalBorder` supports** (D542). ⚠ `spacing` was knowingly
  removed from `sgs/gallery` ONLY (D548) — that is a per-block, documented reversal with a stated
  cost, NOT a general licence.
- **Re-adding any per-control device switcher** — rule 25 flags it.
- **Restoring `localStorage` on the toggle** — its absence is deliberate (D546).
- **Rebuilding the rejected inspector census** (D543).

### ⭐ NEXT SESSION — resume `C:\Users\Bean\.claude\plans\go-track-1b-playful-hamster.md`

Bean-directed: continue the ORIGINAL planned work. Phase 1 is done; the plan's later phases are not.

**The delegation brief is measured and ready.** `npm run survey:responsive-shape` — 83 blocks, 311
tier families: **185 flat**, 32 declaring BOTH shapes, 94 orphans. Of those, **173 are real
migration candidates** (`cascading_value`). The survey separates them from families that are
CORRECT as-is and must NOT be migrated blindly: **36 `asset_like`** (a per-tier ASSET is a different
resource per device — `sgs/media`'s tiers are a deliberate runtime swap, D521) and **7 `flag_like`**
(conjunctive per-device flags the operator must see all of at once). The 94 orphans are explained:
79 `padding*`/`margin*` per-side + 11 `borderRadius`, whose base lives in native supports.

This is repetitive deterministic work → route via `/delegate` per Bean.

**Also queued:** Phase 3.2a's `--fix` on the length survey (survey finished, no open design
decision) · Phase 2.1 opt-in inversion (biggest payoff — 59% of live inspector controls come from
universal extensions — gated on deriving the opt-in list from actual `post_content`, not
`hideExtensions`, per D545).

### Methodology guardrails (earned; do not skip)

- ⭐ **A text count of an identifier discussed in comments is wrong BY CONSTRUCTION.**
  `<ContainerWrapperControls` appears in prose in six files that record having STOPPED using it.
  This contaminated the count **three times in one session** (24 mounts → 16; then a 10/6 split that
  is really 11/5). Naming the trap twice did not stop it. **Use an AST/JSX-element count.**
- ⭐ **Historical baselines: rebuild the tree, don't trust a remembered number.**
  `git archive <sha> -- plugins/sgs-blocks theme | tar -x -C $SNAP`, symlink `node_modules`, run the
  real scanner. ⚠ **Include `theme/`** — omit it and rules 17/20 silently mis-measure. This settled a
  three-way dispute (243/254/245) on the third independent run.
- ⭐ **`inspector-scan --json` has NO top-level `findings` key** — it is `rules[].findings`, filtered
  to `status:"FLAGGED"`. The wrong key returns `[]` and looks exactly like a clean pass.
- **A green build proves almost nothing about editor JS.** `lint:js` is NOT in `prebuild`.
- **`lint:js` raw is useless** — 12,969 pre-existing problems, 12,111 prettier CRLF noise, 66
  pre-existing `no-undef`. Lint the CHANGED FILES and diff the rule-count PROFILE.
- **Match a file's own formatting** — writing tabs into a 2-space `package.json` churned 66 lines
  for a 3-line change.
- **A gate firing is evidence about your data.** Deleting dead code moved rule 21 129→135; the +6
  were REAL findings the dead code had been MASKING (a metric counting name-presence rather than
  reachability rewards keeping dead code).
- **Fact-check every rater finding.** This session: one was overstated 6× (1 of 6 properties truly
  exposed), one framing challenge was refuted in code, and one rater was right where I was wrong.
- **Full STOP catalogue + pre-flight ritual: `.claude/STOP-CATALOGUE.md`** (uncapped, D101).

### Other tracks — stable

- **Track 1** — routing audit + tier axis COMPLETE (D480); Phase 4 PARTIAL, 5 OPEN.
- **Track 1c** (Spec 31 converter) — build shipped; open item is PROOF not build.
- **Tracks 2+2b** (nav/header/footer) — Wave 1 CLOSED, Wave 2 in progress.
- **Track 3** — CLOSED (D479). ⛔ GSAP is NOT MIT · LYGIA is Prosperity-licensed.

---

## State Snapshot

- **Branch:** `main`. ⛔ **Do not trust this line for tree state — run `git status`.** Commit by
  EXACT PATH (a pre-commit gate requires a pathspec; the visual-diff gate requires a `source_sha`
  in the report, and REJECTS a report still carrying a previous change's sha — that is the
  stale-report defence working, not a bug).
- **Untracked, deliberate:** `.claude/Border Example HTML.html` (Bean's reference markup).
  `plugins/sgs-blocks/err_tmp.txt` is a 0-byte pre-existing stray, safe to delete.
- **Baselines, re-derived 2026-08-10 and safe to cite:** `inspector-scan` rule 21 = **129** at
  `cb209dc1`, **133** now (+6 unmasked by the dead-panel deletion, −2 unattributed — no
  pre-dispatch snapshot was taken; **snapshot `rules[].findings` before any concurrent dispatch**).
  Tree-wide at `cb209dc1` = **245 FLAGGED / 259 raw** (the earlier 243/257 and 254 are BOTH wrong).
  Rule 26 = **3**. Denominator **83**.
- **Build:** `npm run build` exit 0, all gates green. `survey:selftest` 47 assertions across six
  detectors. `inspector-scan --self-test` green incl. the harness meta-check.
- **Canary:** sandybrown-nightingale-600381.hostingersite.com — **the only site**.
  Credentials `.claude/secrets/sandybrown.env` (gitignored, always available).
- **Verify every session:** `git log -1 --stat` · `git status` · `git branch --show-current` ·
  D-ceiling `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`

---

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| **The canonical control set (GOVERNING)** | `plans/spec-35-control-type-contract.md` |
| The standardisation programme (RESUME HERE) | `C:\Users\Bean\.claude\plans\go-track-1b-playful-hamster.md` |
| This session's plan + wrapper design | `C:\Users\Bean\.claude\plans\invoke-autopilot-before-doing-memoized-locket.md` |
| Decisions (D-numbered) | `decisions.md` — D546-D550 are today |
| Spec roster + DEAD-never-cite list | `specs/README.md` |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |

## Blockers

**NONE.**

## Open — carried, not ours to close

- **`sgs/gallery` page 1591 migration is WRITTEN + dry-run clean but NOT YET RUN `--live`.**
  `scripts/migrate-gallery-object-model.js`. Until it runs, that page keeps rendering its old
  padding via the wrapper's un-gated `style.spacing` read (a graceful window, verified) but its
  `contentWidth:"1200px"` will coerce to `{}` once the new schema is live. **Run it, then confirm
  the 1200px band and 48/24/24/48 padding on the live page.**
- **Wrapper STAGE 2** — the six `gridItem*` properties plus `shadow`/`contentBandBackground` emit as
  CSS custom properties on a different selector and need their own tier plumbing.
- **Hover effects have the SAME dead-CSS bug** as image controls (`extensions.css:128-144` gates on
  `[style*="--sgs-hover-bg"]` while the PHP emits a scoped `<style>`).
- **The lost at-a-glance affordance** — deleted per-control strips showed which OTHER tiers had a
  value. Needs its own design; ⛔ must NOT be solved by re-adding a per-control switcher.
- **Track 2's canary (post 2164)** lost a text node 2026-08-07 (`templateLock:'all'`).
- **`templateMode` inert** on both row blocks and physics-canvas.
- **`sgs/hero` split-image bleed** — latent only, 0 live instances. Parked.
- **physics-canvas `ALLOWED_BLOCKS`** — Bean approved opening it via a physics-participation
  toggle; needs its own design gate. Not started.
- **blub :5050 is DOWN** (HTTP 000, diagnosed). Re-POST pending lessons to `/api/learning`.
- **`MEMORY.md` at ~24,420 of 24,576 bytes** — a real compaction (archiving, not trimming) is owed
  and blocks new entries.
