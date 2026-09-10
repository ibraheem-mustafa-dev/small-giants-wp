---
doc_type: ledger
project: small-giants-wp
last_updated: 2026-09-10
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**The clone-fidelity closeout track is done. 14 real defects fixed and verified live (11 from
the original brief + 3 found along the way), one self-caught wrong fix corrected, and an
honest independent 3-viewport check confirms the page body (hero through gift section) is a
genuinely faithful, production-ready clone. The header and footer are NOT part of that — they
were found running generic template content instead of your actual branded content, and that's
now scoped as its own next track, per your instruction.**

**What's shipped:** testimonial star colour, a font-loading bug that silently broke any new
client font (now fixed universally, with a security hole closed in the same fix), 4 footer
bugs, a heading-font leak, hero text centring, trust-bar background + pack-size pill
typography, a product-card border regression, brand image sizing, the quote block's italic
default (flipped per your call), and the hero's hover-zoom effect (rebuilt as reusable shared
capability, per your requirement). One of those fixes (product-card title font) was later found
wrong and corrected the same session — caught by re-running the measurement tool after the
batch, not assumed correct.

**What's still open, and deliberately not touched here:** the header and footer are running
generic framework content, not your draft's actual columns/links/logo/CTA styling. This is
tracked, has a known mechanism already built (Spec 37), and just needs the real content
authored — full handoff written to
`.claude/prompts/2026-09-10-header-footer-implementation.md`.

**The measurement tool itself was also corrected** to stop scoring header/footer chrome (a
different system) and CSS properties with no possible visual effect — see below for the
before/after numbers once that build lands.

## Shipped this session (2026-09-10)

1. **14 real clone-fidelity defects, root-caused with live evidence before any fix, each
   validated via `/qc-council` (baseline → fix → re-check) before commit.** Full technical
   detail: `decisions.md` D1015. Commit range `1067b2e3c..4b57be064`.
2. **A self-caught wrong fix, corrected same session** — the product-card title font-family fix
   initially targeted the wrong value (body font instead of heading font); found by re-running
   the parity tool after the batch, not assumed correct. `decisions.md` D1015.
3. **Independent 3-viewport visual verification** (not just the parity tool) — 3
   design-reviewer agents, one per breakpoint, screenshots + real interaction checks. Confirmed
   page-body fidelity is genuinely excellent; confirmed the header/footer gap; caught and
   corrected one sub-agent's unverified, wrong claim by direct HTML fetch.
4. **Header/footer scoped out as its own track**, per Bean's direction — root cause already
   tracked (`parking.md`), Spec 37 status freshly checked (mechanism built, branded content
   never authored), handoff written to `.claude/prompts/2026-09-10-header-footer-implementation.md`.
5. **3 plan docs reviewed against real codebase state** (not their own claimed status):
   - `2026-09-08-parity-tool-bem-layer-aware-matching-design.md` — mechanism shipped AND
     verified against live evidence (D1017); the "keyed distinctly" record-keeping detail in the
     doc didn't match what was actually built (a single merged record, not two surviving
     entries) — corrected in the doc, now archived at `plans/archive/2026-09-08-parity-tool-bem-layer-aware-matching-design.md`.
   - `cloning-pipeline-tier-migration-requirements.md` — block.json-level tier migration is
     essentially DONE (0 candidates left, was 105); converter-resolver-level typography emission
     is genuinely still flat (4 live xfails). The doc doesn't cite D1004 (header/footer outranks
     motion), so its own priority framing is stale.
   - `phase-measurement-integrity.md` — all 13 steps shipped; Step 6's judgement call recorded
     and the doc archived to `plans/archive/` (D1016).
6. **Parity tool scope correction** (build dispatched, verify result before quoting new numbers)
   — exclude header/footer/nav chrome from scoring (separate system, was conflating two
   different pieces of work), gate CSS properties on whether they can actually apply
   (`background-*` on an `<img>`, `flex-basis` outside a flex parent). Per Bean's direction, NO
   general "accepted difference" mechanism was built into the tool — per-draft design exceptions
   (e.g. the approved Trustpilot-carousel difference) are recorded in
   `sites/mamas-munches/accepted-differences.md` and reported as raw + adjusted scores by hand.

See D1015 in `decisions.md` for full technical detail on every fix.

## Blockers

**None.** The parity-tool scope-correction build was in progress when this LEDGER was written —
check its actual commit + before/after numbers before quoting a percentage; don't trust this
line's absence of a number as "not done," check `git log -- plugins/sgs-blocks/scripts/parity/computed-parity.js`.

## THE FRONT — what to pick up next

**Header/footer implementation is the front.** Read
`.claude/prompts/2026-09-10-header-footer-implementation.md` in full — it has the evidence, the
root cause, Spec 37's real status, and the one open question to ask Bean before starting
(hand-author this one client's content now, vs. build the Spec 33 Part 2 clone pipeline first).

**Once that's underway or parked, remaining cloning-pipeline loose ends** (lower priority, not
blocking):
- Confirm the parity-tool scope-correction build's final numbers and update this section with
  them.
- `cloning-pipeline-tier-migration-requirements.md` needs a correction pass: mark R1's block.json
  work-list closed (with today's live survey numbers), cite D1004, and re-flag that
  converter-resolver-level typography emission is still open (4 live xfails, not closed as the
  doc's own banner claims).
- A test clone of a second draft page (Bean's own next step, to test the pipeline's claimed
  universality) — do this AFTER the parity-tool fix lands, so the result is measured against the
  corrected tool, not the old one.
- Minor open items from today, not urgent: pill padding (7px 13px in draft vs 8px 16px live,
  confirmed still open), trust-bar badge border (a real spec gap — no control exists to switch
  it off — needs a small new feature, not a data fix), a new heading-structure oddity found on
  the verification page only (two `<h1>` elements — likely a test-page artefact, check on
  production page 2742 before treating as real).

## Methodology guardrails (carried forward — all still true)

- ⛔ **`git grep` only, never `grep -r`** — stale worktrees inflate counts massively.
- ⛔ **Never pipe a population-defining survey through `head -N`.** Count first (`| wc -l`).
- ⛔ **`$?` after a pipe reads the LAST command's status.** Redirect first.
- ⛔ **`git grep -c` with an explicit path prints `path:count`, not a bare integer.**
- ⛔ **Python `shell=True` on Windows is cmd.exe, not bash.**
- ⛔ **A regex `\b` after a slug matches inside a hyphenated sibling.**
- ⛔ **A name-mention is not a usage.** Real call-detection, not string match.
- ⛔ **A subagent must never mutate a repo file as a test fixture.**
- ⛔ **Metadata is not evidence.** Filename, line count, grep-hit count — open the file.
- ⛔ **A subagent cleaning up its own scratch server can nuke the wrong process.** One agent this
  session ran `taskkill /F /IM python.exe` (by NAME, not PID) while tearing down a local test
  server — kills every Python process on the shared machine, not just its own. Always kill by
  specific PID.
- ⛔ **A single sub-agent's unverified summary line can be wrong even when its other findings are
  solid.** One design-reviewer agent got the footer content claim backwards while correctly
  verifying 6 other sections with real measurements — caught only because two OTHER independent
  agents disagreed and a direct HTML fetch settled it. Contradiction between independent checks
  means verify directly, never silently pick a side.
- **A completeness error is invisible to every correctness gate.**
- **A pre-commit gate can fail SILENTLY** after ~250 lines — never `--no-verify`; use the scoped
  `SGS_VISUAL_GATE_SKIP`/`SGS_INSPECTOR_GATE_SKIP`/`SGS_F5_SKIP` + `*_REASON`.
- **Run builds synchronously, never backgrounded.**
- **A new `block.json` attribute needs `sgs-update-v2.py --stage 1` immediately.**
- **Commit straight to `main`; never a PR, never a stash; integrate after every task.**
- **`build-deploy.py --dry-run` is NOT dry** — it builds, packages, SCPs and installs for real.
- **`build-deploy.py` isolates by DEFAULT** (D993) and does NOT abort on dirty files it is not
  shipping. A dirty shared checkout is not a reason to hold a deploy.
- **A Playwright MCP browser profile is SHARED across sessions.** If locked, report
  COULDN'T-TEST or use `chrome-devtools-mcp` — never kill the lock-holder.
- **A commit flushes the WHOLE index, not just your pathspec.** Verify with
  `git diff --cached --name-only` first. `--amend` is worse — it once swept 89 staged files.
- **A raw detector count is an UPPER BOUND, not a workload.**
- **A gate that can never go green is a defect in the gate.**
- **An exact-name exemption set must never become a pattern.**
- **At least THREE sessions hold uncommitted work in this checkout.** Check `git diff` before
  attributing an unfamiliar change.
- **A schema default erases the difference between "absent" and "chosen".** WP substitutes it
  before render.php runs. If a pipeline relies on absence meaning something, the default must be
  the absent-shaped value (D1005).
- **Bean's eye beats the parity tool.** It scored clean on 14 real defects and flagged several
  that render correctly. Treat its output as a hypothesis, never a verdict.
- **A fidelity dimension must never score a native block's own semantic choices as defects.**
  Tag identity, and by extension any other CONVERT-not-mirror decision, is informational
  context, never a percentage (D1013).
- **A fixed-length text-anchor window degrades on long/differently-composed ancestors.** A
  "missing element" finding on a SECTION-level anchor needs a live content comparison before
  it's trusted.
- **When subagent dispatch hits a rate limit, don't retry blind — do the work inline instead.**
  Direct tool calls in the main thread aren't subject to the same per-model subagent quota.
- **A block.json description can be wrong and unchecked for months.** The product-card title
  font-family bug traced to a description written 2026-08-27 that was never verified against
  the actual draft CSS — treat a spec/description as a claim to verify, not ground truth, even
  when it's already in the codebase.
- **A pipeline-level fix (converter/DB) doesn't retroactively fix an already-cloned page** — it
  needs a matching content-sync applied to the live page's stored attributes, or the fix is
  correct-but-invisible until the next full re-clone.

## State Snapshot

- **Branch:** `main`. **Do not trust a SHA written here** — run `git rev-parse --short HEAD`.
  150+ sessions share this tree.
- **D-ceiling:** **D1015** — verify with
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
- **Canary:** sandybrown, WP 7.1. Fresh-clone verification page **3448**
  (`/fresh-clone-verification-mamas-munches-homepage-re-clone/`) — this session's fix target.
  Production homepage: page **2742**.
- **Parity — figures are STALE the moment a new commit lands on the tool itself; re-run before
  quoting.** Last full run before today's scope-correction build (page 3448, post all 14 fixes):
  STRUCTURE 93% (324/348), LAYOUT 75% (579/773), PAINT+TYPE 89% (1260/1412), CONTENT 100%
  (234/234). These numbers UNDERSTATE today's real progress — they're dominated by hundreds of
  properties unrelated to what got fixed; several specific, real defects are confirmed gone that
  don't move the aggregate much. Re-run
  `node plugins/sgs-blocks/scripts/parity/computed-parity.js --draft <mockup> --clone <url>`
  fresh, and check `sites/mamas-munches/accepted-differences.md` for any recorded exception to
  subtract by hand before reporting a number to Bean.

## Pointers

| For | Read |
|---|---|
| **The front — header/footer implementation** | `.claude/prompts/2026-09-10-header-footer-implementation.md` |
| Today's full fix detail | `decisions.md` D1015 (also D1013, D1014 for the measurement-tool repair that preceded it) |
| Header/footer spec | `specs/37-HEADER-FOOTER-BUILDER.md` |
| Header/footer stalled strategic plan | `plans/2026-07-29-merged-spec36-37-track-strategic-plan.md` |
| Per-draft accepted design differences | `sites/mamas-munches/accepted-differences.md` |
| Cloning pipeline spec + binding rules | `specs/31-UNIVERSAL-CLONING-PIPELINE.md` |
| Clone-fidelity measurement | `specs/20-CLONE-FIDELITY-MEASUREMENT.md` |
| Tier-migration plan (needs a correction pass, see above) | `plans/cloning-pipeline-tier-migration-requirements.md` |
| BEM layer-aware matching design (DONE, verified + archived — D1017) | `plans/archive/2026-09-08-parity-tool-bem-layer-aware-matching-design.md` |
| Measurement-integrity phase (DONE, archived — D1016) | `plans/archive/phase-measurement-integrity.md` |
| Styling/token contract | `specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` |
| Inspector UX standard | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| System architecture | `architecture.md` |
| Goals + exit criteria | `goals.md` |
| Structural defences (STOP catalogue + ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| Colour + border helper registries | `plugins/sgs-blocks/CLAUDE.md` |
